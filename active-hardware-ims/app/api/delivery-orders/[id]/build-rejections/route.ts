import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

/**
 * GET /api/delivery-orders/[id]/build-rejections
 * Returns all items rejected by the TECHNICAL team during the build process for this DO.
 * Reads directly from the audit log — no schema change required.
 */
export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params
    try {
        await requireAuth()

        const logs = await (prisma as any).auditLog.findMany({
            where: {
                entityType: 'DELIVERY_ORDER_BUILD_REJECT',
                entityId: params.id,
            },
            orderBy: { createdAt: 'desc' },
        })

        const rejections = logs.map((log: any) => {
            const data = log.changes ? JSON.parse(log.changes) : {}
            return {
                serialNumber: data.after?.serialNumber ?? 'Unknown',
                inventoryItemId: data.after?.inventoryItemId ?? null,
                rejectedBy: log.userName,
                rejectedAt: log.createdAt,
            }
        })

        return NextResponse.json({ rejections })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
