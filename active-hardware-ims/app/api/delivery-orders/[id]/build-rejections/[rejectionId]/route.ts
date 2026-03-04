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

        // Fetch the rejection to get the inventoryItemId before dismissing
        const rejection = await (prisma as any).buildRejection.findUnique({
            where: { id: params.rejectionId },
        })

        if (!rejection) {
            return NextResponse.json({ error: 'Rejection not found' }, { status: 404 })
        }

        await prisma.$transaction(async (tx: any) => {
            // Dismiss the rejection record
            await tx.buildRejection.update({
                where: { id: params.rejectionId },
                data: {
                    dismissed: true,
                    dismissedAt: new Date(),
                    dismissedByName: user.name,
                },
            })

            // Release item back to AVAILABLE — rejection was not a fault
            await tx.inventoryItem.update({
                where: { id: rejection.inventoryItemId },
                data: { status: 'AVAILABLE' },
            })
        })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
