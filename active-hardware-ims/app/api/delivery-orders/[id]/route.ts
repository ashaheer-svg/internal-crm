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
        const { status, notes, customerId, customerName, orderNumber, items } = body

        const order = await prisma.deliveryOrder.findUnique({
            where: { id: params.id },
            include: { items: { include: { reservedItems: true } } }
        })

        if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

        // 1. Status Change (Existing Logic)
        if (status && status !== order.status) {
            if (status === 'COMPLETED' || status === 'SHIPPED') {
                await prisma.$transaction(async (tx) => {
                    await tx.deliveryOrder.update({
                        where: { id: params.id },
                        data: { status: 'COMPLETED' }
                    })
                    for (const item of order.items) {
                        for (const reserved of item.reservedItems) {
                            await tx.inventoryItem.update({
                                where: { id: reserved.id },
                                data: { status: 'SOLD' }
                            })
                            await tx.transactionLog.create({
                                data: {
                                    type: 'ISSUE',
                                    referenceType: 'DELIVERY_ORDER',
                                    referenceId: order.id,
                                    productId: item.productId,
                                    serialNumber: reserved.serialNumber,
                                    quantity: 1,
                                    performedBy: user.name,
                                    notes: `Shipped via DO ${order.orderNumber}`
                                }
                            })
                        }
                    }
                })
                return NextResponse.json({ success: true })
            }

            if (status === 'CANCELLED') {
                await prisma.$transaction(async (tx) => {
                    await tx.deliveryOrder.update({
                        where: { id: params.id },
                        data: { status: 'CANCELLED' }
                    })
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
                })
                return NextResponse.json({ success: true })
            }
        }

        // 2. Full Update (Edit Mode)
        // If items are provided, we need to sync them
        if (items && Array.isArray(items)) {
            // Transaction for atomicity
            const updatedOrder = await prisma.$transaction(async (tx) => {
                // Update Header Fields
                await tx.deliveryOrder.update({
                    where: { id: params.id },
                    data: {
                        notes,
                        customerName,
                        customerId,
                        orderNumber
                    }
                })

                // Sync Items
                // A. Identify items to delete (present in DB but not in payload)
                // Payload items might have IDs if they are existing items
                const payloadIds = items.filter((i: any) => i.id).map((i: any) => i.id)
                const itemsToDelete = order.items.filter(i => !payloadIds.includes(i.id))

                for (const item of itemsToDelete) {
                    // Release inventory first
                    if (item.reservedItems.length > 0) {
                        await tx.inventoryItem.updateMany({
                            where: { deliveryOrderItemId: item.id },
                            data: { status: 'AVAILABLE', deliveryOrderItemId: null }
                        })
                    }
                    // Delete item
                    await tx.deliveryOrderItem.delete({ where: { id: item.id } })
                }

                // B. Upsert Items (Create or Update)
                for (const item of items) {
                    if (item.id) {
                        // Update existing
                        await tx.deliveryOrderItem.update({
                            where: { id: item.id },
                            data: {
                                quantity: item.quantity,
                                unitPrice: item.unitPrice,
                                // productId should theoretically not change for same item ID
                            }
                        })
                    } else {
                        // Create new
                        await tx.deliveryOrderItem.create({
                            data: {
                                deliveryOrderId: order.id,
                                productId: item.productId,
                                productName: item.productName,
                                quantity: item.quantity,
                                unitPrice: item.unitPrice,
                                isBackorder: item.isBackorder || false
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
            data: { status, notes }
        })

        return NextResponse.json(updated)

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
