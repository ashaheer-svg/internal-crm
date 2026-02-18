import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

interface RouteParams {
    params: {
        id: string
    }
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params;
    try {
        await requireAuth()

        const project = await prisma.cRMProject.findUnique({
            where: { id },
            include: {
                customer: true,
                stage: true,
                pipeline: {
                    include: {
                        stages: {
                            orderBy: { order: 'asc' }
                        }
                    }
                },
                members: {
                    include: { user: true }
                },
                activities: {
                    orderBy: { createdAt: 'desc' },
                    include: { createdBy: true }
                },
                quotes: {
                    orderBy: { createdAt: 'desc' }
                },
                tasks: {
                    orderBy: { createdAt: 'asc' }, // overdue first
                    include: { assignedTo: true }
                }
            }
        })

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 })
        }

        return NextResponse.json(project)

    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to fetch project' },
            { status: 500 }
        )
    }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params;
    try {
        await requireAuth()
        const body = await request.json()

        const project = await prisma.cRMProject.update({
            where: { id },
            data: body
        })

        return NextResponse.json(project)
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to update project' },
            { status: 500 }
        )
    }
}
