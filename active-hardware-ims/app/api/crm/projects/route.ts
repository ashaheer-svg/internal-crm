import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function POST(request: Request) {
    try {
        const user = await requireAuth()
        const body = await request.json()
        const { title, customerId, expectedValue, currency, description, pipelineId } = body

        if (!title || !customerId || !pipelineId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Find the first stage of the pipeline to set as default
        const firstStage = await prisma.cRMStage.findFirst({
            where: { pipelineId },
            orderBy: { order: 'asc' }
        })

        if (!firstStage) {
            return NextResponse.json({ error: 'Pipeline has no stages' }, { status: 400 })
        }

        // Generate a project code (Simple auto-increment simulated or random for now)
        // In production, use a Sequence table.
        const dateStr = new Date().toISOString().slice(2, 7).replace('-', '')
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
        const projectCode = `PRJ-${dateStr}-${random}`

        const project = await prisma.cRMProject.create({
            data: {
                projectCode,
                title,
                customerId,
                pipelineId,
                stageId: firstStage.id,
                expectedValue: Number(expectedValue) || 0,
                currency: currency || 'INR',
                description,
                status: 'OPEN',
                members: {
                    create: {
                        userId: user.id,
                        role: 'OWNER'
                    }
                }
            }
        })

        return NextResponse.json(project)

    } catch (error: any) {
        console.error('Failed to create project:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to create project' },
            { status: 500 }
        )
    }
}
