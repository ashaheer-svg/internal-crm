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

        // 1. Fetch all products to get warranty info (OUTSIDE TRANSACTION)
        const productIds = Array.from(new Set(items.map((item: any) => item.productId)))
        const products = await prisma.product.findMany({
            where: { id: { in: productIds as string[] } },
            select: { id: true, warrantyMonths: true }
        })

        const productMap = new Map(products.map(p => [p.id, p]))

        // 2. Prepare Inventory Items and Transaction Logs (OUTSIDE TRANSACTION)
        const inventoryItemsToCreate: any[] = []
        const transactionLogsToCreate: any[] = []
        const now = new Date()

        // Generate UUID manually to link GRN and logs
        // Falling back to crypto.randomUUID if uuid package not available, but usually safe in modern node
        const grnId = crypto.randomUUID()

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
                    referenceId: grnId,
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

        // 3. Execute Database Writes (INSIDE TRANSACTION)
        const result = await prisma.$transaction(async (tx) => {
            // Create GRN with manual ID
            const newGrn = await tx.goodsReceiptNote.create({
                data: {
                    id: grnId,
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

            // Batch Insert Inventory Items
            if (inventoryItemsToCreate.length > 0) {
                const batchSize = 100
                for (let i = 0; i < inventoryItemsToCreate.length; i += batchSize) {
                    const batch = inventoryItemsToCreate.slice(i, i + batchSize)
                    await tx.inventoryItem.createMany({
                        data: batch
                    })
                }
            }

            // Batch Insert Transaction Logs
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
            maxWait: 5000,
            timeout: 20000
        })

        const grn = result

        // Log GRN creation
        await logCreate('GRN', grn.id, user.id, user.name, {
            grnNumber: grn.grnNumber,
            supplier: grn.supplier,
            itemCount: items.length
        })

        // Check for open backorders on received products and notify
        try {
            const receivedProductIds = Array.from(new Set(items.map((item: any) => item.productId))) as string[]
            const openBackorders = await prisma.backorderItem.findMany({
                where: {
                    productId: { in: receivedProductIds },
                    status: { in: ['PENDING', 'PARTIAL'] }
                },
                include: { product: { select: { name: true } } }
            })

            if (openBackorders.length > 0) {
                const productNames = [...new Set(openBackorders.map(b => b.product.name))].join(', ')
                // Find admins/managers to notify (users without a role filter — broadcast to system)
                const admins = await prisma.user.findMany({
                    where: { isActive: true },
                    select: { id: true },
                    take: 10
                })

                if (admins.length > 0) {
                    await prisma.message.create({
                        data: {
                            subject: `Stock received for backorder items — GRN ${grnNumber}`,
                            content: `Stock has been received for: ${productNames}.\n\nThere are ${openBackorders.length} open backorder(s) for these products. Please allocate stock to fulfill pending customer orders.`,
                            priority: 'HIGH',
                            category: 'STOCK',
                            senderId: user.id,
                            receipts: {
                                create: admins.map(admin => ({ userId: admin.id }))
                            }
                        }
                    })
                }
            }
        } catch (notificationError) {
            // Non-critical — do not fail the GRN if notification fails
            console.error('[GRN] Failed to send backorder notification:', notificationError)
        }

        return NextResponse.json(grn)
    } catch (error: any) {
        console.error(error)
        return NextResponse.json(
            { error: error.message || 'Failed to create GRN' },
            { status: error.message === 'Unauthorized' ? 401 : 500 }
        )
    }
}
