import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET - Fetch single invoice
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    try {
        const invoice = await prisma.invoice.findUnique({
            where: { id },
            include: {
                items: {
                    include: {
                        product: true,
                        backorderItem: true
                    }
                },
                backorderItems: {
                    include: {
                        product: true,
                        invoiceItem: true
                    }
                },
                salesRep: true
            }
        })

        if (!invoice) {
            return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
        }

        return NextResponse.json(invoice)
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: 'Failed to fetch invoice' }, { status: 500 })
    }
}

// PATCH - Edit invoice
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    try {
        const body = await request.json()
        const { customerName, customerEmail, customerPhone, customerInvoiceRef, notes, itemsToAdd, itemsToRemove, salesRepId } = body

        const result = await prisma.$transaction(async (tx) => {
            // Update invoice basic info
            const updateData: any = {}
            if (customerName !== undefined) updateData.customerName = customerName
            if (customerEmail !== undefined) updateData.customerEmail = customerEmail
            if (customerPhone !== undefined) updateData.customerPhone = customerPhone
            if (customerInvoiceRef !== undefined) updateData.customerInvoiceRef = customerInvoiceRef
            if (notes !== undefined) updateData.notes = notes
            if (salesRepId !== undefined) updateData.salesRepId = salesRepId

            // Remove items if specified
            if (itemsToRemove && itemsToRemove.length > 0) {
                for (const itemId of itemsToRemove) {
                    const item = await tx.invoiceItem.findUnique({
                        where: { id: itemId },
                        include: { backorderItem: true }
                    })

                    if (item && !item.isFulfilled) {
                        // Can only remove unfulfilled items
                        // Delete backorder first if exists
                        if (item.backorderItem) {
                            await tx.backorderItem.delete({
                                where: { id: item.backorderItem.id }
                            })
                        }
                        await tx.invoiceItem.delete({
                            where: { id: itemId }
                        })
                    }
                }
            }

            // Add new items if specified
            if (itemsToAdd && itemsToAdd.length > 0) {
                for (const item of itemsToAdd) {
                    const newItem = await tx.invoiceItem.create({
                        data: {
                            invoiceId: id,
                            inventoryItemId: item.inventoryItemId || null,
                            productId: item.productId,
                            productName: item.productName,
                            serialNumber: item.serialNumber || null,
                            unitPrice: item.unitPrice,
                            quantity: item.quantity || 1,
                            isFulfilled: !!item.inventoryItemId,
                            fulfilledAt: item.inventoryItemId ? new Date() : null
                        }
                    })

                    if (item.inventoryItemId) {
                        // Update inventory to SOLD
                        await tx.inventoryItem.update({
                            where: { id: item.inventoryItemId },
                            data: { status: 'SOLD' }
                        })
                    } else {
                        // Create backorder
                        await tx.backorderItem.create({
                            data: {
                                invoiceId: id,
                                invoiceItemId: newItem.id,
                                productId: item.productId,
                                quantityOrdered: item.quantity || 1,
                                quantityFulfilled: 0,
                                status: 'PENDING'
                            }
                        })
                    }
                }
            }

            // Recalculate total and check backorders
            const updatedInvoice = await tx.invoice.findUnique({
                where: { id },
                include: { items: true, backorderItems: true }
            })

            if (updatedInvoice) {
                const newTotal = updatedInvoice.items.reduce(
                    (sum, item) => sum + (item.unitPrice * item.quantity), 0
                )
                const hasBackorders = updatedInvoice.backorderItems.some(
                    (b) => b.status === 'PENDING' || b.status === 'PARTIAL'
                )

                updateData.totalAmount = newTotal
                updateData.hasBackorders = hasBackorders
            }

            // Apply updates
            const invoice = await tx.invoice.update({
                where: { id },
                data: updateData,
                include: {
                    items: {
                        include: {
                            product: true,
                            backorderItem: true
                        }
                    },
                    salesRep: true
                }
            })

            return invoice
        })

        return NextResponse.json(result)
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 })
    }
}
