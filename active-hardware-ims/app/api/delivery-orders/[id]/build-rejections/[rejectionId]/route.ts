import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

/**
 * PATCH /api/delivery-orders/[id]/build-rejections/[rejectionId]/dismiss
 * Dismisses a BuildRejection — used by ACC-MGR when the rejection was NOT a fault.
 */
export async function PATCH(
    _req: Request,
    props: { params: Promise<{ id: string; rejectionId: string }> }
) {
    const params = await props.params
    try {
        const user = await requireAuth()

        await (prisma as any).buildRejection.update({
            where: { id: params.rejectionId },
            data: {
                dismissed: true,
                dismissedAt: new Date(),
                dismissedByName: user.name,
            },
        })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
