import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { logCreate } from '@/lib/audit'

export async function POST(request: Request) {
    try {
        const user = await requireAuth()
        const body = await request.json()
        const { productId, serialNumber, locationId, unitCost, grnNumber, supplier } = body

        // Validation
        if (!productId || !serialNumber || !locationId || !grnNumber || !supplier) {
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

        const result = await prisma.$transaction(async (tx) => {
            // 1. Find or create the GRN
            // We use upsert if we want to update, but usually finding first is safer for logic if we want to validate supplier matches etc.
            // For simplicity, let's treat GRN number as unique identifier.
            let grn = await tx.goodsReceiptNote.findUnique({
                where: { grnNumber }
            })

            if (!grn) {
                grn = await tx.goodsReceiptNote.create({
                    data: {
                        grnNumber,
                        supplier,
                        receivedBy: user.name,
                        status: 'COMPLETED'
                    }
                })
            }

            // 2. Create GRN Item (record of this specific addition)
            // Even if adding 1 by 1, we record it.
            await tx.gRNItem.create({
                data: {
                    grnId: grn.id,
                    productId,
                    serialNumbers: serialNumber,
                    quantity: 1,
                    unitCost: unitCost ? Number(unitCost) : 0,
                    locationId
                }
            })

            // 3. Create Inventory Item
            const item = await tx.inventoryItem.create({
                data: {
                    productId,
                    serialNumber,
                    locationId,
                    status: 'AVAILABLE',
                    unitCost: unitCost ? Number(unitCost) : 0,
                    warrantyExpiry: warrantyExpiry
                }
            })

            // 4. Log Transaction
            await tx.transactionLog.create({
                data: {
                    type: 'RECEIPT',
                    referenceType: 'GRN',
                    referenceId: grn.id,
                    productId,
                    serialNumber,
                    quantity: 1,
                    toLocation: locationId,
                    unitCost: unitCost ? Number(unitCost) : 0,
                    performedBy: user.name,
                    notes: `Added via Inventory Page - GRN: ${grnNumber}`
                }
            })

            // 5. Log audit (only if needed, but transaction log covers most)
            await logCreate('INVENTORY', item.id, user.id, user.name, {
                serialNumber: item.serialNumber,
                productId: item.productId,
                status: item.status,
                grn: grnNumber
            })

            return item
        })

        return NextResponse.json(result)
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to add inventory item' },
            { status: error.message === 'Unauthorized' ? 401 : 500 }
        )
    }
}
