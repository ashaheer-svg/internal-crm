import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePermission } from '@/lib/auth'
import { logUpdate } from '@/lib/audit'

interface RouteParams {
    params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: RouteParams) {
    try {
        const user = await requirePermission('warranty_rma:update')
        const { id } = await params
        const body = await request.json()
        const { outcome, outcomeNotes, receivedItemId, creditNoteRef, creditNoteValue } = body

        if (!outcome) {
            return NextResponse.json({ error: 'Missing outcome' }, { status: 400 })
        }

        // 1. Fetch SupplierRMA
        const supplierRma = await (prisma as any).supplierRMA.findUnique({
            where: { id },
            include: { warrantyClaim: true }
        })

        if (!supplierRma) {
            return NextResponse.json({ error: 'Supplier RMA not found' }, { status: 404 })
        }

        const updateData: any = {
            outcome,
            outcomeNotes: outcomeNotes || null,
            status: 'RESOLVED',
            resolvedAt: new Date()
        }

        // 2. Handle Outcome Specifics
        if (outcome === 'REPAIRED') {
            const item = await prisma.inventoryItem.findUnique({
                where: { id: supplierRma.defectiveItemId }
            })
            const prevStatus = item?.status || 'SENT_TO_SUPPLIER'

            await prisma.inventoryItem.update({
                where: { id: supplierRma.defectiveItemId },
                data: { status: 'AVAILABLE' }
            })

            await prisma.transactionLog.create({
                data: {
                    type: 'RECEIPT',
                    referenceType: 'SUPPLIER_RMA',
                    referenceId: id,
                    productId: item?.productId,
                    serialNumber: item?.serialNumber,
                    quantity: 1,
                    notes: `Repaired unit returned from Supplier for RMA ${supplierRma.rmaNumber}`
                }
            })

            await logUpdate('INVENTORY', supplierRma.defectiveItemId, user.id, user.name,
                { status: prevStatus, serialNumber: item?.serialNumber },
                { status: 'AVAILABLE', reason: `Repaired and returned from Supplier RMA ${supplierRma.rmaNumber}` }
            )
        } 
        
        else if (outcome === 'NEW_UNIT') {
            if (!receivedItemId) {
                return NextResponse.json({ error: 'receivedItemId required for NEW_UNIT outcome' }, { status: 400 })
            }
            updateData.receivedItemId = receivedItemId

            const defectiveItem = await prisma.inventoryItem.findUnique({
                where: { id: supplierRma.defectiveItemId }
            })
            const newItem = await prisma.inventoryItem.findUnique({
                where: { id: receivedItemId }
            })

            // Defective item is RETIRED
            await prisma.inventoryItem.update({
                where: { id: supplierRma.defectiveItemId },
                data: { status: 'DEFECTIVE_RETIRED' }
            })

            await logUpdate('INVENTORY', supplierRma.defectiveItemId, user.id, user.name,
                { status: defectiveItem?.status, serialNumber: defectiveItem?.serialNumber },
                { status: 'DEFECTIVE_RETIRED', reason: `Retired from Supplier RMA ${supplierRma.rmaNumber} (Replaced with New Unit)` }
            )

            // New unit received from supplier -> it becomes AVAILABLE
            await prisma.inventoryItem.update({
                where: { id: receivedItemId },
                data: { status: 'AVAILABLE' }
            })

            await prisma.transactionLog.create({
                data: {
                    type: 'RECEIPT',
                    referenceType: 'SUPPLIER_RMA',
                    referenceId: id,
                    productId: newItem?.productId,
                    serialNumber: newItem?.serialNumber,
                    quantity: 1,
                    notes: `New unit received from Supplier for RMA ${supplierRma.rmaNumber}`
                }
            })

            await logUpdate('INVENTORY', receivedItemId, user.id, user.name,
                { status: newItem?.status, serialNumber: newItem?.serialNumber },
                { status: 'AVAILABLE', reason: `Received new unit from Supplier RMA ${supplierRma.rmaNumber}` }
            )
        } 
        
        else if (outcome === 'CREDIT_NOTE') {
            updateData.creditNoteRef = creditNoteRef || null
            updateData.creditNoteValue = creditNoteValue ? parseFloat(creditNoteValue) : null

            const defectiveItem = await prisma.inventoryItem.findUnique({
                where: { id: supplierRma.defectiveItemId }
            })

            // Defective item is RETIRED
            await prisma.inventoryItem.update({
                where: { id: supplierRma.defectiveItemId },
                data: { status: 'DEFECTIVE_RETIRED' }
            })

            await logUpdate('INVENTORY', supplierRma.defectiveItemId, user.id, user.name,
                { status: defectiveItem?.status, serialNumber: defectiveItem?.serialNumber },
                { status: 'DEFECTIVE_RETIRED', reason: `Retired from Supplier RMA ${supplierRma.rmaNumber} (Credited Back)` }
            )
        }

        // 3. Update SupplierRMA
        const updatedSrma = await (prisma as any).supplierRMA.update({
            where: { id },
            data: updateData
        })

        // 4. Update WarrantyClaim status to SUPPLIER_RMA_RESOLVED if linked
        if (supplierRma.warrantyClaim) {
            await prisma.warrantyClaim.update({
                where: { id: supplierRma.warrantyClaim.id },
                data: { status: 'SUPPLIER_RMA_RESOLVED' }
            })
        "Wait, we have the supplierRma available on claim as claim.supplierRmaId"
        }

        return NextResponse.json(updatedSrma)

    } catch (error: any) {
        console.error('Failed to resolve supplier RMA:', error)
        return NextResponse.json({ error: error.message || 'Failed to resolve supplier RMA' }, { status: 500 })
    }
}
