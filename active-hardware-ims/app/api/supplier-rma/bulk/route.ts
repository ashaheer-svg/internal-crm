import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePermission } from '@/lib/auth'
import { logCreate } from '@/lib/audit'

export async function POST(request: Request) {
    try {
        const user = await requirePermission('warranty_rma:update')
        const body = await request.json()
        const { claimIds, supplierId, supplierRmaRef, notes } = body

        if (!claimIds || !Array.isArray(claimIds) || claimIds.length === 0 || !supplierId) {
            return NextResponse.json({ error: 'Missing required fields (claimIds array, supplierId)' }, { status: 400 })
        }

        // 1. Fetch all claims with their inventory items
        const claims = await prisma.warrantyClaim.findMany({
            where: { id: { in: claimIds } },
            include: { inventoryItem: true }
        })

        if (claims.length !== claimIds.length) {
            return NextResponse.json({ error: 'One or more warranty claims not found' }, { status: 404 })
        }

        // 2. Validate all items are in RMA_DEFECTIVE_RECEIVED status
        for (const claim of claims) {
            if (claim.inventoryItem.status !== 'RMA_DEFECTIVE_RECEIVED') {
                return NextResponse.json({ 
                    error: `Item ${claim.inventoryItem.serialNumber} must be in 'RMA_DEFECTIVE_RECEIVED' status, currently '${claim.inventoryItem.status}'` 
                }, { status: 400 })
            }
        }

        // 3. Generate SRMA Number using transaction to avoid concurrency conflicts
        const supplierRma = await prisma.$transaction(async (tx) => {
            const seq = await tx.sequence.update({
                where: { id: 'SRMA' },
                data: { nextNumber: { increment: 1 } }
            })
            const rmaNumber = `${seq.prefix}${String(seq.nextNumber - 1).padStart(4, '0')}`

            // Create SupplierRMA
            const sRma = await (tx as any).supplierRMA.create({
                data: {
                    rmaNumber,
                    supplierId,
                    supplierRmaRef: supplierRmaRef || null,
                    notes: notes || null,
                    status: 'PENDING'
                }
            })

            // Link all claims to this SRMA
            await tx.warrantyClaim.updateMany({
                where: { id: { in: claimIds } },
                data: {
                    status: 'SUPPLIER_RMA_OPEN',
                    supplierRmaId: sRma.id
                } as any
            })

            return sRma
        })

        await logCreate('WARRANTY', supplierRma.id, user.id, user.name, {
            rmaNumber: supplierRma.rmaNumber,
            claimIds,
            status: 'PENDING',
            supplierId
        })

        return NextResponse.json(supplierRma)

    } catch (error: any) {
        console.error('Failed to create bulk supplier RMA:', error)
        return NextResponse.json({ error: error.message || 'Failed to create bulk supplier RMA' }, { status: 500 })
    }
}
