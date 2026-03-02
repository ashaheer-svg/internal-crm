import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePermission } from '@/lib/auth'

export async function POST(req: Request) {
    try {
        const user = await requirePermission('crm:manage')
        const { projects, pipelineId, entityMap } = await req.json()

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
                    // ── Customer resolution ─────────────────────────────────────
                    // entityMap entries now carry real DB IDs (pre-created in wizard)
                    const resolvedCustomer = entityMap?.[item.customerName]
                    let customerId = resolvedCustomer?.id

                    if (!customerId || customerId === 'NEW' || customerId === 'SKIP') {
                        // Safety fallback: find by name or create
                        let customer = await tx.customer.findFirst({ where: { name: item.customerName } })
                        if (!customer) {
                            customer = await tx.customer.create({ data: { name: item.customerName, isCustomer: true } })
                        }
                        customerId = customer.id
                    }

                    // ── Partner resolution ──────────────────────────────────────
                    let partnerId: string | null = null
                    if (item.partnerName) {
                        const resolvedPartner = entityMap?.[item.partnerName]
                        partnerId = resolvedPartner?.id || null

                        if (!partnerId || partnerId === 'NEW' || partnerId === 'SKIP') {
                            let partner = await tx.customer.findFirst({ where: { name: item.partnerName } })
                            if (!partner) {
                                partner = await tx.customer.create({ data: { name: item.partnerName, isPartner: true } })
                            }
                            partnerId = partner.id
                        }
                    }

                    // ── Sales Rep ───────────────────────────────────────────────
                    let salesRepId = null
                    if (item.salesRepName) {
                        let salesRep = await tx.salesRep.findFirst({ where: { name: item.salesRepName } })
                        if (!salesRep) salesRep = await tx.salesRep.create({ data: { name: item.salesRepName } })
                        salesRepId = salesRep.id
                    }

                    // ── Stage + Status ──────────────────────────────────────────
                    const isWon = item.stage.toUpperCase() === 'WON'
                    const stage = isWon ? wonStage : leadStage
                    const status = isWon ? 'WON' : 'OPEN'
                    const probability = isWon ? 100 : 10
                    const closedAt = isWon ? new Date(item.date) : null
                    const projectCode = `${item.stage.charAt(0)}-LEG-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
                    const customerName = resolvedCustomer?.name || item.customerName

                    await tx.cRMProject.create({
                        data: {
                            projectCode,
                            title: `Legacy Import: ${customerName}`,
                            brand: item.brand || null,
                            status, probability,
                            expectedValue: item.value || 0,
                            startDate: new Date(item.date),
                            expectedCloseDate: new Date(item.date),
                            closedAt, stageId: stage.id, pipelineId,
                            customerId, partnerId, salesRepId,
                            members: { create: { userId: user.id, role: 'OWNER' } }
                        } as any
                    })

                    results.created++
                } catch (err) {
                    console.error("Failed to import project row:", err)
                    throw err
                }
            }
        }, { timeout: 120000 })


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

// GET - Download CSV template
export async function GET() {
    try {
        await requirePermission('crm:manage')

        const template = `date,customerName,partnerName,brand,salesRepName,stage,value
2024-01-15,Acme Corp,Global Solutions,Cisco,John Doe,WON,15000
2024-02-10,Beta Industries,Direct,Dell,Jane Smith,LEAD,5000
2024-03-05,Charlie LLC,Partner X,HP,Bob Wilson,WON,25000`

        return new NextResponse(template, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': 'attachment; filename="legacy_project_import_template.csv"'
            }
        })
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to download template' },
            { status: error.message === 'Forbidden' ? 403 : 500 }
        )
    }
}
