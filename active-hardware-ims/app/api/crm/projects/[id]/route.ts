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
                partner: true,
                salesRep: true,
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
        const user = await requireAuth()
        const body = await request.json()

        // Get before state
        const before = await prisma.cRMProject.findUnique({
            where: { id }
        })

        const project = await prisma.cRMProject.update({
            where: { id },
            data: body
        })

        // Audit Log
        const { logUpdate } = await import('@/lib/audit')
        await logUpdate('CRM_PROJECT', project.id, user.id, user.name, before, project)

        return NextResponse.json(project)
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to update project' },
            { status: 500 }
        )
    }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params;
    try {
        const user = await requireAuth()

        // Get before state
        const before = await prisma.cRMProject.findUnique({
            where: { id }
        })

        if (!before) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 })
        }

        // Soft delete
        const project = await prisma.cRMProject.update({
            where: { id },
            data: { isDeleted: true }
        })

        // Audit Log
        const { logDelete } = await import('@/lib/audit')
        await logDelete('CRM_PROJECT', project.id, user.id, user.name, before)

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to delete project' },
            { status: 500 }
        )
    }
}
