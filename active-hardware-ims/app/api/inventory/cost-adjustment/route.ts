import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { logUpdate } from '@/lib/audit'

export async function GET(request: Request) {
    try {
        await requireAuth()
        const { searchParams } = new URL(request.url)
        const grnId = searchParams.get('grnId')
        const productId = searchParams.get('productId')

        const serialsParam = searchParams.get('serials')

        if (!grnId && !serialsParam) {
            return NextResponse.json({ error: 'GRN ID or Serial Numbers are required' }, { status: 400 })
        }

        let serials: string[] = []

        if (serialsParam) {
            // Case 1: Search by provided serials
            serials = serialsParam.split(',').map(s => s.trim()).filter(s => s.length > 0)
        } else if (grnId) {
            // Case 2: Search by GRN
            // 1. Find GRN Items
            const grnItems = await prisma.gRNItem.findMany({
                where: {
                    grnId,
                    ...(productId ? { productId } : {})
                }
            })

            // 2. Extract serial numbers
            serials = grnItems.flatMap(item =>
                item.serialNumbers.split(',').map(s => s.trim())
            )
        }

        if (serials.length === 0) {
            return NextResponse.json([])
        }

        // 3. Find Inventory Items
        const inventoryItems = await prisma.inventoryItem.findMany({
            where: {
                serialNumber: { in: serials }
            },
            include: {
                product: {
                    select: { name: true, brand: true, model: true }
                },
                location: {
                    select: { name: true }
                }
            }
        })

        return NextResponse.json(inventoryItems)
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to fetch items' },
            { status: error.message === 'Unauthorized' ? 401 : 500 }
        )
    }
}

export async function POST(request: Request) {
    try {
        const user = await requireAuth()
        const body = await request.json()
        const { items } = body // [{ id, unitCost }]

        if (!items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: 'No items to update' }, { status: 400 })
        }

        const results = await prisma.$transaction(async (tx) => {
            const updatedItems = []

            for (const item of items) {
                const { id, unitCost } = item

                // Get current item for logging
                const currentItem = await tx.inventoryItem.findUnique({
                    where: { id }
                })

                if (!currentItem) continue

                // Update item
                const updated = await tx.inventoryItem.update({
                    where: { id },
                    data: { unitCost: Number(unitCost) }
                })
                updatedItems.push(updated)

                // Log Transaction
                await tx.transactionLog.create({
                    data: {
                        type: 'ADJUSTMENT',
                        referenceType: 'COST_ADJUSTMENT',
                        referenceId: id,
                        productId: currentItem.productId,
                        serialNumber: currentItem.serialNumber,
                        quantity: 1,
                        unitCost: Number(unitCost),
                        performedBy: user.name,
                        notes: `Cost adjustment: ${currentItem.unitCost} -> ${unitCost}`
                    }
                })
            }
            return updatedItems
        })

        return NextResponse.json(results)
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to update costs' },
            { status: error.message === 'Unauthorized' ? 401 : 500 }
        )
    }
}
