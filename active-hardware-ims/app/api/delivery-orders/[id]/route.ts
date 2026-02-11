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

                // ... (rest of items update)
                // Need to match context carefully 
                const payloadIds = items.filter((i: any) => i.id).map((i: any) => i.id)
                // ...
            })
            // ...
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
