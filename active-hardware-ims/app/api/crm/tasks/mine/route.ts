import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET() {
    try {
        const user = await requireAuth()
        const now = new Date()

        // Start of today (Local approximation or UTC)
        // Ideally we should handle timezones from client, but for now using server time
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)

        const tasks = await prisma.projectTask.findMany({
            where: {
                assignedToId: user.id,
                status: { not: 'DONE' },
                dueDate: { not: null }
            },
            include: {
                project: {
                    select: {
                        id: true,
                        title: true,
                        customer: { select: { name: true } }
                    }
                }
            },
            orderBy: { dueDate: 'asc' }
        })

        const overdue = tasks.filter(t => t.dueDate && new Date(t.dueDate) < startOfToday)
        const today = tasks.filter(t => t.dueDate && new Date(t.dueDate) >= startOfToday && new Date(t.dueDate) < endOfToday)

        return NextResponse.json({ overdue, today })
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to fetch tasks' },
            { status: 500 }
        )
    }
}
