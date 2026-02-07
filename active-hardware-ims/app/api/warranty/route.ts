import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status')

        const where = status ? { status } : {}

        const claims = await prisma.warrantyClaim.findMany({
            where,
            include: {
                inventoryItem: {
                    include: {
                        product: true,
                        location: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json(claims)
    } catch (error) {
        console.error('Failed to fetch warranty claims:', error)
        return NextResponse.json({ error: 'Failed to fetch warranty claims' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { inventoryItemId, customerName, description } = body

        // Validate required fields
        if (!inventoryItemId || !customerName || !description) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Check if inventory item exists
        const inventoryItem = await prisma.inventoryItem.findUnique({
            where: { id: inventoryItemId }
        })

        if (!inventoryItem) {
            return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 })
        }

        // Create warranty claim
        const claim = await prisma.warrantyClaim.create({
            data: {
                inventoryItemId,
                customerName,
                description,
                status: 'PENDING'
            },
            include: {
                inventoryItem: {
                    include: {
                        product: true,
                        location: true
                    }
                }
            }
        })

        // Optionally update inventory item status to RMA
        await prisma.inventoryItem.update({
            where: { id: inventoryItemId },
            data: { status: 'RMA' }
        })

        return NextResponse.json(claim)
    } catch (error) {
        console.error('Failed to create warranty claim:', error)
        return NextResponse.json({ error: 'Failed to create warranty claim' }, { status: 500 })
    }
}
