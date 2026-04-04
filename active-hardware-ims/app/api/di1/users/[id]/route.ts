import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePermission } from '@/lib/auth'

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        await requirePermission('settings:manage')
        const { id } = await context.params

        if (!id) {
            return NextResponse.json({ error: 'Missing User ID' }, { status: 400 })
        }

        const targetUser = await prisma.user.findUnique({
            where: { id },
            include: {
                projectMemberships: { take: 1 },
                assignedTasks: { take: 1 },
                createdQuotes: { take: 1 }
            }
        })

        if (!targetUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        if (targetUser.isActive) {
            return NextResponse.json({ error: 'Cannot delete active users. Deactivate them first.' }, { status: 400 })
        }

        // --- Data Integrity Safeguard ---
        const hasBusinessData = targetUser.projectMemberships.length > 0 || 
                               targetUser.assignedTasks.length > 0 || 
                               targetUser.createdQuotes.length > 0

        if (hasBusinessData) {
            return NextResponse.json({ 
                error: 'Cannot delete user with assigned records (Projects, Tasks, Quotes). Please use the "Transfer Records" feature in Settings to reassign their data first.' 
            }, { status: 409 }) // Conflict
        }

        // --- Safe Pure Deletion Execution ---
        await prisma.$transaction(async (tx) => {
            // 1. Delete associated log entries and receipts that don't Cascade
            await tx.auditLog.deleteMany({
                where: { userId: id }
            })

            await tx.messageReceipt.deleteMany({
                where: { userId: id }
            })

            // 2. Wipe messaging records tied to them
            await tx.message.deleteMany({
                where: { OR: [{ senderId: id }, { recipientUserId: id }] }
            })

            // 3. Delete the User row itself (Sessions will Cascade Delete)
            await tx.user.delete({
                where: { id }
            })
        })

        return NextResponse.json({ success: true, message: 'Inactive user purged successfully' })

    } catch (error: any) {
        console.error('User delete error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to purge user' },
            { status: error.message === 'Forbidden' ? 403 : 500 }
        )
    }
}
