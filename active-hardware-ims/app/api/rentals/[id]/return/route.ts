import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { logCreate } from '@/lib/audit'

/**
 * POST /api/rentals/[id]/return
 * Returns a rented asset back to AVAILABLE, closes the contract, and restores inventory.
 * [id] = RentalAsset.id
 */
export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params
    try {
        const user = await requireAuth()
        const { notes } = await request.json().catch(() => ({ notes: '' }))

        // 1. Look up the rental asset
        const asset = await prisma.rentalAsset.findUnique({
            where: { id: params.id },
            include: {
                currentContract: {
                    include: { customer: true, product: true }
                }
            }
        })

        if (!asset) return NextResponse.json({ error: 'Rental asset not found' }, { status: 404 })
        if (asset.isDeleted) return NextResponse.json({ error: 'Asset is deleted' }, { status: 404 })
        if (asset.status !== 'RENTED') return NextResponse.json({ error: 'Asset is not currently rented' }, { status: 400 })

        const contract = asset.currentContract

        await prisma.$transaction(async (tx) => {
            // A. Release the rental asset back to AVAILABLE
            await tx.rentalAsset.update({
                where: { id: params.id },
                data: { status: 'AVAILABLE', currentContractId: null }
            })

            // B. Mark the service contract as COMPLETED
            if (contract) {
                await tx.serviceContract.update({
                    where: { id: contract.id },
                    data: { status: 'COMPLETED' }
                })
            }

            // C. If inventory item exists with this serial, restore it to AVAILABLE
            if (asset.serialNumber) {
                const inventoryItem = await tx.inventoryItem.findUnique({
                    where: { serialNumber: asset.serialNumber }
                })
                if (inventoryItem && inventoryItem.status === 'LOANED') {
                    await tx.inventoryItem.update({
                        where: { id: inventoryItem.id },
                        data: { status: 'AVAILABLE', deliveryOrderItemId: null }
                    })
                }
            }

            // D. Transaction log
            await tx.transactionLog.create({
                data: {
                    type: 'RECEIPT',
                    referenceType: 'RENTAL_RETURN',
                    referenceId: params.id,
                    productId: asset.productId,
                    serialNumber: asset.serialNumber,
                    quantity: 1,
                    notes: `Rental asset returned. Contract: ${contract?.id ?? 'N/A'}. Reason: ${notes || 'Not specified'}`
                }
            })

            // E. Audit log
            await logCreate('RENTAL_RETURN', params.id, user.id, user.name, {
                assetName: asset.name,
                serialNumber: asset.serialNumber,
                contractId: contract?.id,
                notes
            })
        })

        return NextResponse.json({ success: true, message: `Asset "${asset.name}" returned successfully.` })
    } catch (error: any) {
        console.error('[rental-return] Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
