import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function POST(request: Request) {
    try {
        const user = await requireAuth()
        const body = await request.json()
        const { title, projectId, assignedToId, assignedToRoleId, dueDate, priority, description } = body

        if (!title || !projectId) {
            return NextResponse.json({ error: 'Title and Project ID are required' }, { status: 400 })
        }

        const task = await (prisma as any).projectTask.create({
            data: {
                title,
                description,
                projectId,
                status: 'TODO',
                priority: priority || 'MEDIUM',
                dueDate: dueDate ? new Date(dueDate) : null,
                assignedToId: assignedToId || null,
                assignedToRoleId: assignedToRoleId || null,
                createdById: user.id
            },
            include: {
                assignedTo: true,
                assignedToRole: true,
                createdBy: true
            }
        })

        // Create auto-notification message
        if (assignedToId || assignedToRoleId) {
            try {
                const message = await (prisma as any).message.create({
                    data: {
                        subject: `New Task Assigned: ${task.title}`,
                        content: `A new task has been assigned: ${task.title}${description ? `\n\nDescription: ${description}` : ''}\nPriority: ${priority || 'MEDIUM'}${dueDate ? `\nDue Date: ${new Date(dueDate).toLocaleString()}` : ''}`,
                        category: 'TASK',
                        priority: priority || 'MEDIUM',
                        deadline: dueDate ? new Date(dueDate) : null,
                        isSystemGenerated: true,
                        senderId: user.id,
                        recipientUserId: assignedToId || null,
                        recipientRoleId: assignedToRoleId || null
                    }
                })

                // Create receipts
                if (assignedToId) {
                    await (prisma as any).messageReceipt.create({
                        data: {
                            messageId: message.id,
                            userId: assignedToId
                        }
                    })
                } else if (assignedToRoleId) {
                    const usersInRole = await prisma.user.findMany({
                        where: { roleId: assignedToRoleId, isActive: true },
                        select: { id: true }
                    })
                    if (usersInRole.length > 0) {
                        await (prisma as any).messageReceipt.createMany({
                            data: usersInRole.map(u => ({
                                messageId: message.id,
                                userId: u.id
                            }))
                        })
                    }
                }
            } catch (msgError) {
                console.error('Failed to send auto-notification:', msgError)
            }
        }

        return NextResponse.json(task)
    } catch (error: any) {
        console.error('Failed to create task:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to create task' },
            { status: 500 }
        )
    }
}

export async function PATCH(request: Request) {
    try {
        await requireAuth()
        const body = await request.json()
        const { id, status, priority, assignedToId, assignedToRoleId } = body

        if (!id) return NextResponse.json({ error: 'Task ID required' }, { status: 400 })

        const task = await (prisma as any).projectTask.update({
            where: { id },
            data: {
                status,
                priority,
                assignedToId: assignedToId || (assignedToId === null ? null : undefined),
                assignedToRoleId: assignedToRoleId || (assignedToRoleId === null ? null : undefined)
            },
            include: {
                assignedTo: true,
                assignedToRole: true
            }
        })

        return NextResponse.json(task)
    } catch (error: any) {
        return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
    }
}
