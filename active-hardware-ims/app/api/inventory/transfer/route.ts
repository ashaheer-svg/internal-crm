import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function POST(request: Request) {
    try {
        const user = await requireAuth()
        const body = await request.json()
        const { inventoryItemId, targetLocationId } = body

        if (!inventoryItemId || !targetLocationId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Verify item and location exist
        const item = await prisma.inventoryItem.findUnique({
            where: { id: inventoryItemId },
            include: { product: { select: { name: true, sku: true } }, location: { select: { name: true } } }
        })
        if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 })

        // Block transfer for SOLD items
        if (item.status === 'SOLD') {
            return NextResponse.json({ error: 'Cannot transfer SOLD items' }, { status: 400 })
        }

        const targetLocation = await prisma.location.findUnique({ where: { id: targetLocationId } })
        if (!targetLocation) return NextResponse.json({ error: 'Location not found' }, { status: 404 })

        const fromLocationName = item.location?.name ?? item.locationId ?? 'Unknown'

        // Perform transfer + log atomically
        const [updated] = await prisma.$transaction([
            prisma.inventoryItem.update({
                where: { id: inventoryItemId },
                data: { locationId: targetLocationId }
            }),
            prisma.transactionLog.create({
                data: {
                    type: 'TRANSFER',
                    referenceType: 'INVENTORY_ITEM',
                    referenceId: inventoryItemId,
                    productId: item.productId,
                    serialNumber: item.serialNumber,
                    quantity: 1,
                    fromLocation: fromLocationName,
                    toLocation: targetLocation.name,
                    unitCost: item.unitCost,
                    performedBy: user.name,
                    notes: `${item.product?.name ?? item.productId} (${item.serialNumber ?? 'N/A'}) transferred from ${fromLocationName} to ${targetLocation.name}`
                }
            })
        ])

        return NextResponse.json(updated)
    } catch (error) {
        return NextResponse.json({ error: 'Failed to transfer item' }, { status: 500 })
    }
}
