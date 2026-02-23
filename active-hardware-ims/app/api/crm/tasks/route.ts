import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function POST(request: Request) {
    try {
        const user = await requireAuth()
        const body = await request.json()
        const { projectId, title, description, priority, dueDate, assignedToId, assignedToRoleId, attachmentUrl } = body

        if (!projectId || !title || !priority) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const task = await (prisma as any).projectTask.create({
            data: {
                projectId,
                title,
                description,
                priority,
                status: 'TODO',
                dueDate: dueDate ? new Date(dueDate) : null,
                assignedToId: assignedToId || null,
                assignedToRoleId: assignedToRoleId || null,
                attachmentUrl: attachmentUrl || null,
                createdById: user.id
            },
            include: {
                project: {
                    select: { title: true }
                }
            }
        })

        // Automated notification if assigned to a user
        if (assignedToId && assignedToId !== user.id) {
            await (prisma as any).message.create({
                data: {
                    subject: `New CRM Task: ${title}`,
                    content: `You have been assigned a new task in project "${task.project.title}":\n\n${title}${description ? `\n\n${description}` : ''}`,
                    category: 'TASK',
                    priority: priority as any,
                    senderId: user.id,
                    receipts: {
                        create: { userId: assignedToId }
                    }
                }
            })
        }

        // Automated notification if assigned to a role
        if (assignedToRoleId) {
            const usersInRole = await prisma.user.findMany({
                where: { roleId: assignedToRoleId, isActive: true },
                select: { id: true }
            })

            if (usersInRole.length > 0) {
                await (prisma as any).message.create({
                    data: {
                        subject: `New CRM Task for Category: ${title}`,
                        content: `A new task has been assigned to your category in project "${task.project.title}":\n\n${title}${description ? `\n\n${description}` : ''}`,
                        category: 'TASK',
                        priority: priority as any,
                        senderId: user.id,
                        recipientRoleId: assignedToRoleId,
                        receipts: {
                            createMany: {
                                data: usersInRole.map(u => ({ userId: u.id }))
                            }
                        }
                    }
                })
            }
        }

        return NextResponse.json(task)
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function PATCH(request: Request) {
    try {
        await requireAuth()
        const body = await request.json()
        const { id, status, priority, assignedToId, assignedToRoleId, attachmentUrl } = body

        if (!id) return NextResponse.json({ error: 'Task ID required' }, { status: 400 })

        const task = await (prisma as any).projectTask.update({
            where: { id },
            data: {
                status,
                priority,
                assignedToId: assignedToId || (assignedToId === null ? null : undefined),
                assignedToRoleId: assignedToRoleId || (assignedToRoleId === null ? null : undefined),
                attachmentUrl: attachmentUrl || (attachmentUrl === null ? null : undefined)
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
