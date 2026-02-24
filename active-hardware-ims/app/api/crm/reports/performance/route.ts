import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePermission } from '@/lib/auth'

export async function GET(request: Request) {
    try {
        const user = await requirePermission('reports:read')
        const { searchParams } = new URL(request.url)
        const scope = searchParams.get('scope') || 'all'

        const range = searchParams.get('range') || 'forecast'
        const today = new Date()

        // Define Timeline
        let startOfRange: Date
        let endOfRange: Date
        const monthsRange: number[] = []

        if (range === 'history') {
            // Last 12 months (Current back to Current-11)
            startOfRange = new Date(today.getFullYear(), today.getMonth() - 11, 1)
            endOfRange = new Date(today.getFullYear(), today.getMonth() + 1, 0) // End of current month
            for (let i = -11; i <= 0; i++) monthsRange.push(i)
        } else {
            // Forecast: ±2 months
            startOfRange = new Date(today.getFullYear(), today.getMonth() - 2, 1)
            endOfRange = new Date(today.getFullYear(), today.getMonth() + 3, 0)
            for (let i = -2; i <= 2; i++) monthsRange.push(i)
        }

        // Check if user can see all projects
        const u = user as any
        const canViewAll = u.permissions?.includes('all:manage') ||
            u.permissions?.includes('projects:manage') ||
            u.permissions?.includes('projects:view_all')

        // 1. Fetch Sales Reps
        let salesReps: { id: string; name: string }[] = []

        // Force personal scope if user lacks view_all OR explicitly requested mine
        if (!canViewAll || scope === 'mine') {
            const me = await prisma.salesRep.findFirst({ where: { email: (user as any).email } })
            if (me) salesReps = [me]
        } else {
            // Admin/Manager views all or filtered
            const filterRepId = searchParams.get('salesRepId')
            if (filterRepId && filterRepId !== 'ALL') {
                salesReps = await prisma.salesRep.findMany({
                    where: { id: filterRepId, isActive: true },
                    orderBy: { name: 'asc' }
                })
            } else {
                salesReps = await prisma.salesRep.findMany({
                    where: { isActive: true },
                    orderBy: { name: 'asc' }
                })
            }
        }

        // 2. Fetch Deals (Won & Expected)
        // We fetch ALL relevant deals in the range and aggregate in memory for flexibility
        // A single query with OR would work

        const deals = await prisma.cRMProject.findMany({
            where: {
                isDeleted: false,
                OR: [
                    {
                        // WON deals in range
                        status: 'WON',
                        closedAt: {
                            gte: startOfRange,
                            lte: endOfRange
                        }
                    },
                    {
                        // OPEN deals expected in range
                        status: { notIn: ['WON', 'LOST'] },
                        expectedCloseDate: {
                            gte: startOfRange,
                            lte: endOfRange
                        }
                    }
                ]
            },
            include: {
                quotes: {
                    where: { status: { in: ['APPROVED', 'ACCEPTED'] } },
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    include: {
                        deliveryOrder: {
                            select: {
                                orderNumber: true,
                                invoiceNumber: true
                            }
                        },
                        items: {
                            include: {
                                product: {
                                    select: {
                                        grnItems: {
                                            orderBy: { createdAt: 'desc' },
                                            take: 1,
                                            select: { unitCost: true }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        })

        // 3. Aggregate Data
        // Structure: { [salesRepId]: { name: string, data: { [monthKey]: { won: number, expected: number, wonProfit: number, expectedProfit: number } } } }

        const aggregated: Record<string, any> = {}
        const months: string[] = []

        // Generate Month Keys for Columns
        monthsRange.forEach(i => {
            const d = new Date(today.getFullYear(), today.getMonth() + i, 1)
            const monthName = d.toLocaleString('default', { month: 'short' })
            const yearStr = d.getFullYear().toString().substr(2)
            const key = `${monthName} ${yearStr}`
            months.push(key)
        })

        // Initialize Reps
        salesReps.forEach(rep => {
            aggregated[rep.id] = {
                id: rep.id,
                name: rep.name,
                data: {}
            }
            // Init Months
            months.forEach(m => {
                aggregated[rep.id].data[m] = { won: 0, expected: 0, wonProfit: 0, expectedProfit: 0, projects: [] }
            })
        })

        // Process Deals
        deals.forEach(deal => {
            if (!deal.salesRepId || !aggregated[deal.salesRepId]) return

            const repData = aggregated[deal.salesRepId].data

            // Determine Month Key
            let dateToUse = deal.status === 'WON' ? deal.closedAt : deal.expectedCloseDate
            if (!dateToUse) return

            const d = new Date(dateToUse)
            const monthName = d.toLocaleString('default', { month: 'short' })
            const yearStr = d.getFullYear().toString().substr(2)
            const key = `${monthName} ${yearStr}`

            if (repData[key]) {
                // Determine value and profit source
                let valueToUse = deal.expectedValue
                let profit = 0
                const approvedQuote = (deal.quotes as any[])?.[0]

                if (approvedQuote) {
                    valueToUse = approvedQuote.subTotal
                    let totalCost = 0
                    if (approvedQuote.items?.length > 0) {
                        approvedQuote.items.forEach((item: any) => {
                            const productCost = item.product?.grnItems?.[0]?.unitCost || item.unitPrice * 0.75
                            totalCost += productCost * item.quantity
                        })
                        profit = valueToUse - totalCost
                    } else {
                        profit = valueToUse * 0.25
                    }
                } else {
                    if (deal.status === 'WON') {
                        // Per user request: use ONLY actual values from confirmed quotes for historical
                        valueToUse = 0
                        profit = 0
                    } else {
                        profit = valueToUse * 0.25
                    }
                }

                if (deal.status === 'WON') {
                    repData[key].won += valueToUse
                    repData[key].wonProfit += profit
                } else {
                    repData[key].expected += valueToUse
                    repData[key].expectedProfit += profit
                }

                // Add to detailed project list
                repData[key].projects.push({
                    id: deal.id,
                    projectCode: deal.projectCode,
                    title: deal.title,
                    status: deal.status,
                    value: valueToUse,
                    profit: profit,
                    quoteNumber: approvedQuote?.quoteNumber || null,
                    doNumber: (approvedQuote as any)?.deliveryOrder?.orderNumber || null,
                    invoiceNumber: (approvedQuote as any)?.deliveryOrder?.invoiceNumber || null
                })
            }
        })

        return NextResponse.json({
            months,
            data: Object.values(aggregated)
        })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
