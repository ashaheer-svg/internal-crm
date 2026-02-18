import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function POST(request: Request) {
    try {
        const user = await requireAuth()
        const body = await request.json()
        const { title, projectId, assignedToId, dueDate, priority, description } = body

        if (!title || !projectId) {
            return NextResponse.json({ error: 'Title and Project ID are required' }, { status: 400 })
        }

        const task = await prisma.projectTask.create({
            data: {
                title,
                description,
                projectId,
                status: 'TODO',
                priority: priority || 'MEDIUM',
                dueDate: dueDate ? new Date(dueDate) : null,
                assignedToId,
                createdById: user.id
            },
            include: {
                assignedTo: true,
                createdBy: true
            }
        })

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
        const { id, status, priority, assignedToId } = body

        if (!id) return NextResponse.json({ error: 'Task ID required' }, { status: 400 })

        const task = await prisma.projectTask.update({
            where: { id },
            data: {
                status,
                priority,
                assignedToId
            },
            include: {
                assignedTo: true
            }
        })

        return NextResponse.json(task)
    } catch (error: any) {
        return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
    }
}
