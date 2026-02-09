import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { logCreate } from '@/lib/audit'

export async function POST(request: Request) {
    try {
        const user = await requireAuth()
        const body = await request.json()
        const { productId, serialNumber, locationId, unitCost, grnNumber, supplier, purchaseOrderId } = body

        // Validation
        if (!productId || !serialNumber || !locationId || !grnNumber || !supplier) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const result = await prisma.$transaction(async (tx) => {
            // 1. Check if serial already exists
            const existingItem = await tx.inventoryItem.findUnique({
                where: { serialNumber }
            })

            if (existingItem) {
                throw new Error(`Serial number ${serialNumber} already exists`)
            }

            // 2. Handle GRN Logic
            let grn = await tx.goodsReceiptNote.findUnique({
                where: { grnNumber }
            })

            if (!grn) {
                // Check if this is a new GRN from sequence to consume it
                const sequence = await tx.sequence.findUnique({ where: { id: 'GRN' } })
                if (sequence) {
                    const expectedGrn = `${sequence.prefix}${sequence.lastYearMonth}-${sequence.nextNumber.toString().padStart(4, '0')}`
                    if (grnNumber === expectedGrn) {
                        // Increment sequence
                        await tx.sequence.update({
                            where: { id: 'GRN' },
                            data: { nextNumber: sequence.nextNumber + 1 }
                        })
                    }
                }

                grn = await tx.goodsReceiptNote.create({
                    data: {
                        grnNumber,
                        supplier,
                        receivedBy: user.name,
                        status: 'COMPLETED'
                    }
                })
            }

            // 3. Create GRN Item
            await tx.gRNItem.create({
                data: {
                    grnId: grn.id,
                    productId,
                    serialNumbers: serialNumber,
                    quantity: 1,
                    unitCost: Number(unitCost) || 0,
                    locationId
                }
            })

            // Fetch product to get warranty period
            const product = await tx.product.findUnique({
                where: { id: productId },
                select: { warrantyMonths: true }
            })

            let warrantyExpiry: Date | null = null
            if (product && product.warrantyMonths > 0) {
                warrantyExpiry = new Date()
                warrantyExpiry.setMonth(warrantyExpiry.getMonth() + product.warrantyMonths)
            }

            // 4. Create Inventory Item
            const item = await tx.inventoryItem.create({
                data: {
                    serialNumber,
                    productId,
                    locationId,
                    unitCost: Number(unitCost) || 0,
                    status: 'AVAILABLE',
                    warrantyExpiry
                },
                include: {
                    product: true,
                    location: true
                }
            })

            // 5. Log Transaction
            await tx.transactionLog.create({
                data: {
                    type: 'RECEIPT',
                    referenceType: 'GRN',
                    referenceId: grn.id,
                    productId,
                    serialNumber,
                    quantity: 1,
                    toLocation: item.location.name,
                    unitCost: Number(unitCost),
                    performedBy: user.name,
                    notes: `Received via GRN ${grnNumber}`
                }
            })

            // 6. Handle PO Fulfillment if linked
            if (purchaseOrderId) {
                // Find the PO item for this product
                const poItem = await tx.purchaseOrderItem.findFirst({
                    where: {
                        purchaseOrderId,
                        productId
                    }
                })

                if (poItem) {
                    // Update received quantity
                    await tx.purchaseOrderItem.update({
                        where: { id: poItem.id },
                        data: {
                            receivedQty: { increment: 1 }
                        }
                    })

                    // Check PO status
                    const po = await tx.purchaseOrder.findUnique({
                        where: { id: purchaseOrderId },
                        include: { items: true }
                    })

                    if (po) {
                        const allReceived = po.items.every(item => item.receivedQty >= item.quantity)

                        let newStatus = po.status
                        if (allReceived) {
                            newStatus = 'RECEIVED'
                        } else if (po.status === 'DRAFT') {
                            newStatus = 'SUBMITTED'
                        } else if (po.items.some(i => i.receivedQty > 0)) {
                            newStatus = 'PARTIAL'
                        }

                        // Link GRN to PO if not already
                        if (!grn.poReference) {
                            await tx.goodsReceiptNote.update({
                                where: { id: grn.id },
                                data: { poReference: po.poNumber }
                            })
                        }

                        if (newStatus !== po.status) {
                            await tx.purchaseOrder.update({
                                where: { id: purchaseOrderId },
                                data: { status: newStatus }
                            })
                        }
                    }
                }
            }

            // Log audit
            await logCreate('INVENTORY', item.id, user.id, user.name, {
                serialNumber: item.serialNumber,
                productId: item.productId,
                status: item.status,
                grn: grnNumber,
                po: purchaseOrderId
            })

            return item
        })

        return NextResponse.json(result)
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to add inventory' },
            { status: error.message === 'Unauthorized' ? 401 : 500 }
        )
    }
}
