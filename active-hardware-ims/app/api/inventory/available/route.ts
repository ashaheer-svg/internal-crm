import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
    try {
        // Get available inventory items with product details
        const items = await prisma.inventoryItem.findMany({
            where: {
                status: 'AVAILABLE'
            },
            include: {
                product: true,
                location: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        })
        return NextResponse.json(items)
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch available inventory' }, { status: 500 })
    }
}
