import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { logCreate } from '@/lib/audit'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const productId = searchParams.get('productId')
        const locationId = searchParams.get('locationId')
        const status = searchParams.get('status')
        const serialNumber = searchParams.get('serialNumber')

        const where: any = {}
        if (productId) where.productId = productId
        if (locationId) where.locationId = locationId
        if (status) {
            // Handle comma-separated status values (e.g., "SOLD,DELIVERED,RMA")
            const statuses = status.split(',').map(s => s.trim())
            where.status = { in: statuses }
        }
        if (serialNumber) where.serialNumber = { contains: serialNumber }

        const items = await prisma.inventoryItem.findMany({
            where,
            include: {
                product: true,
                location: true
            },
            orderBy: { createdAt: 'asc' }
        })

        return NextResponse.json(items)
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Failed to fetch inventory' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const user = await requireAuth()
        const body = await request.json()
        const { productId, serialNumber, serialNumbers, locationId, unitCost, grnNumber, supplier, purchaseOrderId } = body

        // Normalize serial numbers to array
        const serials: string[] = serialNumbers || (serialNumber ? [serialNumber] : [])

        // Validation
        if (!productId || serials.length === 0 || !locationId || !grnNumber || !supplier) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const result = await prisma.$transaction(async (tx) => {
            // 1. Check if ANY serial already exists
            const existingItems = await tx.inventoryItem.findMany({
                where: { serialNumber: { in: serials } },
                select: { serialNumber: true }
            })

            if (existingItems.length > 0) {
                const existingSerials = existingItems.map(i => i.serialNumber).join(', ')
                throw new Error(`Serial numbers already exist: ${existingSerials}`)
            }

            // 2. Handle GRN Logic (Find or Create)
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

            // 3. Create GRN Items (Bulk)
            await tx.gRNItem.createMany({
                data: serials.map(serial => ({
                    grnId: grn.id,
                    productId,
                    serialNumbers: serial,
                    quantity: 1,
                    unitCost: Number(unitCost) || 0,
                    locationId
                }))
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

            // 4. Create Inventory Items (Bulk)
            await tx.inventoryItem.createMany({
                data: serials.map(serial => ({
                    serialNumber: serial,
                    productId,
                    locationId,
                    unitCost: Number(unitCost) || 0,
                    status: 'AVAILABLE',
                    warrantyExpiry
                }))
            })

            // 5. Log Transactions (Bulk - manual loop because TransactionLog might accept extra fields not in createMany or just to be safe with timestamps)
            // Actually createMany is safer for performance.
            // TransactionLog schema: type, referenceType, referenceId, productId, serialNumber, quantity, toLocation, unitCost, performedBy, notes

            // Need location name for logging
            const location = await tx.location.findUnique({ where: { id: locationId }, select: { name: true } })

            await tx.transactionLog.createMany({
                data: serials.map(serial => ({
                    type: 'RECEIPT',
                    referenceType: 'GRN',
                    referenceId: grn.id,
                    productId,
                    serialNumber: serial,
                    quantity: 1,
                    toLocation: location?.name || 'Unknown',
                    unitCost: Number(unitCost),
                    performedBy: user.name,
                    notes: `Received via GRN ${grnNumber}`
                }))
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
                    const newReceivedQty = poItem.receivedQty + serials.length
                    const newUnitCost = Number(unitCost) || poItem.unitCost
                    const newTotalCost = newUnitCost * poItem.quantity

                    // Update received quantity and cost
                    await tx.purchaseOrderItem.update({
                        where: { id: poItem.id },
                        data: {
                            receivedQty: newReceivedQty,
                            unitCost: newUnitCost,
                            totalCost: newTotalCost
                        }
                    })

                    // Recalculate PO Total Amount
                    // Fetch all items (including the updated one) to sum up totalCost
                    const po = await tx.purchaseOrder.findUnique({
                        where: { id: purchaseOrderId },
                        include: { items: true }
                    })

                    if (po) {
                        const allReceived = po.items.every(item => item.receivedQty >= item.quantity)

                        const currentTotal = po.items.reduce((sum, item) => sum + item.totalCost, 0)

                        let newStatus = po.status
                        if (allReceived) {
                            newStatus = 'RECEIVED'
                        } else if (po.items.some(i => i.receivedQty > 0)) {
                            newStatus = 'PARTIAL'
                        } else if (po.status === 'DRAFT') {
                            newStatus = 'SUBMITTED'
                        }

                        // Link GRN to PO if not already
                        if (!grn.poReference) {
                            await tx.goodsReceiptNote.update({
                                where: { id: grn.id },
                                data: { poReference: po.poNumber }
                            })
                        }

                        if (newStatus !== po.status || Math.abs(currentTotal - po.totalAmount) > 0.01) {
                            await tx.purchaseOrder.update({
                                where: { id: purchaseOrderId },
                                data: {
                                    status: newStatus,
                                    totalAmount: currentTotal
                                }
                            })
                        }
                    }
                }
            }

            // Log audit (Bulk - manually loop as AuditLog usually needs to be detailed)
            // Or just log one summary 'BULK_RECEIPT'?
            // Providing detailed logs for 100 items might be too much for the audit log table if done individually via library.
            // But for consistency let's try to map it or just log a summary.
            // The library `logCreate` does one at a time.
            // Let's create a "BATCH" log or just loop. Loop 100 times is fine inside a transaction for simple inserts.
            // But to be faster, let's just log one action saying "Added X items".
            // However, audit logs are often used to trace specific serials.
            // Let's use `createMany` for audit logs too if possible.
            // AuditLog model has `entityId`, `entityType`, `action`.

            await tx.auditLog.createMany({
                data: serials.map(serial => ({
                    action: 'CREATE',
                    entityType: 'INVENTORY',
                    // We don't have the new IDs here because createMany doesn't return them in SQLite/Postgres efficiently seamlessly in Prisma 
                    // BUT we know serialNumber is unique.
                    // Ideally entityId should be the ID, but for Inventory, Serial Number is a good proxy or we query them back.
                    // Querying back 100 items might be slow.
                    // Let's use Serial Number as entityId in the log or just leave it null and put it in metadata?
                    // The schema says entityId is String?.
                    // Let's skip mapping ID for now and just log the event.
                    // OR better:
                    // Log one big entry: "Bulk Receive"
                    userId: user.id,
                    userName: user.name,
                    changes: JSON.stringify({ after: { serialNumber: serial, productId, grn: grnNumber } })
                }))
            })

            return { count: serials.length, message: 'Success' }
        })

        return NextResponse.json(result)
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to add inventory' },
            { status: error.message === 'Unauthorized' ? 401 : 500 }
        )
    }
}
