import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const user = await requireAuth()
        const { inventoryItemId, notes } = await request.json()

        if (!inventoryItemId) {
            return NextResponse.json({ error: 'Inventory Item ID is required' }, { status: 400 })
        }

        // 1. Fetch the order and the specific item
        const order = await prisma.deliveryOrder.findUnique({
            where: { id: params.id },
            include: {
                items: true,
                quotes: true
            }
        })

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 })
        }

        if (order.status !== 'COMPLETED') {
            return NextResponse.json({ error: 'Returns are only allowed for COMPLETED orders' }, { status: 400 })
        }

        // 2. Fetch the inventory item and ensure it's linked to this DO
        const item = await prisma.inventoryItem.findUnique({
            where: { id: inventoryItemId },
            include: { deliveryOrderItem: true }
        })

        if (!item || !item.deliveryOrderItem || item.deliveryOrderItem.deliveryOrderId !== params.id) {
            return NextResponse.json({ error: 'Item not found or not part of this order' }, { status: 404 })
        }

        if (item.status !== 'SOLD') {
            return NextResponse.json({ error: 'Only SOLD items can be returned' }, { status: 400 })
        }

        // 3. Process the return in a transaction
        await prisma.$transaction(async (tx) => {
            // A. Restore to stock
            await tx.inventoryItem.update({
                where: { id: inventoryItemId },
                data: {
                    status: 'AVAILABLE',
                    deliveryOrderItemId: null
                }
            })

            // B. Decrement quantityFulfilled on the DO Item
            await tx.deliveryOrderItem.update({
                where: { id: item.deliveryOrderItemId! },
                data: {
                    quantityFulfilled: { decrement: 1 }
                }
            })

            // C. Log the transaction
            await tx.transactionLog.create({
                data: {
                    type: 'RECEIPT', // Stock coming back in
                    referenceType: 'DELIVERY_ORDER_RETURN',
                    referenceId: order.id,
                    productId: item.productId,
                    serialNumber: item.serialNumber,
                    quantity: 1,
                    unitCost: item.deliveryOrderItem?.unitPrice || 0,
                    notes: `Returned from Delivery Order ${order.orderNumber}. Reason: ${notes || 'Not specified'}`
                }
            })

            // D. Audit Log
            const { logCreate } = await import('@/lib/audit')
            await logCreate('DELIVERY_ORDER_RETURN', order.id, user.id, user.name, {
                serialNumber: item.serialNumber,
                orderNumber: order.orderNumber,
                reason: notes
            })
        })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error("Sales return failed:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
