import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function POST(
    request: Request,
    context: { params: Promise<{ id: string, itemId: string }> }
) {
    try {
        const user = await requireAuth()
        const { id, itemId } = await context.params
        const body = await request.json()
        const { startDate, endDate } = body

        if (!startDate || !endDate) {
            return NextResponse.json({ error: 'Start date and End date are required' }, { status: 400 })
        }

        const start = new Date(startDate)
        const end = new Date(endDate)

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
        }

        if (start > end) {
            return NextResponse.json({ error: 'Start date cannot be after end date' }, { status: 400 })
        }

        const { unitCost, licenseKey } = body // Optional for now, but good to handle

        // Verify the item belongs to the order and is a service
        const item = await prisma.deliveryOrderItem.findFirst({
            where: {
                id: itemId,
                deliveryOrderId: id
            },
            include: {
                product: {
                    include: {
                        serviceDefinition: true
                    }
                },
                deliveryOrder: true
            }
        })

        if (!item) {
            return NextResponse.json({ error: 'Item not found' }, { status: 404 })
        }

        if (!item.product.serviceDefinition) {
            return NextResponse.json({ error: 'This item is not a service' }, { status: 400 })
        }

        if (item.deliveryOrder.status === 'COMPLETED' || item.deliveryOrder.status === 'CANCELLED') {
            return NextResponse.json({ error: 'Cannot fulfill items in a completed or cancelled order' }, { status: 400 })
        }

        // Update the item with fulfillment dates and cost
        // Note: Using as any because unitCost and service dates might be new in schema
        const updatedItem = await (prisma.deliveryOrderItem as any).update({
            where: { id: itemId },
            data: {
                serviceStartDate: start,
                serviceEndDate: end,
                unitCost: unitCost !== undefined ? Number(unitCost) : undefined,
                licenseKey: licenseKey || undefined,
                quantityFulfilled: item.quantity // Mark as fully fulfilled for services
            }
        })

        // Audit Log
        const { logUpdate } = await import('@/lib/audit')
        await logUpdate('DELIVERY_ORDER_ITEM', itemId, user.id, user.name,
            { serviceStartDate: startDate, serviceEndDate: endDate, unitCost, licenseKey },
            { orderNumber: item.deliveryOrder.orderNumber, sku: item.product.sku }
        )

        return NextResponse.json(updatedItem)

    } catch (error: any) {
        console.error('Error in fulfill-service:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to fulfill service' },
            { status: 500 }
        )
    }
}
