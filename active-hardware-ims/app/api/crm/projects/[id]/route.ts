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

        const projectRaw = await (prisma as any).cRMProject.findUnique({
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
                    orderBy: { createdAt: 'desc' },
                    include: {
                        deliveryOrder: true,
                        items: {
                            select: {
                                productId: true,
                                quantity: true
                            }
                        }
                    }
                },
                tasks: {
                    orderBy: { createdAt: 'asc' }, // overdue first
                    include: {
                        assignedTo: true,
                        assignedToRole: true
                    }
                }
            }
        })

        if (!projectRaw) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 })
        }

        // Calculate Estimated GP
        const acceptedQuote = projectRaw.quotes.find((q: any) => q.status === 'ACCEPTED' || q.status === 'APPROVED' || q.deliveryOrder)
        let estimatedGP = undefined
        let estimatedMargin = undefined

        if (acceptedQuote && acceptedQuote.items.length) {
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

            estimatedGP = acceptedQuote.subTotal - totalEstimatedCost
            estimatedMargin = acceptedQuote.subTotal > 0 ? (estimatedGP / acceptedQuote.subTotal) * 100 : 0
        }

        const project = {
            ...projectRaw,
            estimatedGP,
            estimatedMargin
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
