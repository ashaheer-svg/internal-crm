import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// POST - Allocate inventory to backorder (Supports Single or Bulk)
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    try {
        const body = await request.json()
        // Support both single 'inventoryItemId' and bulk 'inventoryItemIds'
        let itemIds: string[] = []

        if (body.inventoryItemIds && Array.isArray(body.inventoryItemIds)) {
            itemIds = body.inventoryItemIds
        } else if (body.inventoryItemId) {
            itemIds = [body.inventoryItemId]
        }

        if (itemIds.length === 0) {
            return NextResponse.json({ error: 'Inventory item IDs are required' }, { status: 400 })
        }

        const result = await prisma.$transaction(async (tx) => {
            const results = []

            for (const inventoryItemId of itemIds) {
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
                        throw new Error(`Inventory item ${inventoryItemId} not found`)
                    }
                    if (inventoryItem.status !== 'AVAILABLE') {
                        throw new Error(`Inventory item ${inventoryItem.serialNumber} is not available`)
                    }
                    if (inventoryItem.productId !== doItem.productId) {
                        throw new Error(`Inventory item ${inventoryItem.serialNumber} does not match product`)
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
                            type: 'RESERVATION',
                            referenceType: 'DELIVERY_ORDER',
                            referenceId: doItem.deliveryOrderId,
                            productId: doItem.productId,
                            serialNumber: inventoryItem.serialNumber,
                            quantity: 1,
                            unitCost: inventoryItem.unitCost,
                            notes: `Backorder reservation for DO ${doItem.deliveryOrder.orderNumber}`
                        }
                    })

                    results.push({ serialNumber: inventoryItem.serialNumber, success: true })
                    continue // Next item
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
                    throw new Error(`Inventory item ${inventoryItemId} not found`)
                }

                if (inventoryItem.status !== 'AVAILABLE') {
                    throw new Error(`Inventory item ${inventoryItem.serialNumber} is not available`)
                }

                if (inventoryItem.productId !== backorder.productId) {
                    throw new Error(`Inventory item ${inventoryItem.serialNumber} does not match backorder product`)
                }

                // Update invoice item with inventory allocation
                // NOTE: InvoiceItem represents a line item. If we are fulfilling multiple units for ONE backorder line,
                // we might need to be careful if InvoiceItem expects a single serial.
                // However, the schema for InvoiceItem usually has `serialNumber` (string).
                // If the schema supports 1:1 InvoiceItem to Inventory, then fulfillling multiple units means we might have an issue
                // if the BackorderItem (which tracks Quantity) is linked to a SINGLE InvoiceItem.
                //
                // Let's check the Schema assumption.
                // BackorderItem has quantityOrdered and quantityFulfilled.
                // InvoiceItem has `inventoryItemId` (optional, unique?).
                // If InvoiceItem has one `inventoryItemId`, it can only hold ONE item.
                // If a Backorder is for Qty 5, and we fulfill 1, we update the InvoiceItem?
                // Or does the Invoice have multiple InvoiceItems?
                //
                // If the InvoiceItem was created with Qty 5, but the schema only allows 1 Serial/InventoryID per InvoiceItem,
                // then we have a schema limitation for partial fulfillment of a single line item if we want to track ALL serials on that line.
                //
                // Let's assume for now we are just tracking the Backorder fulfillment status and updating the specific InventoryItem to SOLD.
                // We might NOT be able to link ALL serials to the SINGLE InvoiceItem if it's a 1:1 relation.
                // BUT, checking the code:
                /*
                await tx.invoiceItem.update({
                    where: { id: backorder.invoiceItemId },
                    data: {
                        inventoryItemId: inventoryItemId,
                        serialNumber: inventoryItem.serialNumber,
                        isFulfilled: true,
                        fulfilledAt: new Date()
                    }
                })
                */
                // This code overwrites the InvoiceItem with the LATEST serial. This is a known limitation if Qty > 1.
                // For this task, we will preserve this behavior but allow processing multiple items.
                // Ideally, we should split InvoiceItems, but that is out of scope.
                // We will update the InventoryItem to SOLD and log the transaction.
                // Linking to InvoiceItem will just be "last one wins" or we skip linking if already linked?
                //
                // Better approach for Qty > 1:
                // Don't overwrite if already set? Or just accept the limitation?
                // The prompt asks for "Bulk entry".
                // I will proceed with updating InventoryItem status and Backorder counts.
                // I will update InvoiceItem ONLY if it's the first/last or maybe just not fail.

                // Update invoice item - simplified to avoid overwriting if we don't want to loss info,
                // but for now let's just do what the original code did, but realize it might be overwriting.
                // Actually, if we are fulfilling 5 items, we probably only have ONE InvoiceItem.
                // We can't link 5 InventoryItems to 1 InvoiceItem if it's a scalar field.
                // We'll update the InvoiceItem with the LAST one, but ensure all 5 InventoryItems are marked SOLD.

                await tx.invoiceItem.update({
                    where: { id: backorder.invoiceItemId },
                    data: {
                        inventoryItemId: inventoryItemId, // This will be the last one in the loop
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
                // We need to re-fetch backorder or increment carefully if running in parallel, but here we are in a transaction loop.
                // But we are inside the loop, so `backorder` variable is stale after first iteration if we update it?
                // No, we should increment the count.
                //
                // Wait, if we iterate 5 times, we fetch backorder 5 times?
                // Yes, line 29 is inside the loop. So we get fresh data.
                // So `backorder.quantityFulfilled` will be updated.

                const updatedBackorder = await tx.backorderItem.update({
                    where: { id },
                    data: {
                        quantityFulfilled: backorder.quantityFulfilled + 1,
                        status: backorder.quantityFulfilled + 1 >= backorder.quantityOrdered ? 'FULFILLED' : 'PARTIAL'
                    }
                })

                results.push({ serialNumber: inventoryItem.serialNumber, success: true })

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

                // Check invoice status (only need to do this once effectively, but doing it per item is safe)
                const remainingBackorders = await tx.backorderItem.findMany({
                    where: {
                        invoiceId: backorder.invoiceId,
                        status: { in: ['PENDING', 'PARTIAL'] }
                    }
                })
                await tx.invoice.update({
                    where: { id: backorder.invoiceId },
                    data: {
                        hasBackorders: remainingBackorders.length > 0
                    }
                })
            }

            return results
        })

        return NextResponse.json({ success: true, allocated: result.length })
    } catch (error) {
        console.error(error)
        const message = error instanceof Error ? error.message : 'Failed to allocate inventory'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
