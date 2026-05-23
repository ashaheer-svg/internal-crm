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

            // Fetch the message and check if it has an associated projectTaskId
            const message = await (prisma as any).message.findUnique({
                where: { id: messageId },
                include: {
                    projectTask: {
                        include: {
                            project: {
                                include: {
                                    customer: true
                                }
                            },
                            createdBy: true
                        }
                    }
                }
            })

            if (message?.projectTaskId && message.projectTask) {
                const task = message.projectTask

                // 1. Sync ProjectTask status
                await (prisma as any).projectTask.update({
                    where: { id: task.id },
                    data: { status: 'DONE' }
                })

                // 2. Notify the task creator (if different from the person completing it)
                if (task.createdById !== user.id) {
                    await (prisma as any).message.create({
                        data: {
                            subject: `Task Completed: ${task.title}`,
                            content: `${(user as any).name || 'An assignee'} has completed the task "${task.title}" in project "${task.project.title}".\n\nResolution comment:\n${comment}`,
                            category: 'UPDATE',
                            priority: 'MEDIUM',
                            senderId: user.id,
                            customerName: task.project.customer?.name ?? null,
                            receipts: {
                                create: { userId: task.createdById }
                            }
                        }
                    })
                }
            }

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
