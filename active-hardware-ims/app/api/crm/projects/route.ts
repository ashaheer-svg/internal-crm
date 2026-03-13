import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser, requireAuth } from '@/lib/auth'
import { getNextSequence } from '@/lib/sequences'

export async function GET(request: Request) {
    try {
        const user = await getCurrentUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { searchParams } = new URL(request.url)
        const page = Number(searchParams.get('page')) || 1
        const limit = Number(searchParams.get('limit')) || 10
        const search = searchParams.get('search') || ''
        
        const isLookup = searchParams.get('lookup') === 'true'
        
        if (isLookup && search.length < 2) {
            return NextResponse.json({ error: 'Search query must be at least 2 characters long' }, { status: 400 })
        }

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
        const canLookup = u.permissions?.includes('general_lookup:read')
        
        const canViewAll = u.permissions?.includes('all:manage') ||
            u.permissions?.includes('projects:manage') ||
            u.permissions?.includes('projects:view_all')

        const where: any = {
            isDeleted: false
        }

        // Broad access bypass only for Lookup page requests
        const bypassOwnership = isLookup && canLookup

        if ((!canViewAll || scope === 'mine') && !bypassOwnership) {
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

        // 1. Collect all unique Product IDs from all projects on the page
        const uniqueProductIds = new Set<string>()
        projectsRaw.forEach((p: any) => {
            const q = p.quotes.find((q: any) => q.status === 'ACCEPTED' || q.status === 'APPROVED' || q.deliveryOrder)
            q?.items.forEach((i: any) => {
                if (i.productId) uniqueProductIds.add(i.productId)
            })
        })

        const productIds = Array.from(uniqueProductIds)
        const costLookup: Record<string, number> = {}

        if (productIds.length > 0) {
            // 2. Batch Fetch Average Inventory Costs
            const avgInventoryCosts = await prisma.inventoryItem.groupBy({
                by: ['productId'],
                where: { productId: { in: productIds }, status: 'AVAILABLE' },
                _avg: { unitCost: true }
            })

            avgInventoryCosts.forEach(c => {
                if (c.productId && c._avg.unitCost !== null) {
                    costLookup[c.productId] = c._avg.unitCost
                }
            })

            // 3. Batch Fetch Latest PO Costs for products not in inventory lookup
            const missingCostProductIds = productIds.filter(id => costLookup[id] === undefined)
            if (missingCostProductIds.length > 0) {
                // Fetch latest PO item for each missing product
                // Note: Prisma findMany distinct/orderBy has limitations, so we use Promise.all for these specific IDs
                // On a single page, this is usually a small number of lookups
                const latestPOCosts = await Promise.all(missingCostProductIds.map(async (productId) => {
                    const lastPOItem = await prisma.purchaseOrderItem.findFirst({
                        where: { productId },
                        orderBy: { createdAt: 'desc' },
                        select: { productId: true, unitCost: true }
                    })
                    return lastPOItem
                }))

                latestPOCosts.forEach(p => {
                    if (p) costLookup[p.productId] = p.unitCost
                })
            }
        }

        // 4. Calculate Estimated GP for projects using the costLookup map
        const projects = projectsRaw.map((project: any) => {
            const acceptedQuote = project.quotes.find((q: any) => q.status === 'ACCEPTED' || q.status === 'APPROVED' || q.deliveryOrder)
            if (!acceptedQuote || !acceptedQuote.items.length) return project

            let totalEstimatedCost = 0
            for (const item of acceptedQuote.items) {
                if (!item.productId) continue
                const unitCost = costLookup[item.productId] || 0
                totalEstimatedCost += (unitCost * item.quantity)
            }

            const estimatedGP = acceptedQuote.subTotal - totalEstimatedCost
            const estimatedMargin = acceptedQuote.subTotal > 0 ? (estimatedGP / acceptedQuote.subTotal) * 100 : 0

            return {
                ...project,
                estimatedGP,
                estimatedMargin
            }
        })

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
        const { title, customerId, partnerId, salesRepId, expectedValue, currency, description, pipelineId, expectedCloseDate, projectCode, brand } = body

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

        // Generate from sequence
        const finalProjectCode = projectCode || await getNextSequence('PROJ', true)

        const project = await prisma.cRMProject.create({
            data: {
                projectCode: finalProjectCode,
                title,
                brand: brand || null,
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


