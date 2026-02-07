import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { logCreate } from '@/lib/audit'

export async function POST(request: Request) {
    try {
        const user = await requireAuth()
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

        // Fetch product to get warranty period
        const product = await prisma.product.findUnique({
            where: { id: productId },
            select: { warrantyMonths: true }
        })

        // Calculate warranty expiry date
        let warrantyExpiry: Date | null = null
        if (product && product.warrantyMonths > 0) {
            warrantyExpiry = new Date()
            warrantyExpiry.setMonth(warrantyExpiry.getMonth() + product.warrantyMonths)
        }

        const item = await prisma.inventoryItem.create({
            data: {
                productId,
                serialNumber,
                locationId,
                status: 'AVAILABLE',
                unitCost: unitCost ? Number(unitCost) : 0,
                warrantyExpiry: warrantyExpiry
            }
        })

        // Log inventory creation
        await logCreate('INVENTORY', item.id, user.id, user.name, {
            serialNumber: item.serialNumber,
            productId: item.productId,
            status: item.status
        })

        return NextResponse.json(item)
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to add inventory item' },
            { status: error.message === 'Unauthorized' ? 401 : 500 }
        )
    }
}
