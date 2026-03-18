import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePermission } from '@/lib/auth'

interface RouteParams {
    params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteParams) {
    try {
        await requirePermission('warranty_rma:read')
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
        await requirePermission('warranty_rma:update')
        const { id } = await params
        const body = await request.json()
        const { status, resolution, notes, customerName, description, inventoryItemId } = body

        // Get current claim for audit logging
        const currentClaim = await prisma.warrantyClaim.findUnique({
            where: { id }
        })

        if (!currentClaim) {
            return NextResponse.json({ error: 'Warranty claim not found' }, { status: 404 })
        }

        // Validate status
        const validStatuses = ['PENDING', 'IN_PROGRESS', 'AWAITING_SUPPLIER', 'SUPPLIER_RMA_OPEN', 'SUPPLIER_RMA_RESOLVED', 'RESOLVED', 'CLOSED']
        if (status && !validStatuses.includes(status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
        }

        // Prepare update data
        const updateData: any = {}
        if (status) updateData.status = status
        if (resolution !== undefined) updateData.resolution = resolution
        if (customerName) updateData.customerName = customerName
        if (description) updateData.description = description

        // Validate and update inventory item if provided
        if (inventoryItemId && inventoryItemId !== currentClaim.inventoryItemId) {
            const inventoryItem = await prisma.inventoryItem.findUnique({
                where: { id: inventoryItemId }
            })

            if (!inventoryItem) {
                return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 })
            }

            // 1. Revert old item status to SOLD and clear claim back-link
            await prisma.inventoryItem.update({
                where: { id: currentClaim.inventoryItemId },
                data: { 
                    status: 'SOLD',
                    warrantyClaimId: null
                }
            })

            // 2. Set new item status to RMA_DEFECTIVE_RECEIVED and link to this claim
            await prisma.inventoryItem.update({
                where: { id: inventoryItemId },
                data: { 
                    status: 'RMA_DEFECTIVE_RECEIVED',
                    warrantyClaimId: id
                }
            })

            updateData.inventoryItemId = inventoryItemId
        }

        // If resolving, set resolved timestamp and user
        const userAction = await requirePermission('warranty_rma:update') // re-fetch for safety or use line 54
        const user = userAction // from line 54: use existing user const if declared inside function scope

        if (status === 'RESOLVED' || status === 'CLOSED') {
            updateData.resolvedAt = new Date()
            updateData.resolvedById = user.id
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
        await requirePermission('warranty_rma:delete')
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
