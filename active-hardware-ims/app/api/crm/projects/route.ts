import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser, requireAuth } from '@/lib/auth'

export async function GET(request: Request) {
    try {
        const user = await getCurrentUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { searchParams } = new URL(request.url)
        const page = Number(searchParams.get('page')) || 1
        const limit = Number(searchParams.get('limit')) || 10
        const search = searchParams.get('search') || ''
        const sortKey = searchParams.get('sortKey') || 'projectCode'
        const sortDir = (searchParams.get('sortDir') || 'desc') as 'asc' | 'desc'
        const stageId = searchParams.get('stageId')
        const status = searchParams.get('status')
        const salesRepId = searchParams.get('salesRepId')
        const scope = searchParams.get('scope') || 'all'
        const doStatus = searchParams.get('doStatus') || null

        // New filters
        const hideWon = searchParams.get('hideWon') === 'true'
        const hideApproved = searchParams.get('hideApproved') === 'true'
        const hideShipped = searchParams.get('hideShipped') === 'true'

        const skip = (page - 1) * limit

        // ... existing permission logic ...
        const u = user as any
        const canViewAll = u.permissions?.includes('all:manage') ||
            u.permissions?.includes('projects:manage') ||
            u.permissions?.includes('projects:view_all')

        const where: any = {
            isDeleted: false
        }

        // ... existing filter logic ...
        if (!canViewAll || scope === 'mine') {
            const u = user as any
            if (u.salesRepId) {
                where.salesRepId = u.salesRepId
            } else {
                where.members = {
                    some: { userId: user.id }
                }
            }
        }

        if (search) {
            where.OR = [
                { title: { contains: search } },
                { projectCode: { contains: search } },
                { customer: { name: { contains: search } } },
                { partner: { name: { contains: search } } },
                { salesRep: { name: { contains: search } } }
            ]
        }

        if (stageId && stageId !== 'ALL') where.stageId = stageId
        if (status && status !== 'ALL') where.status = status
        if (salesRepId && salesRepId !== 'ALL') where.salesRepId = salesRepId

        if (hideWon) {
            where.status = { ...where.status, not: 'WON' }
        }

        if (hideApproved) {
            where.NOT = [
                ...(where.NOT || []),
                {
                    quotes: {
                        some: {
                            status: { in: ['APPROVED', 'ACCEPTED'] }
                        }
                    }
                }
            ]
        }

        if (hideShipped) {
            where.NOT = [
                ...(where.NOT || []),
                {
                    quotes: {
                        some: {
                            deliveryOrder: {
                                status: 'COMPLETED'
                            }
                        }
                    }
                }
            ]
        }

        if (doStatus) {
            where.quotes = {
                some: {
                    deliveryOrder: {
                        status: doStatus
                    }
                }
            }
        }

        // Construct orderBy
        let orderBy: any = { [sortKey]: sortDir }

        // Handle relation sorting if needed (Prisma 5+ supports some, but for simplicity let's handle common ones)
        if (sortKey === 'customer') orderBy = { customer: { name: sortDir } }
        if (sortKey === 'partner') orderBy = { partner: { name: sortDir } }
        if (sortKey === 'salesRep') orderBy = { salesRep: { name: sortDir } }
        if (sortKey === 'stage') orderBy = { stage: { name: sortDir } }
        if (sortKey === 'value') orderBy = { expectedValue: sortDir }
        if (sortKey === 'date') orderBy = { updatedAt: sortDir }

        const [projectsRaw, total] = await prisma.$transaction([
            (prisma as any).cRMProject.findMany({
                where,
                include: {
                    customer: true,
                    partner: true,
                    salesRep: true,
                    stage: true,
                    members: {
                        include: { user: true }
                    },
                    quotes: {
                        select: {
                            id: true,
                            status: true,
                            subTotal: true,
                            items: {
                                select: {
                                    productId: true,
                                    quantity: true
                                }
                            },
                            deliveryOrder: {
                                select: { status: true, orderNumber: true }
                            }
                        }
                    }
                },
                skip,
                take: limit,
                orderBy
            }),
            prisma.cRMProject.count({ where })
        ])

        // Calculate Estimated GP for projects with approved quotes
        const projects = await Promise.all(projectsRaw.map(async (project: any) => {
            const acceptedQuote = project.quotes.find((q: any) => q.status === 'ACCEPTED' || q.status === 'APPROVED')
            if (!acceptedQuote || !acceptedQuote.items.length) return project

            let totalEstimatedCost = 0
            for (const item of acceptedQuote.items) {
                if (!item.productId) continue

                // 1. Try average cost from inventory
                const avgInventoryCost = await prisma.inventoryItem.aggregate({
                    where: { productId: item.productId, status: 'AVAILABLE' },
                    _avg: { unitCost: true }
                })

                let unitCost = avgInventoryCost._avg.unitCost

                // 2. Fallback to latest purchase order cost
                if (!unitCost) {
                    const lastPOItem = await prisma.purchaseOrderItem.findFirst({
                        where: { productId: item.productId },
                        orderBy: { createdAt: 'desc' },
                        select: { unitCost: true }
                    })
                    unitCost = lastPOItem?.unitCost || 0
                }

                totalEstimatedCost += (unitCost * item.quantity)
            }

            const estimatedGP = acceptedQuote.subTotal - totalEstimatedCost
            const estimatedMargin = acceptedQuote.subTotal > 0 ? (estimatedGP / acceptedQuote.subTotal) * 100 : 0

            return {
                ...project,
                estimatedGP,
                estimatedMargin
            }
        }))

        return NextResponse.json({
            projects,
            canViewAll,
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


