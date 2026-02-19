import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(request: Request) {
    try {
        const user = await requireAuth()
        const { searchParams } = new URL(request.url)
        const salesRepId = searchParams.get('salesRepId')

        // Active filters
        const where: any = {
            isDeleted: false,
            status: 'WON',
            closedAt: { not: null }
        }

        // Access Control
        if (user.role === 'SALES') {
            const salesRep = await prisma.salesRep.findFirst({ where: { email: user.email } })
            if (salesRep) {
                where.salesRepId = salesRep.id
            } else {
                where.members = { some: { userId: user.id } }
            }
        } else if (salesRepId && salesRepId !== 'ALL') {
            where.salesRepId = salesRepId
        }

        // Get past 6 months
        const today = new Date()
        const sixMonthsAgo = new Date()
        sixMonthsAgo.setMonth(today.getMonth() - 6)

        where.closedAt = {
            gte: sixMonthsAgo
        }

        const projects = await prisma.cRMProject.findMany({
            where,
            select: {
                closedAt: true,
                expectedValue: true
            }
        })

        // Group by Month
        const groupedData: Record<string, number> = {}
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

        // Initialize past 6 months
        for (let i = 5; i >= 0; i--) {
            const d = new Date()
            d.setMonth(d.getMonth() - i)
            const key = `${months[d.getMonth()]} ${d.getFullYear().toString().substr(2)}`
            groupedData[key] = 0
        }

        projects.forEach(p => {
            if (!p.closedAt) return
            const d = new Date(p.closedAt)
            const key = `${months[d.getMonth()]} ${d.getFullYear().toString().substr(2)}`

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
