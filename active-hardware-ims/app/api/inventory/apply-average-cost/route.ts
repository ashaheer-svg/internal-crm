import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function POST(request: Request) {
    try {
        const user = await requireAuth()
        const body = await request.json()
        const { productId, locationId } = body

        if (!productId || !locationId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const excludedStatuses = ['SOLD', 'WARRANTY_REPLACED', 'RMA']

        const items = await prisma.inventoryItem.findMany({
            where: { productId, locationId, status: { notIn: excludedStatuses } },
            include: { product: { select: { name: true, sku: true } }, location: { select: { name: true } } }
        })

        if (items.length === 0) {
            return NextResponse.json({ error: 'No active items found for calculation' }, { status: 404 })
        }

        const totalCost = items.reduce((sum, item) => sum + (item.unitCost || 0), 0)
        const averageCost = totalCost / items.length

        const prevCosts = items.map(i => i.unitCost ?? 0)
        const minPrev = Math.min(...prevCosts)
        const maxPrev = Math.max(...prevCosts)

        await prisma.inventoryItem.updateMany({
            where: { productId, locationId, status: { notIn: excludedStatuses } },
            data: { unitCost: averageCost }
        })

        // Log a single summary entry for the cost recalculation
        await prisma.transactionLog.create({
            data: {
                type: 'COST_ADJUSTMENT',
                referenceType: 'PRODUCT',
                referenceId: productId,
                productId,
                quantity: items.length,
                toLocation: items[0]?.location?.name ?? locationId,
                unitCost: averageCost,
                performedBy: user.name,
                notes: `Average cost recalculated for ${items[0]?.product?.name ?? productId} at ${items[0]?.location?.name ?? locationId}. ${items.length} items updated. Previous range: Rs.${minPrev.toLocaleString()} – Rs.${maxPrev.toLocaleString()}. New average: Rs.${averageCost.toFixed(2)}`
            }
        })

        return NextResponse.json({ success: true, averageCost, itemsUpdated: items.length })
    } catch (error) {
        console.error('Apply average cost error:', error)
        return NextResponse.json({ error: 'Failed to apply average cost' }, { status: 500 })
    }
}
