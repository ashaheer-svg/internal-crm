import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { productId, locationId } = body

        if (!productId || !locationId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Get all inventory items for this product at this location
        const items = await prisma.inventoryItem.findMany({
            where: {
                productId,
                locationId
            }
        })

        if (items.length === 0) {
            return NextResponse.json({ error: 'No items found' }, { status: 404 })
        }

        // Calculate average cost
        const totalCost = items.reduce((sum, item) => sum + (item.unitCost || 0), 0)
        const averageCost = totalCost / items.length

        // Update all items with the average cost
        await prisma.inventoryItem.updateMany({
            where: {
                productId,
                locationId
            },
            data: {
                unitCost: averageCost
            }
        })

        return NextResponse.json({
            success: true,
            averageCost,
            itemsUpdated: items.length
        })
    } catch (error) {
        console.error('Apply average cost error:', error)
        return NextResponse.json({ error: 'Failed to apply average cost' }, { status: 500 })
    }
}
