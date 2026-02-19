import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(request: Request) {
    try {
        const user = await requireAuth()
        const { searchParams } = new URL(request.url)

        // Define Timeline
        // Past 6 months
        // Current Month
        // Next 3 Months
        // Total Range: Start of (Current - 6 months) to End of (Current + 3 months)

        const today = new Date()
        const startOfRange = new Date(today.getFullYear(), today.getMonth() - 6, 1) // 6 months ago
        const endOfRange = new Date(today.getFullYear(), today.getMonth() + 4, 0) // End of 3 months from now

        // 1. Fetch Sales Reps
        let salesReps = []
        if (user.role === 'SALES') {
            const me = await prisma.salesRep.findFirst({ where: { email: user.email } })
            if (me) salesReps = [me]
            // If not found in SalesRep table, might fallback to empty or user Logic, but assuming standard flow
        } else {
            // Admin/Manager views all
            salesReps = await prisma.salesRep.findMany({
                where: { isDeleted: false },
                orderBy: { name: 'asc' }
            })
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
            select: {
                id: true,
                status: true,
                expectedValue: true,
                closedAt: true,
                expectedCloseDate: true,
                salesRepId: true
            }
        })

        // 3. Aggregate Data
        // Structure: { [salesRepId]: { name: string, data: { [monthKey]: { won: number, expected: number } } } }

        const aggregated: Record<string, any> = {}
        const months: string[] = []

        // Generate Month Keys for Columns
        // -6 to +3
        for (let i = -6; i <= 3; i++) {
            const d = new Date(today.getFullYear(), today.getMonth() + i, 1)
            const monthName = d.toLocaleString('default', { month: 'short' })
            const yearStr = d.getFullYear().toString().substr(2)
            const key = `${monthName} ${yearStr}`
            months.push(key) // Ensure order
        }

        // Initialize Reps
        salesReps.forEach(rep => {
            aggregated[rep.id] = {
                id: rep.id,
                name: rep.name,
                data: {}
            }
            // Init Months
            months.forEach(m => {
                aggregated[rep.id].data[m] = { won: 0, expected: 0 }
            })
        })

        // Process Deals
        deals.forEach(deal => {
            if (!deal.salesRepId || !aggregated[deal.salesRepId]) return // Skip if unassigned or rep not in list (e.g. filter)

            const repData = aggregated[deal.salesRepId].data

            // Determine Month Key
            let dateToUse = deal.status === 'WON' ? deal.closedAt : deal.expectedCloseDate
            if (!dateToUse) return

            const d = new Date(dateToUse)
            const monthName = d.toLocaleString('default', { month: 'short' })
            const yearStr = d.getFullYear().toString().substr(2)
            const key = `${monthName} ${yearStr}`

            if (repData[key]) {
                if (deal.status === 'WON') {
                    repData[key].won += deal.expectedValue
                } else {
                    repData[key].expected += deal.expectedValue
                }
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
