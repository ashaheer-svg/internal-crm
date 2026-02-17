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
        // EXCLUDING sold, warranty replaced, and RMA items from calculation
        const excludedStatuses = ['SOLD', 'WARRANTY_REPLACED', 'RMA']

        const items = await prisma.inventoryItem.findMany({
            where: {
                productId,
                locationId,
                status: {
                    notIn: excludedStatuses
                }
            }
        })

        if (items.length === 0) {
            return NextResponse.json({ error: 'No active items found for calculation' }, { status: 404 })
        }

        // Calculate average cost
        const totalCost = items.reduce((sum, item) => sum + (item.unitCost || 0), 0)
        const averageCost = totalCost / items.length

        // Update all items with the average cost
        // ONLY update the active items (excluding sold/warranty/RMA)
        await prisma.inventoryItem.updateMany({
            where: {
                productId,
                locationId,
                status: {
                    notIn: excludedStatuses
                }
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
