import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { logUpdate } from '@/lib/audit'

export async function PATCH(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const user = await requireAuth()
        const { id: messageId } = await context.params
        const body = await request.json()
        const { action, comment } = body // action: 'read' | 'done'

        if (action === 'read') {
            await prisma.messageReceipt.upsert({
                where: {
                    messageId_userId: { messageId, userId: user.id }
                },
                update: {
                    viewedAt: new Date()
                },
                create: {
                    messageId,
                    userId: user.id,
                    viewedAt: new Date()
                }
            })
        } else if (action === 'done') {
            if (!comment) {
                return NextResponse.json({ error: 'Comment is required when marking as done' }, { status: 400 })
            }

            // Allow marking done even if it wasn't pre-populated (e.g. for Role messages)
            await prisma.messageReceipt.upsert({
                where: {
                    messageId_userId: { messageId, userId: user.id }
                },
                update: {
                    isDone: true,
                    doneAt: new Date(),
                    comment
                },
                create: {
                    messageId,
                    userId: user.id,
                    isDone: true,
                    doneAt: new Date(),
                    comment
                }
            })

            // Audit Log
            await logUpdate('MESSAGE', messageId, user.id, (user as any).name, { status: 'PENDING' }, { status: 'DONE', comment })
        } else {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Update receipt error:', error)
        return NextResponse.json({ error: error.message || 'Failed to update receipt' }, { status: 500 })
    }
}
