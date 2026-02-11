import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { inventoryItemId, targetLocationId } = body

        if (!inventoryItemId || !targetLocationId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Verify item and location exist
        const item = await prisma.inventoryItem.findUnique({ where: { id: inventoryItemId } })
        if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 })

        // Block transfer for SOLD items
        if (item.status === 'SOLD') {
            return NextResponse.json({ error: 'Cannot transfer SOLD items' }, { status: 400 })
        }

        const location = await prisma.location.findUnique({ where: { id: targetLocationId } })
        if (!location) return NextResponse.json({ error: 'Location not found' }, { status: 404 })

        // Perform transfer
        // In a real app, we would log this in a 'MovementHistory' table
        const updated = await prisma.inventoryItem.update({
            where: { id: inventoryItemId },
            data: {
                locationId: targetLocationId
            }
        })

        return NextResponse.json(updated)
    } catch (error) {
        return NextResponse.json({ error: 'Failed to transfer item' }, { status: 500 })
    }
}
