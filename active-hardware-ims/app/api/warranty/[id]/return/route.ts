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
        if (claim.replacementType !== 'TEMPORARY') {
            return NextResponse.json(
                { error: 'Can only return temporary replacements' },
                { status: 400 }
            )
        }

        // Check if replacement was provided
        if (!claim.replacementItemId && !claim.replacementExternalInfo) {
            return NextResponse.json(
                { error: 'No replacement was provided for this claim' },
                { status: 400 }
            )
        }

        // Check if already returned
        if (claim.replacementReturnedAt) {
            return NextResponse.json(
                { error: 'Replacement already returned' },
                { status: 400 }
            )
        }

        // Handle Tracked Replacement Return
        if (claim.replacementItemId) {
            // Get replacement item
            const replacementItem = await prisma.inventoryItem.findUnique({
                where: { id: claim.replacementItemId },
                include: { product: true }
            })

            if (!replacementItem) {
                return NextResponse.json({ error: 'Replacement item not found' }, { status: 404 })
            }

            // Return replacement item to available status
            await prisma.inventoryItem.update({
                where: { id: claim.replacementItemId },
                data: {
                    status: 'AVAILABLE',
                    warrantyExpiry: null // Clear warranty since it's back in stock
                }
            })

            // Log replacement item status change
            await logUpdate('INVENTORY', claim.replacementItemId, user.id, user.name,
                {
                    status: 'LOANED',
                    warrantyExpiry: claim.inventoryItem.warrantyExpiry,
                    serialNumber: replacementItem.serialNumber
                },
                {
                    status: 'AVAILABLE',
                    warrantyExpiry: null,
                    reason: `Temporary replacement returned for claim ${claimId}`
                }
            )
        }

        // Update warranty claim (common for both tracked and untracked)
        const updatedClaim = await prisma.warrantyClaim.update({
            where: { id: claimId },
            data: {
                replacementReturnedAt: new Date()
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
                replacementReturnedAt: null
            },
            {
                replacementReturnedAt: new Date(),
                notes: notes || (claim.replacementExternalInfo ? `Untracked unit (${claim.replacementExternalInfo}) returned` : 'Replacement returned')
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
