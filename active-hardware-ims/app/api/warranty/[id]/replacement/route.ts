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
        const { replacementType, replacementItemId, replacementExternalInfo, notes } = body
        const { id: claimId } = await params

        // Validate required fields
        if (!replacementType) {
            return NextResponse.json(
                { error: 'Replacement type is required' },
                { status: 400 }
            )
        }

        if (!replacementItemId && !replacementExternalInfo) {
            return NextResponse.json(
                { error: 'Either a replacement item ID or manual unit details are required' },
                { status: 400 }
            )
        }

        // Validate replacement type
        if (!['TEMPORARY', 'PERMANENT'].includes(replacementType)) {
            return NextResponse.json(
                { error: 'Invalid replacement type. Must be TEMPORARY or PERMANENT' },
                { status: 400 }
            )
        }

        // Get the warranty claim with original item details
        const claim = await prisma.warrantyClaim.findUnique({
            where: { id: claimId },
            include: {
                inventoryItem: {
                    include: {
                        product: true
                    }
                }
            }
        })

        if (!claim) {
            return NextResponse.json({ error: 'Warranty claim not found' }, { status: 404 })
        }

        // Check if replacement already provided
        if ((claim as any).replacementItemId || (claim as any).replacementExternalInfo) {
            return NextResponse.json(
                { error: 'Replacement already provided for this claim' },
                { status: 400 }
            )
        }

        // Handle Tracked Replacement
        if (replacementItemId) {
            // Get the replacement item
            const replacementItem = await prisma.inventoryItem.findUnique({
                where: { id: replacementItemId },
                include: { product: true }
            })

            if (!replacementItem) {
                return NextResponse.json({ error: 'Replacement item not found' }, { status: 404 })
            }

            // Check if replacement item is available
            if (replacementItem.status !== 'AVAILABLE') {
                return NextResponse.json(
                    { error: `Replacement item is not available (current status: ${replacementItem.status})` },
                    { status: 400 }
                )
            }

            // Get original warranty expiry
            const originalWarrantyExpiry = claim.inventoryItem.warrantyExpiry

            // Update replacement item, log transaction, and update warranty claim in a single transaction
            const { updatedClaim, replacementItem: updatedReplacementItem } = await prisma.$transaction(async (tx) => {
                // Determine new status for replacement item
                const newStatus = replacementType === 'PERMANENT' ? 'WARRANTY_REPLACED' : 'LOANED'

                // Update replacement item with warranty transfer
                const repItem = await tx.inventoryItem.update({
                    where: { id: replacementItemId },
                    data: {
                        status: newStatus,
                        warrantyExpiry: originalWarrantyExpiry
                    },
                    include: { product: true }
                })

                // Create TransactionLog entry for the issue
                await tx.transactionLog.create({
                    data: {
                        type: 'ISSUE',
                        referenceType: 'WARRANTY',
                        referenceId: claimId,
                        productId: repItem.productId,
                        serialNumber: repItem.serialNumber,
                        quantity: 1,
                        unitCost: repItem.unitCost,
                        notes: `Warranty replacement (${replacementType}) for ${claim.inventoryItem.serialNumber}. Assigned to ${claim.customerName}.`
                    }
                })

                // Update warranty claim
                const uClaim = await tx.warrantyClaim.update({
                    where: { id: claimId },
                    data: {
                        replacementType,
                        replacementItemId,
                        replacementProvidedAt: new Date(),
                        status: 'IN_PROGRESS'
                    } as any,
                    include: {
                        inventoryItem: {
                            include: { product: true }
                        }
                    }
                })

                return { updatedClaim: uClaim, replacementItem: repItem }
            })

            // Log replacement item status change for inventory auditing
            await logUpdate('INVENTORY', replacementItemId, user.id, user.name,
                {
                    status: 'AVAILABLE',
                    warrantyExpiry: null,
                    serialNumber: updatedReplacementItem.serialNumber
                },
                {
                    status: updatedReplacementItem.status,
                    warrantyExpiry: originalWarrantyExpiry,
                    reason: `${replacementType} warranty replacement for ${claim.inventoryItem.serialNumber}`
                }
            )

            // Log warranty claim update for audit
            await logUpdate('WARRANTY', claimId, user.id, user.name,
                {
                    replacementType: null,
                    replacementItemId: null,
                    status: claim.status
                },
                {
                    replacementType,
                    replacementItemId,
                    replacementSerialNumber: updatedReplacementItem.serialNumber,
                    replacementProductName: updatedReplacementItem.product.name,
                    status: 'IN_PROGRESS',
                    notes
                }
            )

            return NextResponse.json({
                claim: updatedClaim,
                replacementItem: {
                    id: updatedReplacementItem.id,
                    serialNumber: updatedReplacementItem.serialNumber,
                    productName: (updatedReplacementItem as any).product.name,
                    status: updatedReplacementItem.status,
                    warrantyExpiry: originalWarrantyExpiry
                },
                originalWarrantyExpiry,
                message: `${replacementType} replacement provided successfully`
            })
        }

        // Handle Untracked (Manual Entry) Replacement
        else {
            // Update warranty claim with external info
            const updatedClaim = await prisma.warrantyClaim.update({
                where: { id: claimId },
                data: {
                    replacementType,
                    replacementExternalInfo,
                    replacementProvidedAt: new Date(),
                    status: 'IN_PROGRESS'
                } as any,
                include: {
                    inventoryItem: {
                        include: { product: true }
                    }
                }
            })

            // Log warranty claim update
            await logUpdate('WARRANTY', claimId, user.id, user.name,
                {
                    replacementType: null,
                    replacementExternalInfo: null,
                    status: claim.status
                },
                {
                    replacementType,
                    replacementExternalInfo,
                    status: 'IN_PROGRESS',
                    notes: notes || 'Untracked replacement provided'
                }
            )

            return NextResponse.json({
                claim: updatedClaim,
                message: `${replacementType} untracked replacement provided successfully`
            })
        }

    } catch (error: any) {
        console.error('Failed to provide replacement:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to provide replacement' },
            { status: 500 }
        )
    }
}
