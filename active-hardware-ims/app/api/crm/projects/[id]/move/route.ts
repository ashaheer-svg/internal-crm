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

        // Verify project existence
        const project = await prisma.cRMProject.findUnique({
            where: { id }
        })

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 })
        }

        // Update the project stage
        const updatedProject = await prisma.cRMProject.update({
            where: { id },
            data: {
                stageId
            }
        })

        // Log activity (Optional but recommended)
        // await logActivity(...) 

        return NextResponse.json(updatedProject)

    } catch (error: any) {
        console.error('Failed to move project:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to move project' },
            { status: 500 }
        )
    }
}
