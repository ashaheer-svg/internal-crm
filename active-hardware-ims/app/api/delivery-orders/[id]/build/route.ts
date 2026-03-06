import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePermission } from '@/lib/auth'
import { sendSystemMessage } from '@/lib/notifications'
import { format } from 'date-fns'

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const user = await requirePermission('delivery_orders:update')
        const body = await request.json()
        const { buildNotes } = body

        const order = await prisma.deliveryOrder.findUnique({
            where: { id: params.id },
            include: {
                items: { include: { reservedItems: true, product: true } },
                quotes: true
            }
        })

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 })
        }

        // Verify it's in a state that can be built
        if (order.status !== 'READY_FOR_BUILD' && order.status !== 'BUILDING') {
            return NextResponse.json({ error: 'Order is not in a buildable state' }, { status: 400 })
        }

        // Complete the build
        await prisma.deliveryOrder.update({
            where: { id: params.id },
            data: {
                status: 'BUILT',
                builtById: user.id,
                buildNotes: buildNotes || null,
                builtAt: new Date()
            }
        })

        // Sync with CRM Quotes if linked
        if (order.quotes && order.quotes.length > 0) {
            for (const quote of order.quotes) {
                await prisma.cRMQuote.update({
                    where: { id: quote.id },
                    data: { status: 'BUILT' }
                })
            }
        }

        // Notify SALES (Owner), ACC-MGR, and SALES-MGR
        try {
            const [accMgrRole, salesMgrRole] = await Promise.all([
                prisma.role.findUnique({ where: { name: 'ACC-MGR' } }),
                prisma.role.findUnique({ where: { name: 'SALES-MGR' } })
            ]);

            const itemsList = order.items.map(i => `- ${i.product?.name} (Qty: ${i.quantity})`).join('\n');
            const content = `Delivery Order ${order.orderNumber} has been BUILT and is ready for shipment.\n\n` +
                `End Customer: ${order.endCustomerName || order.customerName}\n` +
                `Partner: ${order.customerName}\n` +
                `Items:\n${itemsList}\n` +
                `Expected Delivery: ${order.updatedAt ? format(new Date(order.updatedAt), 'dd MMM yyyy') : 'N/A'}\n\n` +
                `Build Notes: ${buildNotes || 'None'}`;

            if (order.salesRepId) await sendSystemMessage({ subject: `DO BUILT: ${order.orderNumber}`, content, recipientUserId: order.salesRepId, category: 'UPDATE', priority: 'MEDIUM', senderId: user.id });
            if (accMgrRole) await sendSystemMessage({ subject: `DO BUILT: ${order.orderNumber}`, content, recipientRoleId: accMgrRole.id, category: 'UPDATE', priority: 'MEDIUM', senderId: user.id });
            if (salesMgrRole) await sendSystemMessage({ subject: `DO BUILT: ${order.orderNumber}`, content, recipientRoleId: salesMgrRole.id, category: 'UPDATE', priority: 'MEDIUM', senderId: user.id });
        } catch (err) {
            console.error('Failed to send BUILT notification:', err);
        }

        // Audit Log
        const { logCreate } = await import('@/lib/audit')
        await logCreate('DELIVERY_ORDER_BUILD', order.id, user.id, user.name, {
            orderNumber: order.orderNumber,
            notes: buildNotes
        })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error("Build completion failed:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// DELETE — Reject/Release a serial during build. Accepts JSON body with inventoryItemId + comment.
export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const user = await requirePermission('inventory:manage')

        // Support both JSON body and query param for inventoryItemId
        let inventoryItemId: string | null = null
        let comment: string | null = null

        try {
            const body = await request.json()
            inventoryItemId = body.inventoryItemId || null
            comment = body.comment || null
        } catch {
            // Fallback to query param if body parse fails
            const { searchParams } = new URL(request.url)
            inventoryItemId = searchParams.get('inventoryItemId')
        }

        if (!inventoryItemId) {
            return NextResponse.json({ error: 'Inventory Item ID is required' }, { status: 400 })
        }

        // Fetch the inventory item to ensure it's linked to this DO via a DeliveryOrderItem
        const item = await prisma.inventoryItem.findUnique({
            where: { id: inventoryItemId },
            include: { deliveryOrderItem: true, product: true }
        })

        if (!item || !item.deliveryOrderItem || item.deliveryOrderItem.deliveryOrderId !== params.id) {
            return NextResponse.json({ error: 'Item not found or not part of this order' }, { status: 404 })
        }

        // Release the item and create BuildRejection record in a transaction
        await prisma.$transaction(async (tx) => {
            await tx.inventoryItem.update({
                where: { id: inventoryItemId! },
                data: {
                    status: 'RMA',           // Quarantine — prevents re-issuance while fault is under review
                    deliveryOrderItemId: null
                }
            })

            // Decrement quantityFulfilled on the DeliveryOrderItem
            await tx.deliveryOrderItem.update({
                where: { id: item.deliveryOrderItemId! },
                data: {
                    quantityFulfilled: { decrement: 1 }
                }
            })

            // Create BuildRejection record
            await (tx as any).buildRejection.create({
                data: {
                    deliveryOrderId: params.id,
                    inventoryItemId: inventoryItemId!,
                    serialNumber: item.serialNumber,
                    comment: comment || null,
                    rejectedById: user.id,
                    rejectedByName: user.name,
                }
            })

            // TransactionLog — RESERVED → RMA (F2: stock movement traceability)
            await tx.transactionLog.create({
                data: {
                    type: 'ADJUSTMENT',
                    referenceType: 'BUILD_REJECTION',
                    referenceId: params.id,
                    productId: item.productId,
                    serialNumber: item.serialNumber,
                    quantity: 1,
                    notes: `SN ${item.serialNumber} quarantined (RMA) by ${user.name} during build. Reason: ${comment || 'Not specified'}`
                }
            })
        })

        // Notify SALES (Owner), ACC-MGR, and SALES-MGR about rejection
        try {
            const [orderData, accMgrRole, salesMgrRole] = await Promise.all([
                prisma.deliveryOrder.findUnique({
                    where: { id: params.id },
                    include: { items: { include: { product: true } } }
                }),
                prisma.role.findUnique({ where: { name: 'ACC-MGR' } }),
                prisma.role.findUnique({ where: { name: 'SALES-MGR' } })
            ]);

            if (orderData) {
                const itemsList = orderData.items.map(i => `- ${i.product?.name} (Qty: ${i.quantity})`).join('\n');
                const content = `An item has been REJECTED during the build of Delivery Order ${orderData.orderNumber}.\n\n` +
                    `Rejected Item: ${item.serialNumber} (${item.product?.name})\n` +
                    `Reason: ${comment || 'Not specified'}\n\n` +
                    `End Customer: ${orderData.endCustomerName || orderData.customerName}\n` +
                    `Partner: ${orderData.customerName}\n` +
                    `Order Items:\n${itemsList}\n` +
                    `Expected Delivery: ${orderData.updatedAt ? format(new Date(orderData.updatedAt), 'dd MMM yyyy') : 'N/A'}`;

                if (orderData.salesRepId) await sendSystemMessage({ subject: `DO REJECTION: ${orderData.orderNumber}`, content, recipientUserId: orderData.salesRepId, category: 'ALERT', priority: 'HIGH', senderId: user.id });
                if (accMgrRole) await sendSystemMessage({ subject: `DO REJECTION: ${orderData.orderNumber}`, content, recipientRoleId: accMgrRole.id, category: 'ALERT', priority: 'HIGH', senderId: user.id });
                if (salesMgrRole) await sendSystemMessage({ subject: `DO REJECTION: ${orderData.orderNumber}`, content, recipientRoleId: salesMgrRole.id, category: 'ALERT', priority: 'HIGH', senderId: user.id });
            }
        } catch (err) {
            console.error('Failed to send REJECTION notification:', err);
        }

        // Audit Log (preserved for backward compatibility)
        const { logCreate } = await import('@/lib/audit')
        await logCreate('DELIVERY_ORDER_BUILD_REJECT', params.id, user.id, user.name, {
            serialNumber: item.serialNumber,
            inventoryItemId,
            comment: comment || null,
        })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error("Build item rejection failed:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
