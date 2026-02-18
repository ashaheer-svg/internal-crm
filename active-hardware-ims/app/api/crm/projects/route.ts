import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(request: Request) {
    try {
        await requireAuth()
        const { searchParams } = new URL(request.url)
        const page = Number(searchParams.get('page')) || 1
        const limit = Number(searchParams.get('limit')) || 10
        const search = searchParams.get('search') || ''
        const stageId = searchParams.get('stageId')
        const status = searchParams.get('status')

        const skip = (page - 1) * limit

        const where: any = {
            isDeleted: false
        }

        if (search) {
            where.OR = [
                { title: { contains: search } },
                { projectCode: { contains: search } },
                { customer: { name: { contains: search } } }
            ]
        }

        if (stageId && stageId !== 'ALL') where.stageId = stageId
        if (status && status !== 'ALL') where.status = status

        const [projects, total] = await prisma.$transaction([
            prisma.cRMProject.findMany({
                where,
                include: {
                    customer: true,
                    stage: true,
                    members: {
                        include: { user: true }
                    }
                },
                skip,
                take: limit,
                orderBy: { updatedAt: 'desc' }
            }),
            prisma.cRMProject.count({ where })
        ])

        return NextResponse.json({
            projects,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

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
                currency: currency || 'Rs.',
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
