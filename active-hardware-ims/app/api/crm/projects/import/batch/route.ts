import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePermission } from '@/lib/auth'

function parseDate(val: any): Date {
    if (!val) return new Date()
    const num = parseFloat(String(val))
    if (!isNaN(num) && num > 30000 && num < 100000) {
        return new Date((num - 25569) * 86400 * 1000)
    }
    const d = new Date(val)
    return isNaN(d.getTime()) ? new Date() : d
}

/**
 * POST /api/crm/projects/import/batch
 *
 * Accepts a resolved import payload and commits all projects in a single transaction.
 * Body: {
 *   pipelineId: string,
 *   rows: Array<{
 *     date: string,
 *     projectTitle: string,
 *     customerName: string,
 *     partnerName?: string,
 *     salesRepName?: string,
 *     stage: string,
 *     value: number
 *   }>,
 *   // Entity map: raw name -> resolved { id, name } or 'NEW' (create fresh)
 *   entityResolutions: Record<string, { id: string; name: string; type: 'CUSTOMER' | 'PARTNER' } | 'NEW'>
 * }
 */
export async function POST(req: Request) {
    try {
        const user = await requirePermission('crm:manage')
        const body = await req.json()
        type EntityResolution = { id: string; name: string; type: 'CUSTOMER' | 'PARTNER' } | 'NEW'
        const { pipelineId, rows } = body
        const entityResolutions = body.entityResolutions as Record<string, EntityResolution>

        if (!pipelineId || !rows || !Array.isArray(rows)) {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
        }

        // Load pipeline stages once
        const stages = await prisma.cRMStage.findMany({
            where: { pipelineId },
            orderBy: { order: 'asc' }
        })

        const findStage = (stageName: string) => {
            const upper = stageName?.toUpperCase() || ''
            return stages.find(s => s.name.toUpperCase() === upper)
                || (upper === 'WON' ? stages[stages.length - 2] : stages[0])
        }

        // Pre-resolve all unique entities upfront (create NEW ones once)
        // Maps raw name => real DB customer id
        const resolvedIdCache: Record<string, string> = {}

        await prisma.$transaction(async (tx) => {
            // First pass: resolve/create all entities
            for (const [rawName, resolutionRaw] of Object.entries(entityResolutions)) {
                const resolution = resolutionRaw as EntityResolution
                if (resolution === 'NEW') {
                    // Determine type from first row that uses this name
                    const asPartner = rows.some(r => r.partnerName === rawName)
                    const existing = await tx.customer.findFirst({
                        where: { name: { equals: rawName } }
                    })
                    if (existing) {
                        // Ensure correct flags
                        await tx.customer.update({
                            where: { id: existing.id },
                            data: {
                                isCustomer: existing.isCustomer || !asPartner,
                                isPartner: existing.isPartner || asPartner
                            }
                        })
                        resolvedIdCache[rawName] = existing.id
                    } else {
                        const created = await tx.customer.create({
                            data: {
                                name: rawName,
                                isCustomer: !asPartner,
                                isPartner: asPartner
                            }
                        })
                        resolvedIdCache[rawName] = created.id
                    }
                } else {
                    // Resolved to an existing record
                    const res = resolution as { id: string; name: string; type: 'CUSTOMER' | 'PARTNER' }
                    const asPartner = res.type === 'PARTNER'
                    await tx.customer.update({
                        where: { id: res.id },
                        data: {
                            isCustomer: !asPartner || undefined,
                            isPartner: asPartner || undefined
                        }
                    }).catch(() => { /* ignore if already set */ })
                    resolvedIdCache[rawName] = res.id
                }
            }

            // Second pass: create all projects
            for (const row of rows) {
                const customerId = resolvedIdCache[row.customerName]
                if (!customerId) continue // skip if entity failed

                const partnerId = row.partnerName ? resolvedIdCache[row.partnerName] || null : null

                // Resolve SalesRep by exact name (auto-create if new)
                let salesRepId: string | null = null
                if (row.salesRepName?.trim()) {
                    let rep = await tx.salesRep.findFirst({
                        where: { name: { equals: row.salesRepName.trim() } }
                    })
                    if (!rep) {
                        rep = await tx.salesRep.create({ data: { name: row.salesRepName.trim() } })
                    }
                    salesRepId = rep.id
                }

                const stage = findStage(row.stage || 'Lead')
                const isWon = (row.stage || '').toUpperCase() === 'WON'
                const activeDate = parseDate(row.date)
                const projectCode = `LEG-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`

                await tx.cRMProject.create({
                    data: {
                        projectCode,
                        title: row.projectTitle || `Legacy: ${row.customerName}`,
                        status: isWon ? 'WON' : 'OPEN',
                        probability: isWon ? 100 : 10,
                        expectedValue: parseFloat(row.value as any) || 0,
                        startDate: activeDate,
                        expectedCloseDate: activeDate,
                        closedAt: isWon ? activeDate : null,
                        stageId: stage.id,
                        pipelineId,
                        customerId,
                        partnerId,
                        salesRepId,
                        members: { create: { userId: user.id, role: 'OWNER' } }
                    } as any
                })
            }
        }, { timeout: 60000 })

        return NextResponse.json({ success: true, count: rows.length })

    } catch (error: any) {
        console.error('Batch import error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
