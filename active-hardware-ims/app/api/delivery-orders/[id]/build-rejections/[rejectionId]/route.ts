import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { logCreate } from '@/lib/audit'

/**
 * PATCH /api/delivery-orders/[id]/build-rejections/[rejectionId]
 * Dismisses a BuildRejection — used by ACC-MGR when the rejection was NOT a fault.
 * Restores inventory to AVAILABLE and writes full audit + transaction log.
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
            include: {
                deliveryOrder: { select: { orderNumber: true } }
            }
        })

        if (!rejection) {
            return NextResponse.json({ error: 'Rejection not found' }, { status: 404 })
        }

        // Fetch inventory item details for logging
        const item = await prisma.inventoryItem.findUnique({
            where: { id: rejection.inventoryItemId },
            select: { serialNumber: true, productId: true, product: { select: { name: true } } }
        })

        await prisma.$transaction(async (tx: any) => {
            // 1. Dismiss the rejection record
            await tx.buildRejection.update({
                where: { id: params.rejectionId },
                data: {
                    dismissed: true,
                    dismissedAt: new Date(),
                    dismissedByName: user.name,
                },
            })

            // 2. Release item back to AVAILABLE — rejection was not a fault
            await tx.inventoryItem.update({
                where: { id: rejection.inventoryItemId },
                data: { status: 'AVAILABLE' },
            })

            // 3. TransactionLog — RMA → AVAILABLE
            await tx.transactionLog.create({
                data: {
                    type: 'ADJUSTMENT',
                    referenceType: 'BUILD_REJECTION_DISMISS',
                    referenceId: params.id,
                    productId: item?.productId || null,
                    serialNumber: rejection.serialNumber,
                    quantity: 1,
                    notes: `Build rejection dismissed by ${user.name} — SN ${rejection.serialNumber} cleared from RMA quarantine (DO ${rejection.deliveryOrder?.orderNumber || params.id})`
                }
            })
        })

        // 4. AuditLog — separate so it never blocks the transaction
        await logCreate('DELIVERY_ORDER_DISMISS', params.id, user.id, user.name, {
            rejectionId: params.rejectionId,
            serialNumber: rejection.serialNumber,
            originalComment: rejection.comment,
            rejectedByName: rejection.rejectedByName,
            orderNumber: rejection.deliveryOrder?.orderNumber,
            note: 'Rejection dismissed — item not considered defective'
        })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
