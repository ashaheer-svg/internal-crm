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
        const grn = await prisma.$transaction(async (tx) => {
            // Create GRN
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

            // Create inventory items for each serial number
            for (const item of items) {
                // Fetch product to get warranty period
                const product = await tx.product.findUnique({
                    where: { id: item.productId },
                    select: { warrantyMonths: true }
                })

                // Calculate warranty expiry date
                let warrantyExpiry: Date | null = null
                if (product && product.warrantyMonths > 0) {
                    warrantyExpiry = new Date()
                    warrantyExpiry.setMonth(warrantyExpiry.getMonth() + product.warrantyMonths)
                }

                for (const serialNumber of item.serialNumbers) {
                    await tx.inventoryItem.create({
                        data: {
                            productId: item.productId,
                            serialNumber: serialNumber.trim(),
                            locationId: item.locationId,
                            status: 'AVAILABLE',
                            unitCost: item.unitCost,
                            warrantyExpiry: warrantyExpiry
                        }
                    })

                    // Create transaction log
                    await tx.transactionLog.create({
                        data: {
                            type: 'RECEIPT',
                            referenceType: 'GRN',
                            referenceId: newGrn.id,
                            productId: item.productId,
                            serialNumber: serialNumber.trim(),
                            quantity: 1,
                            toLocation: item.locationId,
                            unitCost: item.unitCost,
                            performedBy: receivedBy,
                            notes: `GRN ${grnNumber} - ${supplier}`
                        }
                    })
                }
            }

            return newGrn
        })

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
