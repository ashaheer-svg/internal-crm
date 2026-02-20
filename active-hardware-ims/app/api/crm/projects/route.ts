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
        const salesRepId = searchParams.get('salesRepId')

        const skip = (page - 1) * limit

        const where: any = {
            isDeleted: false
        }

        if (search) {
            where.OR = [
                { title: { contains: search } },
                { projectCode: { contains: search } },
                { customer: { name: { contains: search } } },
                { salesRep: { name: { contains: search } } }
            ]
        }

        if (stageId && stageId !== 'ALL') where.stageId = stageId
        if (status && status !== 'ALL') where.status = status
        if (salesRepId && salesRepId !== 'ALL') where.salesRepId = salesRepId

        const [projects, total] = await prisma.$transaction([
            prisma.cRMProject.findMany({
                where,
                include: {
                    customer: true,
                    partner: true,
                    salesRep: true,
                    stage: true,
                    members: {
                        include: { user: true }
                    }
                },
                skip,
                take: limit,
                orderBy: { projectCode: 'desc' }
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
        const { title, customerId, partnerId, salesRepId, expectedValue, currency, description, pipelineId, expectedCloseDate, projectCode } = body

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

        let finalProjectCode = projectCode

        if (!finalProjectCode) {
            // Fallback if not provided (though UI should provide it)
            const dateStr = new Date().toISOString().slice(2, 7).replace('-', '')
            const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
            finalProjectCode = `PRJ-${dateStr}-${random}`
        }

        // Ensure uniqueness check if needed, but Prisma will throw if duplicate

        const project = await prisma.cRMProject.create({
            data: {
                projectCode: finalProjectCode,
                title,
                customerId,
                partnerId: partnerId || null,
                salesRepId: salesRepId || null,
                pipelineId,
                stageId: firstStage.id,
                expectedValue: Number(expectedValue) || 0,
                currency: currency || 'Rs.',
                expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null,
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

        // Increment Sequence if successful and it matches PROJ pattern
        if (finalProjectCode.startsWith('PROJ-')) {
            // We blindly increment because we assume the user used the fetching logic
            // Ideal check: if the code matches the current sequence pattern
            const currentYearMonth = finalProjectCode.split('-')[1] // e.g. 2402
            const numberPart = parseInt(finalProjectCode.split('-')[2]) // e.g. 0001

            if (currentYearMonth && !isNaN(numberPart)) {
                await prisma.sequence.upsert({
                    where: { id: 'PROJ' },
                    create: { id: 'PROJ', prefix: 'PROJ-', nextNumber: numberPart + 1, lastYearMonth: currentYearMonth },
                    update: { nextNumber: numberPart + 1, lastYearMonth: currentYearMonth }
                })
            }
        }

        // Audit Log
        const { logCreate } = await import('@/lib/audit') // Dynamic import to avoid circular dep if any
        await logCreate('CRM_PROJECT', project.id, user.id, user.name, {
            projectCode: project.projectCode,
            title: project.title,
            customerId: project.customerId,
            pipelineId: project.pipelineId,
            expectedValue: project.expectedValue
        })

        return NextResponse.json(project)

    } catch (error: any) {
        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'Project Code already exists. Please refresh to get a new code.' }, { status: 400 })
        }
        console.error('Failed to create project:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to create project' },
            { status: 500 }
        )
    }
}


