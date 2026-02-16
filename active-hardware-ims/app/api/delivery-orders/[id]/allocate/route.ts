import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        await requireAuth()
        const body = await request.json()
        const { itemId, inventoryItemIds } = body // itemId is DeliveryOrderItem ID

        if (!itemId || !Array.isArray(inventoryItemIds)) {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
        }

        // Fetch current item and its reservations
        const orderItem = await prisma.deliveryOrderItem.findUnique({
            where: { id: itemId },
            include: { reservedItems: true }
        })

        if (!orderItem) {
            return NextResponse.json({ error: 'Order Item not found' }, { status: 404 })
        }

        const currentIds = orderItem.reservedItems.map(i => i.id)
        const newIds = inventoryItemIds

        const idsToRemove = currentIds.filter(id => !newIds.includes(id))
        const idsToAdd = newIds.filter(id => !currentIds.includes(id))

        // Validate items to add are AVAILABLE
        if (idsToAdd.length > 0) {
            const availableItems = await prisma.inventoryItem.findMany({
                where: {
                    id: { in: idsToAdd },
                    status: 'AVAILABLE'
                }
            })

            if (availableItems.length !== idsToAdd.length) {
                // Find which ones failed
                const foundIds = availableItems.map(i => i.id)
                const invalidIds = idsToAdd.filter(id => !foundIds.includes(id))
                return NextResponse.json({ error: `Some items are not available: ${invalidIds.join(', ')}` }, { status: 400 })
            }
        }

        // Apply changes
        await prisma.$transaction(async (tx) => {
            // Release removed items
            if (idsToRemove.length > 0) {
                await tx.inventoryItem.updateMany({
                    where: { id: { in: idsToRemove } },
                    data: {
                        status: 'AVAILABLE',
                        deliveryOrderItemId: null
                    }
                })
            }

            // Reserve new items
            if (idsToAdd.length > 0) {
                await tx.inventoryItem.updateMany({
                    where: { id: { in: idsToAdd } },
                    data: {
                        status: 'RESERVED',
                        deliveryOrderItemId: itemId
                    }
                })
            }

            // Update quantityFulfilled on the order item
            // We need to count total reserved items after this operation
            const totalReserved = (currentIds.length - idsToRemove.length) + idsToAdd.length

            await tx.deliveryOrderItem.update({
                where: { id: itemId },
                data: {
                    quantityFulfilled: totalReserved
                } as any
            })
        })

        return NextResponse.json({ success: true })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
