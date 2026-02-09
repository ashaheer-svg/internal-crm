import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { logCreate } from '@/lib/audit'

export async function GET() {
    try {
        await requireAuth()

        const grns = await prisma.goodsReceiptNote.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                items: true
            }
        })
        return NextResponse.json(grns)
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to fetch GRNs' },
            { status: error.message === 'Unauthorized' ? 401 : 500 }
        )
    }
}

export async function POST(request: Request) {
    try {
        const user = await requireAuth()
        const body = await request.json()
        const { grnNumber, supplier, poReference, receivedBy, notes, items } = body

        if (!grnNumber || !supplier || !receivedBy || !items || items.length === 0) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Create GRN and process all items in a transaction
        const result = await prisma.$transaction(async (tx) => {
            // 1. Fetch all products to get warranty info
            const productIds = Array.from(new Set(items.map((item: any) => item.productId)))
            const products = await tx.product.findMany({
                where: { id: { in: productIds as string[] } },
                select: { id: true, warrantyMonths: true }
            })

            const productMap = new Map(products.map(p => [p.id, p]))

            // 2. Create GRN
            const newGrn = await tx.goodsReceiptNote.create({
                data: {
                    grnNumber,
                    supplier,
                    poReference,
                    receivedBy,
                    notes,
                    status: 'COMPLETED',
                    items: {
                        create: items.map((item: any) => ({
                            productId: item.productId,
                            serialNumbers: item.serialNumbers.join(','),
                            quantity: item.serialNumbers.length,
                            unitCost: item.unitCost,
                            locationId: item.locationId
                        }))
                    }
                },
                include: {
                    items: true
                }
            })

            // 3. Prepare Inventory Items and Transaction Logs
            const inventoryItemsToCreate = []
            const transactionLogsToCreate = []
            const now = new Date()

            for (const item of items) {
                const product = productMap.get(item.productId)
                let warrantyExpiry: Date | null = null

                if (product && product.warrantyMonths > 0) {
                    warrantyExpiry = new Date(now)
                    warrantyExpiry.setMonth(warrantyExpiry.getMonth() + product.warrantyMonths)
                }

                for (const serialNumber of item.serialNumbers) {
                    inventoryItemsToCreate.push({
                        productId: item.productId,
                        serialNumber: serialNumber.trim(),
                        locationId: item.locationId,
                        status: 'AVAILABLE',
                        unitCost: item.unitCost,
                        warrantyExpiry: warrantyExpiry,
                        createdAt: now,
                        updatedAt: now
                    })

                    transactionLogsToCreate.push({
                        type: 'RECEIPT',
                        referenceType: 'GRN',
                        referenceId: newGrn.id,
                        productId: item.productId,
                        serialNumber: serialNumber.trim(),
                        quantity: 1,
                        toLocation: item.locationId,
                        unitCost: item.unitCost,
                        performedBy: receivedBy,
                        notes: `GRN ${grnNumber} - ${supplier}`,
                        createdAt: now
                    })
                }
            }

            // 4. Batch Insert Inventory Items
            if (inventoryItemsToCreate.length > 0) {
                // Determine batch size (SQLite has variable limit, safe bet is 500-999)
                // We'll use a conservative batch size for safety
                const batchSize = 100
                for (let i = 0; i < inventoryItemsToCreate.length; i += batchSize) {
                    const batch = inventoryItemsToCreate.slice(i, i + batchSize)
                    await tx.inventoryItem.createMany({
                        data: batch
                    })
                }
            }

            // 5. Batch Insert Transaction Logs
            if (transactionLogsToCreate.length > 0) {
                const batchSize = 100
                for (let i = 0; i < transactionLogsToCreate.length; i += batchSize) {
                    const batch = transactionLogsToCreate.slice(i, i + batchSize)
                    await tx.transactionLog.createMany({
                        data: batch
                    })
                }
            }

            return newGrn
        }, {
            maxWait: 10000, // 10s wait for lock
            timeout: 20000  // 20s transaction timeout
        })

        const grn = result

        // Log GRN creation
        await logCreate('GRN', grn.id, user.id, user.name, {
            grnNumber: grn.grnNumber,
            supplier: grn.supplier,
            itemCount: items.length
        })

        return NextResponse.json(grn)
    } catch (error: any) {
        console.error(error)
        return NextResponse.json(
            { error: error.message || 'Failed to create GRN' },
            { status: error.message === 'Unauthorized' ? 401 : 500 }
        )
    }
}
