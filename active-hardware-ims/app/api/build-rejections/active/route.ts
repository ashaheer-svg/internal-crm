import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

/**
 * GET /api/build-rejections/active
 * Returns all non-dismissed build rejections across all DOs.
 * Used by the Warranty/RMA page to show a dismissible alert on page load.
 */
export async function GET() {
    try {
        await requireAuth()

        const rejections = await (prisma as any).buildRejection.findMany({
            where: { dismissed: false },
            include: {
                deliveryOrder: {
                    select: { orderNumber: true, id: true }
                }
            },
            orderBy: { rejectedAt: 'desc' },
        })

        return NextResponse.json({ rejections })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
