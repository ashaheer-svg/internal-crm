import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { productId, serialNumber, locationId, unitCost } = body

        // Validation
        if (!productId || !serialNumber || !locationId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Check for duplicate serial
        const existing = await prisma.inventoryItem.findUnique({
            where: { serialNumber }
        })

        if (existing) {
            return NextResponse.json({ error: 'Serial number already exists' }, { status: 409 })
        }

        const item = await prisma.inventoryItem.create({
            data: {
                productId,
                serialNumber,
                locationId,
                status: 'AVAILABLE',
                unitCost: unitCost ? Number(unitCost) : 0
            }
        })

        return NextResponse.json(item)
    } catch (error) {
        return NextResponse.json({ error: 'Failed to add inventory item' }, { status: 500 })
    }
}
