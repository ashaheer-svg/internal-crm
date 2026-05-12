import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { logCreate } from '@/lib/audit'

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const user = await requireAuth()
        const body = await request.json()
        const { itemId, inventoryItemIds, startDate, endDate } = body // itemId is DeliveryOrderItem ID

        if (!itemId || !Array.isArray(inventoryItemIds)) {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
        }

        // Fetch current item and its reservations, also fetch the parent DO status
        const orderItem = await prisma.deliveryOrderItem.findUnique({
            where: { id: itemId },
            include: {
                reservedItems: true,
                deliveryOrder: { select: { id: true, status: true, orderNumber: true } },
                product: { select: { name: true, sku: true } }
            }
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
                const foundIds = availableItems.map(i => i.id)
                const invalidIds = idsToAdd.filter(id => !foundIds.includes(id))
                return NextResponse.json({ error: `Some items are not available: ${invalidIds.join(', ')}` }, { status: 400 })
            }
        }

        // Capture serial numbers for audit log before making changes
        let addedSerials: string[] = []
        let removedSerials: string[] = []

        if (idsToAdd.length > 0) {
            const items = await prisma.inventoryItem.findMany({
                where: { id: { in: idsToAdd } }, select: { serialNumber: true }
            })
            addedSerials = items.map(i => i.serialNumber)
        }
        if (idsToRemove.length > 0) {
            removedSerials = orderItem.reservedItems
                .filter(i => idsToRemove.includes(i.id))
                .map(i => i.serialNumber)
        }

        let resetToBuilding = false

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
            const totalReserved = (currentIds.length - idsToRemove.length) + idsToAdd.length

            await tx.deliveryOrderItem.update({
                where: { id: itemId },
                data: {
                    quantityFulfilled: totalReserved,
                    serviceStartDate: startDate ? new Date(startDate) : undefined,
                    serviceEndDate: endDate ? new Date(endDate) : undefined,
                } as any
            })

            // If new items were added and the DO was BUILT, reset to BUILDING
            // so it re-enters the TECHNICAL queue for re-verification
            if (idsToAdd.length > 0 && orderItem.deliveryOrder?.status === 'BUILT') {
                await tx.deliveryOrder.update({
                    where: { id: params.id },
                    data: { status: 'BUILDING' }
                })
                resetToBuilding = true
            }
        })

        // F7: Audit Log — who allocated which SNs to which DO
        await logCreate('DELIVERY_ORDER_ALLOCATE', params.id, user.id, user.name, {
            orderNumber: orderItem.deliveryOrder?.orderNumber,
            product: (orderItem as any).product?.name || (orderItem as any).product?.sku,
            serialsAdded: addedSerials,
            serialsRemoved: removedSerials,
            resetToBuilding,
        })

        return NextResponse.json({ success: true })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
