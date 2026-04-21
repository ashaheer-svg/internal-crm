import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePermission } from '@/lib/auth'
import { logUpdate } from '@/lib/audit'

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await requirePermission('warranty_rma:update')
        const body = await request.json()
        const { notes } = body
        const { id: claimId } = await params

        // Get the warranty claim
        const claim = await prisma.warrantyClaim.findUnique({
            where: { id: claimId },
            include: {
                inventoryItem: true
            }
        })

        if (!claim) {
            return NextResponse.json({ error: 'Warranty claim not found' }, { status: 404 })
        }

        // Check if this is a temporary replacement
        if ((claim as any).replacementType !== 'TEMPORARY') {
            return NextResponse.json(
                { error: 'Can only return temporary replacements' },
                { status: 400 }
            )
        }

        // Check if replacement was provided
        if (!(claim as any).replacementItemId && !(claim as any).replacementExternalInfo) {
            return NextResponse.json(
                { error: 'No replacement was provided for this claim' },
                { status: 400 }
            )
        }

        // Check if already returned
        if ((claim as any).replacementReturnedAt) {
            return NextResponse.json(
                { error: 'Replacement already returned' },
                { status: 400 }
            )
        }

        // Update replacement item, log transaction, and update warranty claim in a single transaction
        const { updatedClaim, repItem } = await prisma.$transaction(async (tx) => {
            let repItem = null;

            if ((claim as any).replacementItemId) {
                // Return replacement item to available status
                repItem = await tx.inventoryItem.update({
                    where: { id: (claim as any).replacementItemId },
                    data: {
                        status: 'AVAILABLE',
                        warrantyExpiry: null
                    }
                })

                // Create TransactionLog entry for the receipt
                await tx.transactionLog.create({
                    data: {
                        type: 'RECEIPT',
                        referenceType: 'WARRANTY',
                        referenceId: claimId,
                        productId: repItem.productId,
                        serialNumber: repItem.serialNumber,
                        quantity: 1,
                        unitCost: repItem.unitCost,
                        notes: `Returned temporary replacement for claim ${claimId}. Original unit: ${claim.inventoryItem.serialNumber}.`
                    }
                })
            }

            // Update warranty claim
            const uClaim = await tx.warrantyClaim.update({
                where: { id: claimId },
                data: {
                    replacementReturnedAt: new Date()
                } as any,
                include: {
                    inventoryItem: {
                        include: { product: true }
                    }
                }
            })

            return { updatedClaim: uClaim, repItem }
        }, { timeout: 15000 })

        // Log replacement item status change for inventory auditing
        if ((claim as any).replacementItemId && repItem) {
            await logUpdate('INVENTORY', (claim as any).replacementItemId, user.id, user.name,
                {
                    status: 'LOANED',
                    warrantyExpiry: claim.inventoryItem.warrantyExpiry,
                    serialNumber: repItem.serialNumber
                },
                {
                    status: 'AVAILABLE',
                    warrantyExpiry: null,
                    reason: `Temporary replacement returned for claim ${claimId}`
                }
            )
        }

        // Log warranty claim update
        await logUpdate('WARRANTY', claimId, user.id, user.name,
            {
                replacementReturnedAt: null
            },
            {
                replacementReturnedAt: new Date(),
                notes: notes || ((claim as any).replacementExternalInfo ? `Untracked unit (${(claim as any).replacementExternalInfo}) returned` : 'Replacement returned')
            }
        )

        return NextResponse.json({
            claim: updatedClaim,
            message: 'Temporary replacement returned successfully'
        })

    } catch (error: any) {
        console.error('Failed to return replacement:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to return replacement' },
            { status: 500 }
        )
    }
}
