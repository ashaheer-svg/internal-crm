import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePermission } from '@/lib/auth'
import { logCreate } from '@/lib/audit'

export async function GET(request: Request) {
    try {
        await requirePermission('warranty_rma:read')
        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status')

        const where = status ? { status } : {}

        const supplierRmas = await (prisma as any).supplierRMA.findMany({
            where,
            include: {
                defectiveItem: {
                    include: { product: true }
                },
                supplier: true,
                warrantyClaims: {
                    include: {
                        inventoryItem: {
                            include: { product: true }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json(supplierRmas)
    } catch (error: any) {
        console.error('Failed to fetch supplier RMAs:', error)
        return NextResponse.json({ error: error.message || 'Failed to fetch supplier RMAs' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const user = await requirePermission('warranty_rma:update')
        const body = await request.json()
        const { defectiveItemId, supplierId, supplierRmaRef, notes, warrantyClaimId } = body

        if (!defectiveItemId || !supplierId) {
            return NextResponse.json({ error: 'Missing required fields (defectiveItemId, supplierId)' }, { status: 400 })
        }

        // 1. Verify defective item is in stock inside RMA_DEFECTIVE_RECEIVED status
        const item = await prisma.inventoryItem.findUnique({
            where: { id: defectiveItemId }
        })

        if (!item) {
            return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 })
        }

        if (item.status !== 'RMA_DEFECTIVE_RECEIVED') {
            return NextResponse.json({ error: `Item must be in RMA_DEFECTIVE_RECEIVED status, currently ${item.status}` }, { status: 400 })
        }

        // 2. Generate SRMA Number
        // Fetch next sequence
        const seq = await prisma.sequence.update({
            where: { id: 'SRMA' },
            data: { nextNumber: { increment: 1 } }
        })
        const rmaNumber = `${seq.prefix}${String(seq.nextNumber - 1).padStart(4, '0')}`

        // 3. Create SupplierRMA
        const supplierRma = await (prisma as any).supplierRMA.create({
            data: {
                rmaNumber,
                defectiveItemId,
                supplierId,
                supplierRmaRef: supplierRmaRef || null,
                notes: notes || null,
                status: 'PENDING'
            }
        })

        // 4. Update WarrantyClaim status to SUPPLIER_RMA_OPEN if provided
        if (warrantyClaimId) {
            await prisma.warrantyClaim.update({
                where: { id: warrantyClaimId },
                data: { 
                    status: 'SUPPLIER_RMA_OPEN',
                    supplierRmaId: supplierRma.id
                } as any
            })
        }

        // 5. Update inventory item to SENT_TO_SUPPLIER is NOT done here, it's done upon SHIP action.
        // Or we can auto-ship if user provided the date already? 
        // The plan says separate SHIP endpoint for workflow triggers.

        await logCreate('WARRANTY', supplierRma.id, user.id, user.name, {
            rmaNumber,
            defectiveItemId,
            status: 'PENDING',
            supplierId
        })

        return NextResponse.json(supplierRma)

    } catch (error: any) {
        console.error('Failed to create supplier RMA:', error)
        return NextResponse.json({ error: error.message || 'Failed to create supplier RMA' }, { status: 500 })
    }
}
