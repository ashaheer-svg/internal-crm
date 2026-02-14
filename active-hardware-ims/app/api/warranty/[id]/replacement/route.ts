import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { logUpdate } from '@/lib/audit'

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await requireAuth()
        const body = await request.json()
        const { replacementType, replacementItemId, notes } = body
        const { id: claimId } = await params

        // Validate required fields
        if (!replacementType || !replacementItemId) {
            return NextResponse.json(
                { error: 'Replacement type and item ID are required' },
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
        if (claim.replacementItemId) {
            return NextResponse.json(
                { error: 'Replacement already provided for this claim' },
                { status: 400 }
            )
        }

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

        // Determine new status for replacement item
        const newStatus = replacementType === 'PERMANENT' ? 'WARRANTY_REPLACED' : 'LOANED'

        // Update replacement item with warranty transfer
        await prisma.inventoryItem.update({
            where: { id: replacementItemId },
            data: {
                status: newStatus,
                warrantyExpiry: originalWarrantyExpiry
            }
        })

        // Log replacement item status change
        await logUpdate('INVENTORY', replacementItemId, user.id, user.name,
            {
                status: 'AVAILABLE',
                warrantyExpiry: null,
                serialNumber: replacementItem.serialNumber
            },
            {
                status: newStatus,
                warrantyExpiry: originalWarrantyExpiry,
                reason: `${replacementType} warranty replacement for ${claim.inventoryItem.serialNumber}`
            }
        )

        // Update warranty claim
        const updatedClaim = await prisma.warrantyClaim.update({
            where: { id: claimId },
            data: {
                replacementType,
                replacementItemId,
                replacementProvidedAt: new Date(),
                status: 'IN_PROGRESS'
            },
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
                replacementItemId: null,
                status: claim.status
            },
            {
                replacementType,
                replacementItemId,
                replacementSerialNumber: replacementItem.serialNumber,
                replacementProductName: replacementItem.product.name,
                status: 'IN_PROGRESS',
                notes
            }
        )

        return NextResponse.json({
            claim: updatedClaim,
            replacementItem: {
                id: replacementItem.id,
                serialNumber: replacementItem.serialNumber,
                productName: replacementItem.product.name,
                status: newStatus,
                warrantyExpiry: originalWarrantyExpiry
            },
            originalWarrantyExpiry,
            message: `${replacementType} replacement provided successfully`
        })

    } catch (error: any) {
        console.error('Failed to provide replacement:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to provide replacement' },
            { status: 500 }
        )
    }
}
