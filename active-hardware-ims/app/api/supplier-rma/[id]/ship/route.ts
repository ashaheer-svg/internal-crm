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
        const { shippedAt, supplierRmaRef, notes } = body

        // 1. Fetch SupplierRMA
        const supplierRma = await (prisma as any).supplierRMA.findUnique({
            where: { id },
            include: { defectiveItem: true }
        })

        if (!supplierRma) {
            return NextResponse.json({ error: 'Supplier RMA not found' }, { status: 404 })
        }

        if (supplierRma.status !== 'PENDING') {
            return NextResponse.json({ error: `Supplier RMA is already ${supplierRma.status}` }, { status: 400 })
        }

        // 2. Update SupplierRMA status to SHIPPED
        const updatedSrma = await (prisma as any).supplierRMA.update({
            where: { id },
            data: {
                status: 'SHIPPED',
                shippedAt: shippedAt ? new Date(shippedAt) : new Date(),
                supplierRmaRef: supplierRmaRef || supplierRma.supplierRmaRef,
                notes: notes || supplierRma.notes
            }
        })

        // 3. Update defective item status to SENT_TO_SUPPLIER
        const prevStatus = supplierRma.defectiveItem.status
        await prisma.inventoryItem.update({
            where: { id: supplierRma.defectiveItemId },
            data: { status: 'SENT_TO_SUPPLIER' }
        })

        // 3b. Create TransactionLog entry for the issue
        await prisma.transactionLog.create({
            data: {
                type: 'ISSUE',
                referenceType: 'SUPPLIER_RMA',
                referenceId: id,
                productId: supplierRma.defectiveItem.productId,
                serialNumber: supplierRma.defectiveItem.serialNumber,
                quantity: 1,
                unitCost: (supplierRma.defectiveItem as any).unitCost || 0,
                notes: `Shipped to Supplier for RMA ${supplierRma.rmaNumber}`
            }
        })

        // 4. Log inventory status update
        await logUpdate('INVENTORY', supplierRma.defectiveItemId, user.id, user.name,
            { status: prevStatus, serialNumber: supplierRma.defectiveItem.serialNumber },
            { status: 'SENT_TO_SUPPLIER', reason: `Shipped to Supplier RMA ${supplierRma.rmaNumber}` }
        )

        return NextResponse.json(updatedSrma)

    } catch (error: any) {
        console.error('Failed to ship supplier RMA:', error)
        return NextResponse.json({ error: error.message || 'Failed to ship supplier RMA' }, { status: 500 })
    }
}
