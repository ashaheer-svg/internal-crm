import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> } // Correct way to type params in Next.js 15
) {
    try {
        const user = await requireAuth()
        const { id } = await params // Await params
        const body = await request.json()
        const { type, subject, content, outcome, followUpDate } = body

        if (!subject || !type) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const [activity] = await prisma.$transaction(async (tx) => {
            const newActivity = await tx.cRMActivity.create({
                data: {
                    projectId: id,
                    type,
                    subject,
                    content,
                    outcome,
                    createdById: user.id
                },
                include: {
                    createdBy: true
                }
            })

            if (followUpDate) {
                await tx.projectTask.create({
                    data: {
                        title: `Follow up: ${subject}`,
                        description: `Follow up task created from activity log.\n\nOriginal Activity: ${content}\nOutcome: ${outcome || 'N/A'}`,
                        status: 'TODO',
                        priority: 'MEDIUM',
                        dueDate: new Date(followUpDate),
                        projectId: id,
                        assignedToId: user.id,
                        createdById: user.id
                    }
                })
            }

            return [newActivity]
        })

        return NextResponse.json(activity)
    } catch (error: any) {
        console.error('Failed to create activity:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to create activity' },
            { status: 500 }
        )
    }
}
