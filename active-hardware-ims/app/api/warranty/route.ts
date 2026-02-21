import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePermission } from '@/lib/auth'
import { logCreate, logUpdate } from '@/lib/audit'

export async function GET(request: Request) {
    try {
        await requirePermission('services:read')
        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status')

        const where = status ? { status } : {}

        const claims = await (prisma.warrantyClaim as any).findMany({
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
    } catch (error: any) {
        console.error('Failed to fetch warranty claims:', error)
        return NextResponse.json({ error: error.message || 'Failed to fetch warranty claims' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const user = await requirePermission('services:create')
        const body = await request.json()
        const { inventoryItemId, customerName, description } = body

        // Validate required fields
        if (!inventoryItemId || !customerName || !description) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Check if inventory item exists and get current status
        const inventoryItem = await prisma.inventoryItem.findUnique({
            where: { id: inventoryItemId },
            include: { product: true }
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

        // Log warranty claim creation
        await logCreate('WARRANTY', claim.id, user.id, user.name, {
            claimId: claim.id,
            serialNumber: inventoryItem.serialNumber,
            productName: inventoryItem.product.name,
            customerName,
            description,
            status: 'PENDING'
        })

        // Update inventory item status to RMA and log the change
        const previousStatus = inventoryItem.status
        await prisma.inventoryItem.update({
            where: { id: inventoryItemId },
            data: { status: 'RMA' }
        })

        // Log inventory status change
        await logUpdate('INVENTORY', inventoryItemId, user.id, user.name,
            { status: previousStatus, serialNumber: inventoryItem.serialNumber },
            { status: 'RMA', reason: 'Warranty claim created' }
        )

        return NextResponse.json(claim)
    } catch (error) {
        console.error('Failed to create warranty claim:', error)
        return NextResponse.json({ error: 'Failed to create warranty claim' }, { status: 500 })
    }
}
