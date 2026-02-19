import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

interface RouteParams {
    params: {
        id: string
    }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params;

    try {
        const user = await requireAuth()
        const body = await request.json()
        const { stageId } = body

        if (!stageId) {
            return NextResponse.json({ error: 'Stage ID is required' }, { status: 400 })
        }

        // Verify project existence and get current stage
        const project = await prisma.cRMProject.findUnique({
            where: { id },
            include: { stage: true }
        })

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 })
        }

        // Get new stage name
        const newStage = await prisma.cRMStage.findUnique({
            where: { id: stageId }
        })

        if (!newStage) {
            return NextResponse.json({ error: 'Target stage not found' }, { status: 404 })
        }

        // Update the project stage
        const updatedProject = await prisma.cRMProject.update({
            where: { id },
            data: {
                stageId
            }
        })

        // Log system activity
        if (project.stageId !== stageId) {
            await prisma.cRMActivity.create({
                data: {
                    projectId: id,
                    type: 'SYSTEM',
                    subject: 'Stage Changed',
                    content: `Project moved from ${project.stage.name} to ${newStage.name}`,
                    createdById: user.id
                }
            })
        }

        return NextResponse.json(updatedProject)

    } catch (error: any) {
        console.error('Failed to move project:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to move project' },
            { status: 500 }
        )
    }
}
