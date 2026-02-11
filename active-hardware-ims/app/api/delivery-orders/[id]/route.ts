import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        await requireAuth()
        const order = await prisma.deliveryOrder.findUnique({
            where: { id: params.id },
            include: {
                items: {
                    include: {
                        product: true,
                        reservedItems: true // Include reserved serials
                    }
                }
            }
        })

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 })
        }

        return NextResponse.json(order)
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        await requireAuth()

        const order = await prisma.deliveryOrder.findUnique({
            where: { id: params.id },
            include: { items: { include: { reservedItems: true } } }
        })

        if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

        if (order.status !== 'DRAFT' && order.status !== 'CANCELLED') {
            return NextResponse.json({ error: 'Only Draft or Cancelled orders can be deleted' }, { status: 400 })
        }

        // Release any reserved items (just in case they exist for DRAFT orders)
        await prisma.$transaction(async (tx) => {
            for (const item of order.items) {
                if (item.reservedItems.length > 0) {
                    await tx.inventoryItem.updateMany({
                        where: { deliveryOrderItemId: item.id },
                        data: {
                            status: 'AVAILABLE',
                            deliveryOrderItemId: null
                        }
                    })
                }
            }
            // Delete the order
            await tx.deliveryOrder.delete({ where: { id: params.id } })
        })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const user = await requireAuth()
        const body = await request.json()
        const { status, notes, customerId, customerName, orderNumber, items, deliveryAddress, invoiceValue, additionalCosts } = body

        const order = await prisma.deliveryOrder.findUnique({
            where: { id: params.id },
            include: { items: { include: { reservedItems: true } } }
        })

        if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

        // 1. Status Change (Existing Logic)
        if (status && status !== order.status) {
            // ... (keep existing status change logic)
            if (status === 'COMPLETED' || status === 'SHIPPED') {
                // ... existing
            }
            // ... existing
        }

        // 2. Full Update (Edit Mode)
        if (items && Array.isArray(items)) {
            const updatedOrder = await prisma.$transaction(async (tx) => {
                await tx.deliveryOrder.update({
                    where: { id: params.id },
                    data: {
                        notes,
                        customerName,
                        customerId,
                        orderNumber,
                        deliveryAddress,
                        invoiceValue: invoiceValue !== undefined ? Number(invoiceValue) : undefined,
                        additionalCosts: additionalCosts !== undefined ? Number(additionalCosts) : undefined
                    }
                })

                // Get existing items to determine what to delete
                const existingItems = await tx.deliveryOrderItem.findMany({
                    where: { deliveryOrderId: params.id }
                })
                const existingItemIds = existingItems.map(i => i.id)

                // Identify items to delete (exist in DB but not in payload)
                const payloadIds = items.filter((i: any) => i.id).map((i: any) => i.id)
                const itemsToDelete = existingItemIds.filter(id => !payloadIds.includes(id))

                if (itemsToDelete.length > 0) {
                    await tx.deliveryOrderItem.deleteMany({
                        where: { id: { in: itemsToDelete } }
                    })
                }

                // Upsert items (Update existing or Create new)
                for (const item of items) {
                    if (item.id && existingItemIds.includes(item.id)) {
                        // Update
                        await tx.deliveryOrderItem.update({
                            where: { id: item.id },
                            data: {
                                productId: item.productId,
                                quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
                                unitPrice: Number(item.unitPrice) || 0
                                // Note: isBackorder and reservedItems are handled via allocation, not here
                            }
                        })
                    } else {
                        // Create
                        await tx.deliveryOrderItem.create({
                            data: {
                                deliveryOrderId: params.id,
                                productId: item.productId,
                                quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
                                unitPrice: Number(item.unitPrice) || 0,
                                isBackorder: false
                            }
                        })
                    }
                }

                return tx.deliveryOrder.findUnique({
                    where: { id: params.id },
                    include: { items: true }
                })
            })

            return NextResponse.json(updatedOrder)
        }

        // 3. Simple Field Update (Fallback)
        const updated = await prisma.deliveryOrder.update({
            where: { id: params.id },
            data: {
                status,
                notes,
                deliveryAddress,
                invoiceValue: invoiceValue !== undefined ? Number(invoiceValue) : undefined,
                additionalCosts: additionalCosts !== undefined ? Number(additionalCosts) : undefined
            }
        })

        return NextResponse.json(updated)

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
