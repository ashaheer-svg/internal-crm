import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(request: Request) {
    try {
        const user = await requireAuth()
        const { searchParams } = new URL(request.url)
        const salesRepId = searchParams.get('salesRepId')

        // Filter constraints
        const where: any = {
            isDeleted: false,
            status: { notIn: ['WON', 'LOST'] }, // Only open deals
            expectedCloseDate: {
                not: null
            }
        }

        // Access Control: Sales Reps view only their own
        if (user.legacyRole === 'SALES' || user.role?.name === 'SALES') {
            const salesRep = await prisma.salesRep.findFirst({ where: { email: user.email } })
            if (salesRep) {
                where.salesRepId = salesRep.id
            } else {
                where.members = { some: { userId: user.id } }
            }
        } else if (salesRepId && salesRepId !== 'ALL') {
            // Admin/Manager filtering by specific rep
            where.salesRepId = salesRepId
        }

        // Get deals for next 3 months
        const today = new Date()
        const threeMonthsLater = new Date()
        threeMonthsLater.setMonth(today.getMonth() + 3)

        where.expectedCloseDate = {
            gte: new Date(today.getFullYear(), today.getMonth(), 1), // From start of current month
            lte: threeMonthsLater
        }

        const projects = await prisma.cRMProject.findMany({
            where,
            select: {
                expectedCloseDate: true,
                expectedValue: true,
                probability: true
            }
        })

        // Group by Month (YY-MM)
        const groupedData: Record<string, number> = {}
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

        // Initialize next 3 months key
        for (let i = 0; i < 3; i++) {
            const d = new Date()
            d.setMonth(d.getMonth() + i)
            const key = `${months[d.getMonth()]} ${d.getFullYear().toString().substr(2)}`
            groupedData[key] = 0
        }

        projects.forEach(p => {
            if (!p.expectedCloseDate) return
            const d = new Date(p.expectedCloseDate)
            const key = `${months[d.getMonth()]} ${d.getFullYear().toString().substr(2)}`

            // Forecast Calculation: Value or Probable Value? 
            // Standard forecast usually uses Weighted Value (Value * Probability) or Total Value
            // Using Total Value for now as probability might not be used heavily yet
            if (groupedData[key] !== undefined) {
                groupedData[key] += p.expectedValue
            }
        })

        const result = Object.entries(groupedData).map(([month, totalValue]) => ({
            month,
            totalValue
        }))

        return NextResponse.json(result)

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
