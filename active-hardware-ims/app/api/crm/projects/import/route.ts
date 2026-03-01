import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePermission } from '@/lib/auth'

export async function POST(req: Request) {
    try {
        const user = await requirePermission('crm:manage')
        const { projects, pipelineId } = await req.json()

        if (!projects || !Array.isArray(projects)) {
            return NextResponse.json({ error: 'Invalid projects data' }, { status: 400 })
        }

        if (!pipelineId) {
            return NextResponse.json({ error: 'Pipeline ID is required' }, { status: 400 })
        }

        // 1. Get Pipeline Stages for mapping
        const stages = await prisma.cRMStage.findMany({
            where: { pipelineId },
            orderBy: { order: 'asc' }
        })

        const leadStage = stages.find(s => s.name.toUpperCase() === 'LEAD') || stages[0]
        const wonStage = stages.find(s => s.name.toUpperCase() === 'WON') || stages[stages.length - 2] // Fallback to second last or lead

        const results = {
            created: 0,
            skipped: 0,
            errors: 0
        }

        // 2. Process in a Transaction
        await prisma.$transaction(async (tx) => {
            for (const item of projects) {
                try {
                    // Find or create Customer
                    let customer = await tx.customer.findFirst({
                        where: { name: item.customerName }
                    })

                    if (!customer) {
                        customer = await tx.customer.create({
                            data: {
                                name: item.customerName,
                                isCustomer: true
                            }
                        })
                    }

                    // Find or create Partner (if provided)
                    let partnerId = null
                    if (item.partnerName) {
                        let partner = await tx.customer.findFirst({
                            where: { name: item.partnerName }
                        })

                        if (!partner) {
                            partner = await tx.customer.create({
                                data: {
                                    name: item.partnerName,
                                    isPartner: true
                                }
                            })
                        }
                        partnerId = partner.id
                    }

                    // Find or create Sales Rep
                    let salesRepId = null
                    if (item.salesRepName) {
                        let salesRep = await tx.salesRep.findFirst({
                            where: { name: item.salesRepName }
                        })

                        if (!salesRep) {
                            salesRep = await tx.salesRep.create({
                                data: { name: item.salesRepName }
                            })
                        }
                        salesRepId = salesRep.id
                    }

                    // Determine Stage and Status
                    const isWon = item.stage.toUpperCase() === 'WON'
                    const stage = isWon ? wonStage : leadStage
                    const status = isWon ? 'WON' : 'OPEN'
                    const probability = isWon ? 100 : 10
                    const closedAt = isWon ? new Date(item.date) : null

                    // Generate Unique Project Code (P-LEGACY-XXXX)
                    const projectCode = `${item.stage.charAt(0)}-LEG-${Math.random().toString(36).substring(2, 6).toUpperCase()}`

                    // Create Project
                    await tx.cRMProject.create({
                        data: {
                            projectCode,
                            title: `Legacy Import: ${item.customerName}`,
                            brand: item.brand,
                            status,
                            probability,
                            expectedValue: item.value || 0,
                            startDate: new Date(item.date),
                            expectedCloseDate: new Date(item.date), // Fallback to provided date
                            closedAt,
                            stageId: stage.id,
                            pipelineId,
                            customerId: customer.id,
                            partnerId,
                            salesRepId,
                            createdById: user.id
                        }
                    })

                    results.created++
                } catch (err) {
                    console.error("Failed to import individual project:", err)
                    throw err // Rollback
                }
            }
        }, {
            timeout: 30000 // Increase timeout for bulk import
        })

        return NextResponse.json({
            success: true,
            message: `Successfully imported ${results.created} legacy projects.`,
            details: results
        })

    } catch (error: any) {
        console.error('Legacy project import error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to import legacy projects' },
            { status: 500 }
        )
    }
}
