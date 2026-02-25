import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const user = await requireAuth()
        const body = await request.json()
        const { buildNotes } = body

        const order = await prisma.deliveryOrder.findUnique({
            where: { id: params.id },
            include: {
                items: { include: { reservedItems: true } },
                quotes: true
            }
        })

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 })
        }

        // Verify it's in a state that can be built
        if (order.status !== 'READY_FOR_BUILD' && order.status !== 'BUILDING') {
            return NextResponse.json({ error: 'Order is not in a buildable state' }, { status: 400 })
        }

        // Complete the build
        await prisma.deliveryOrder.update({
            where: { id: params.id },
            data: {
                status: 'BUILT',
                builtById: user.id,
                buildNotes: buildNotes || null,
                builtAt: new Date()
            }
        })

        // Sync with CRM Quotes if linked
        if (order.quotes && order.quotes.length > 0) {
            for (const quote of order.quotes) {
                await prisma.cRMQuote.update({
                    where: { id: quote.id },
                    data: { status: 'BUILT' }
                })
            }
        }

        // Audit Log
        const { logCreate } = await import('@/lib/audit')
        await logCreate('DELIVERY_ORDER_BUILD', order.id, user.id, user.name, {
            orderNumber: order.orderNumber,
            notes: buildNotes
        })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error("Build completion failed:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// DELETE to "Reject" or "Reverse" allocation during build
export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const user = await requireAuth()
        const { searchParams } = new URL(request.url)
        const inventoryItemId = searchParams.get('inventoryItemId')

        if (!inventoryItemId) {
            return NextResponse.json({ error: 'Inventory Item ID is required' }, { status: 400 })
        }

        // Fetch the inventory item to ensure it's linked to this DO via a DeliveryOrderItem
        const item = await prisma.inventoryItem.findUnique({
            where: { id: inventoryItemId },
            include: { deliveryOrderItem: true }
        })

        if (!item || !item.deliveryOrderItem || item.deliveryOrderItem.deliveryOrderId !== params.id) {
            return NextResponse.json({ error: 'Item not found or not part of this order' }, { status: 404 })
        }

        // Release the item
        await prisma.$transaction(async (tx) => {
            await tx.inventoryItem.update({
                where: { id: inventoryItemId },
                data: {
                    status: 'AVAILABLE',
                    deliveryOrderItemId: null
                }
            })

            // Decrement quantityFulfilled on the DeliveryOrderItem
            await tx.deliveryOrderItem.update({
                where: { id: item.deliveryOrderItemId! },
                data: {
                    quantityFulfilled: { decrement: 1 }
                }
            })
        })

        // Audit Log
        const { logCreate } = await import('@/lib/audit')
        await logCreate('DELIVERY_ORDER_BUILD_REJECT', params.id, user.id, user.name, {
            serialNumber: item.serialNumber,
            inventoryItemId
        })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error("Build item rejection failed:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
