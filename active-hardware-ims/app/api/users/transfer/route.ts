import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePermission } from '@/lib/auth'

export async function POST(request: Request) {
    try {
        await requirePermission('settings:manage')

        const body = await request.json()
        const { fromUserId, toUserId } = body

        if (!fromUserId || !toUserId) {
            return NextResponse.json({ error: 'Missing fromUserId or toUserId' }, { status: 400 })
        }

        if (fromUserId === toUserId) {
            return NextResponse.json({ error: 'Cannot transfer records to the same user' }, { status: 400 })
        }

        // 1. Fetch users inclusive of SalesRep
        const fromUser = await prisma.user.findUnique({
            where: { id: fromUserId },
            select: { salesRepId: true }
        })

        const toUser = await prisma.user.findUnique({
            where: { id: toUserId },
            select: { salesRepId: true }
        })

        if (!fromUser || !toUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        // --- Data Integrity Constraint ---
        if (fromUser.salesRepId && !toUser.salesRepId) {
            return NextResponse.json({ 
                error: 'Target user is not a Sales Rep. Please configure a Sales Rep profile for them first to enable Client & Project transfers.' 
            }, { status: 400 })
        }

        // 2. Run Atomic Transaction Update
        await prisma.$transaction(async (tx) => {
            
            // --- A. Project Members Deduplication ---
            // Find projects where BOTH users are members.
            const fromMembers = await tx.projectMember.findMany({ where: { userId: fromUserId } })
            const toMembers = await tx.projectMember.findMany({ where: { userId: toUserId } })
            
            const toProjectIds = new Set(toMembers.map(m => m.projectId))
            const overlappingProjectIds = fromMembers.map(m => m.projectId).filter(id => toProjectIds.has(id))

            if (overlappingProjectIds.length > 0) {
                // Delete fromUser from overlapping projects to prevent uniqueness constraint crashes on updateMany
                await tx.projectMember.deleteMany({
                    where: { userId: fromUserId, projectId: { in: overlappingProjectIds } }
                })
            }

            // --- B. Standard Foreign Key Migrations ---
            await tx.projectMember.updateMany({
                where: { userId: fromUserId },
                data: { userId: toUserId }
            })

            await tx.cRMQuote.updateMany({
                where: { createdById: fromUserId },
                data: { createdById: toUserId }
            })

            await tx.cRMActivity.updateMany({
                where: { createdById: fromUserId },
                data: { createdById: toUserId }
            })

            await tx.projectTask.updateMany({
                where: { createdById: fromUserId },
                data: { createdById: toUserId }
            })

            await tx.projectTask.updateMany({
                where: { assignedToId: fromUserId },
                data: { assignedToId: toUserId }
            })

            await tx.deliveryOrder.updateMany({
                where: { builtById: fromUserId },
                data: { builtById: toUserId }
            })

            // --- C. Sales Rep Relation Overlays ---
            if (fromUser.salesRepId && toUser.salesRepId) {
                await tx.customer.updateMany({
                    where: { salesRepId: fromUser.salesRepId },
                    data: { salesRepId: toUser.salesRepId }
                })

                await tx.cRMProject.updateMany({
                    where: { salesRepId: fromUser.salesRepId },
                    data: { salesRepId: toUser.salesRepId }
                })
            }

            // Optional: Log Audit Event
            const { logUpdate } = await import('@/lib/audit')
            // Add a mock log or trigger standard update logging securely
        })

        return NextResponse.json({ success: true, message: 'User records transferred successfully' })

    } catch (error: any) {
        console.error('User transfer error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to transfer user records' },
            { status: error.message === 'Forbidden' ? 403 : 500 }
        )
    }
}
