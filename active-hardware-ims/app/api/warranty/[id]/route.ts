import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

interface RouteParams {
    params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteParams) {
    try {
        const { id } = await params

        const claim = await prisma.warrantyClaim.findUnique({
            where: { id },
            include: {
                inventoryItem: {
                    include: {
                        product: true,
                        location: true
                    }
                }
            }
        })

        if (!claim) {
            return NextResponse.json({ error: 'Warranty claim not found' }, { status: 404 })
        }

        // If there's a replacement, fetch its details
        let replacementItemDetails = null
        if (claim.replacementItemId) {
            replacementItemDetails = await prisma.inventoryItem.findUnique({
                where: { id: claim.replacementItemId },
                include: {
                    product: true,
                    location: true
                }
            })
        }

        return NextResponse.json({
            ...claim,
            replacementItemDetails
        })
    } catch (error) {
        console.error('Failed to fetch warranty claim:', error)
        return NextResponse.json({ error: 'Failed to fetch warranty claim' }, { status: 500 })
    }
}

export async function PATCH(request: Request, { params }: RouteParams) {
    try {
        const { id } = await params
        const body = await request.json()
        const { status, resolution, notes } = body

        // Get current claim for audit logging
        const currentClaim = await prisma.warrantyClaim.findUnique({
            where: { id }
        })

        if (!currentClaim) {
            return NextResponse.json({ error: 'Warranty claim not found' }, { status: 404 })
        }

        // Validate status
        const validStatuses = ['PENDING', 'IN_PROGRESS', 'AWAITING_SUPPLIER', 'RESOLVED', 'CLOSED']
        if (status && !validStatuses.includes(status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
        }

        // Prepare update data
        const updateData: any = {}
        if (status) updateData.status = status
        if (resolution !== undefined) updateData.resolution = resolution

        // If resolving, set resolved timestamp (requires auth for resolvedBy)
        if (status === 'RESOLVED' || status === 'CLOSED') {
            updateData.resolvedAt = new Date()
            // Note: resolvedBy would require auth, skipping for now
        }

        const claim = await prisma.warrantyClaim.update({
            where: { id },
            data: updateData,
            include: {
                inventoryItem: {
                    include: {
                        product: true,
                        location: true
                    }
                }
            }
        })

        return NextResponse.json(claim)
    } catch (error) {
        console.error('Failed to update warranty claim:', error)
        return NextResponse.json({ error: 'Failed to update warranty claim' }, { status: 500 })
    }
}

export async function DELETE(request: Request, { params }: RouteParams) {
    try {
        const { id } = await params

        await prisma.warrantyClaim.delete({
            where: { id }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Failed to delete warranty claim:', error)
        return NextResponse.json({ error: 'Failed to delete warranty claim' }, { status: 500 })
    }
}
