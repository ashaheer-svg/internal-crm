import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePermission } from '@/lib/auth'

export async function POST(req: Request) {
    try {
        const user = await requirePermission('crm:manage')
        const body = await req.json()
        const { action } = body

        // ── Action: UPLOAD (Batch Save to Queue) ───────────────────────────
        if (action === 'upload') {
            const { projects, pipelineId } = body
            if (!projects || !Array.isArray(projects)) {
                return NextResponse.json({ error: 'Invalid projects data' }, { status: 400 })
            }
            if (!pipelineId) {
                return NextResponse.json({ error: 'Pipeline ID is required' }, { status: 400 })
            }

            // Save to pending queue
            await prisma.pendingProjectImport.createMany({
                data: projects.map(p => ({
                    date: String(p.date),
                    customerName: p.customerName || 'Unknown',
                    partnerName: p.partnerName || null,
                    brand: p.brand || null,
                    salesRepName: p.salesRepName || null,
                    value: parseFloat(p.value) || 0,
                    stage: p.stage || 'Lead',
                    pipelineId,
                    uploadedById: user.id
                }))
            })

            return NextResponse.json({ success: true, message: `Queued ${projects.length} rows for processing.` })
        }

        // ── Action: PROCESS (Single Row Import) ───────────────────────────
        if (action === 'process') {
            const { rowId, entityMap, approved, editedData } = body

            if (!approved) {
                // If not approved, we just delete/skip it
                await prisma.pendingProjectImport.delete({ where: { id: rowId } })
                return NextResponse.json({ success: true, message: 'Row skipped/deleted.' })
            }

            const pending = await prisma.pendingProjectImport.findUnique({ where: { id: rowId } })
            if (!pending) return NextResponse.json({ error: 'Pending row not found' }, { status: 404 })

            // Use edited data if provided, else fallback to pending database record
            const dataToUse = {
                date: editedData?.date || pending.date,
                customerName: editedData?.customerName || pending.customerName,
                partnerName: editedData?.partnerName !== undefined ? editedData.partnerName : pending.partnerName,
                brand: editedData?.brand !== undefined ? editedData.brand : pending.brand,
                salesRepName: editedData?.salesRepName !== undefined ? editedData.salesRepName : pending.salesRepName,
                value: editedData?.value !== undefined ? parseFloat(editedData.value) : pending.value,
                stage: editedData?.stage || pending.stage,
                pipelineId: pending.pipelineId // Keep original pipeline
            }

            const stages = await prisma.cRMStage.findMany({
                where: { pipelineId: dataToUse.pipelineId },
                orderBy: { order: 'asc' }
            })

            const leadStage = stages.find(s => s.name.toUpperCase() === 'LEAD') || stages[0]
            const wonStage = stages.find(s => s.name.toUpperCase() === 'WON') || stages[stages.length - 2]

            const results = await prisma.$transaction(async (tx) => {
                // Customer Resolution
                const resolvedCustomer = entityMap?.[pending.customerName]
                let customerId = resolvedCustomer?.id
                if (!customerId || customerId === 'NEW' || customerId === 'SKIP') {
                    let customer = await tx.customer.findFirst({ where: { name: dataToUse.customerName } })
                    if (!customer) customer = await tx.customer.create({ data: { name: dataToUse.customerName, isCustomer: true } })
                    customerId = customer.id
                }

                // Partner Resolution
                let partnerId = null
                if (dataToUse.partnerName) {
                    const resolvedPartner = entityMap?.[pending.partnerName || '']
                    partnerId = resolvedPartner?.id || null
                    if (!partnerId || partnerId === 'NEW' || partnerId === 'SKIP') {
                        let partner = await tx.customer.findFirst({ where: { name: dataToUse.partnerName } })
                        if (!partner) partner = await tx.customer.create({ data: { name: dataToUse.partnerName, isPartner: true } })
                        partnerId = partner.id
                    }
                }

                // Sales Rep
                let salesRepId = null
                if (dataToUse.salesRepName) {
                    let salesRep = await tx.salesRep.findFirst({ where: { name: dataToUse.salesRepName } })
                    if (!salesRep) salesRep = await tx.salesRep.create({ data: { name: dataToUse.salesRepName } })
                    salesRepId = salesRep.id
                }

                const isWon = dataToUse.stage.toUpperCase() === 'WON'
                const stage = isWon ? wonStage : leadStage
                const status = isWon ? 'WON' : 'OPEN'
                const projectCode = `${dataToUse.stage.charAt(0)}-LEG-${Math.random().toString(36).substring(2, 6).toUpperCase()}`

                const project = await tx.cRMProject.create({
                    data: {
                        projectCode,
                        title: `Legacy: ${resolvedCustomer?.name || dataToUse.customerName}`,
                        brand: dataToUse.brand,
                        status,
                        probability: isWon ? 100 : 10,
                        expectedValue: dataToUse.value,
                        startDate: new Date(dataToUse.date),
                        expectedCloseDate: new Date(dataToUse.date),
                        closedAt: isWon ? new Date(dataToUse.date) : null,
                        stageId: stage.id,
                        pipelineId: dataToUse.pipelineId,
                        customerId,
                        partnerId,
                        salesRepId,
                        members: { create: { userId: user.id, role: 'OWNER' } }
                    } as any
                })

                // Delete from pending queue
                await tx.pendingProjectImport.delete({ where: { id: rowId } })

                return project
            })

            return NextResponse.json({ success: true, project: results })
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

    } catch (error: any) {
        console.error('Import error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// GET - Download CSV template OR Fetch Pending Queue
export async function GET(req: Request) {
    try {
        const user = await requirePermission('crm:manage')
        const { searchParams } = new URL(req.url)
        const type = searchParams.get('type')

        if (type === 'template') {
            const template = `date,customerName,partnerName,brand,salesRepName,stage,value
2024-01-15,Acme Corp,Global Solutions,Cisco,John Doe,WON,15000
2024-02-10,Beta Industries,Direct,Dell,Jane Smith,LEAD,5000
2024-03-05,Charlie LLC,Partner X,HP,Bob Wilson,WON,25000`

            return new NextResponse(template, {
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': 'attachment; filename="import_template.csv"'
                }
            })
        }

        // Default: Fetch Pending Queue
        const skip = parseInt(searchParams.get('skip') || '0')
        const take = parseInt(searchParams.get('take') || '10')

        const [pending, total] = await Promise.all([
            prisma.pendingProjectImport.findMany({
                where: { uploadedById: user.id },
                orderBy: { createdAt: 'desc' },
                skip,
                take
            }),
            prisma.pendingProjectImport.count({ where: { uploadedById: user.id } })
        ])

        return NextResponse.json({ pending, total })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

