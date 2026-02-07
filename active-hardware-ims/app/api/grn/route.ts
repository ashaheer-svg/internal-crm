import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
    try {
        const grns = await prisma.goodsReceiptNote.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                items: true
            }
        })
        return NextResponse.json(grns)
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch GRNs' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
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
                for (const serialNumber of item.serialNumbers) {
                    await tx.inventoryItem.create({
                        data: {
                            productId: item.productId,
                            serialNumber: serialNumber.trim(),
                            locationId: item.locationId,
                            status: 'AVAILABLE',
                            unitCost: item.unitCost
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

        return NextResponse.json(grn)
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: 'Failed to create GRN' }, { status: 500 })
    }
}
