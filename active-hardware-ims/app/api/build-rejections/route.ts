import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

/**
 * GET /api/build-rejections?serial=xxx
 * Returns build rejections (including dismissed) for a given serial number.
 * Used by the General Lookup page to surface rejection history.
 */
export async function GET(request: Request) {
    try {
        await requireAuth()
        const { searchParams } = new URL(request.url)
        const serial = searchParams.get('serial')

        if (!serial) {
            return NextResponse.json({ rejections: [] })
        }

        const rejections = await (prisma as any).buildRejection.findMany({
            where: {
                serialNumber: { contains: serial }
            },
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

/**
 * GET /api/build-rejections/active
 * Returns all active (non-dismissed) build rejections across all DOs.
 * Used by the Warranty/RMA page to show a global alert on page load.
 */
export async function HEAD(request: Request) {
    return GET(request)
}
