import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// POST - Allocate inventory to backorder
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    try {
        const body = await request.json()
        const { inventoryItemId } = body

        if (!inventoryItemId) {
            return NextResponse.json({ error: 'Inventory item ID is required' }, { status: 400 })
        }

        const result = await prisma.$transaction(async (tx) => {
            // Get backorder
            const backorder = await tx.backorderItem.findUnique({
                where: { id },
                include: {
                    invoiceItem: true,
                    product: true,
                    invoice: true
                }
            })

            // IF BACKORDER ITEM NOT FOUND, TRY DELIVERY ORDER ITEM (Draft Backorder)
            if (!backorder) {
                const doItem = await tx.deliveryOrderItem.findUnique({
                    where: { id },
                    include: { deliveryOrder: true, reservedItems: true }
                })

                if (!doItem) {
                    throw new Error('Backorder item not found')
                }

                // Verify stock availability
                const inventoryItem = await tx.inventoryItem.findUnique({
                    where: { id: inventoryItemId }
                })

                if (!inventoryItem) {
                    throw new Error('Inventory item not found')
                }
                if (inventoryItem.status !== 'AVAILABLE') {
                    throw new Error('Inventory item is not available')
                }
                if (inventoryItem.productId !== doItem.productId) {
                    throw new Error('Inventory item does not match product')
                }

                // Allocate Logic for DO Item: RESERVE it
                await tx.inventoryItem.update({
                    where: { id: inventoryItemId },
                    data: {
                        status: 'RESERVED',
                        deliveryOrderItemId: doItem.id
                    }
                })

                // Create a log for reservation
                await tx.transactionLog.create({
                    data: {
                        type: 'RESERVATION', // Using RESERVATION or similar
                        referenceType: 'DELIVERY_ORDER',
                        referenceId: doItem.deliveryOrderId,
                        productId: doItem.productId,
                        serialNumber: inventoryItem.serialNumber,
                        quantity: 1,
                        unitCost: inventoryItem.unitCost,
                        notes: `Backorder reservation for DO ${doItem.deliveryOrder.orderNumber}`
                    }
                })

                return { success: true }
            }

            // --- EXISTING LOGIC FOR INVOICE BACKORDER ITEM ---

            if (backorder.status === 'FULFILLED') {
                throw new Error('Backorder already fulfilled')
            }

            // Verify inventory item is available and matches product
            const inventoryItem = await tx.inventoryItem.findUnique({
                where: { id: inventoryItemId }
            })

            if (!inventoryItem) {
                throw new Error('Inventory item not found')
            }

            if (inventoryItem.status !== 'AVAILABLE') {
                throw new Error('Inventory item is not available')
            }

            if (inventoryItem.productId !== backorder.productId) {
                throw new Error('Inventory item does not match backorder product')
            }

            // Update invoice item with inventory allocation
            await tx.invoiceItem.update({
                where: { id: backorder.invoiceItemId },
                data: {
                    inventoryItemId: inventoryItemId,
                    serialNumber: inventoryItem.serialNumber,
                    isFulfilled: true,
                    fulfilledAt: new Date()
                }
            })

            // Update inventory item to SOLD
            await tx.inventoryItem.update({
                where: { id: inventoryItemId },
                data: { status: 'SOLD' }
            })

            // Update backorder status
            const updatedBackorder = await tx.backorderItem.update({
                where: { id },
                data: {
                    quantityFulfilled: backorder.quantityFulfilled + 1,
                    status: backorder.quantityFulfilled + 1 >= backorder.quantityOrdered ? 'FULFILLED' : 'PARTIAL'
                }
            })

            // Check if invoice still has pending backorders
            const remainingBackorders = await tx.backorderItem.findMany({
                where: {
                    invoiceId: backorder.invoiceId,
                    status: { in: ['PENDING', 'PARTIAL'] }
                }
            })

            // Update invoice hasBackorders flag
            await tx.invoice.update({
                where: { id: backorder.invoiceId },
                data: {
                    hasBackorders: remainingBackorders.length > 0
                }
            })

            // Create transaction log
            await tx.transactionLog.create({
                data: {
                    type: 'ISSUE',
                    referenceType: 'INVOICE',
                    referenceId: backorder.invoiceId,
                    productId: backorder.productId,
                    serialNumber: inventoryItem.serialNumber,
                    quantity: 1,
                    unitCost: backorder.invoiceItem.unitPrice,
                    notes: `Backorder fulfilled for ${backorder.invoice.customerName} - Invoice ${backorder.invoice.invoiceNumber}`
                }
            })

            return updatedBackorder
        })

        return NextResponse.json(result)
    } catch (error) {
        console.error(error)
        const message = error instanceof Error ? error.message : 'Failed to allocate inventory'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
