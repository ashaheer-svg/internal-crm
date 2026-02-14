import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        await requireAuth()
        const order = await prisma.deliveryOrder.findUnique({
            where: { id: params.id },
            include: {
                items: {
                    include: {
                        product: true,
                        reservedItems: true // Include reserved serials
                    }
                },
                salesRep: true
            }
        })

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 })
        }

        return NextResponse.json(order)
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        await requireAuth()
        const { searchParams } = new URL(request.url)
        const type = searchParams.get('type') // 'soft' | 'hard'

        const order = await prisma.deliveryOrder.findUnique({
            where: { id: params.id },
            include: { items: { include: { reservedItems: true } } }
        })

        if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

        // HARD DELETE (Permanent)
        if (type === 'hard') {
            // Only allow Hard Delete if already Inactive (Soft Deleted) OR Draft/Cancelled
            // But user might want to force delete. Let's allow it but warn in UI.

            // Release/Restore Stock logic
            await prisma.$transaction(async (tx) => {
                for (const item of order.items) {
                    if (item.reservedItems.length > 0) {
                        await tx.inventoryItem.updateMany({
                            where: { deliveryOrderItemId: item.id },
                            data: {
                                status: 'AVAILABLE', // Restore to stock
                                deliveryOrderItemId: null
                            }
                        })
                    }
                }
                await tx.deliveryOrder.delete({ where: { id: params.id } })
            })
            return NextResponse.json({ success: true, message: 'Permanently deleted' })
        }

        // SOFT DELETE (Deactivate / Trash)
        // For ALL statuses (DRAFT, CONFIRMED, COMPLETED, CANCELLED), we effectively "Cancel" the order
        // and release any held/sold stock back to AVAILABLE.

        // Release stock / Restore inventory
        await prisma.$transaction(async (tx) => {
            for (const item of order.items) {
                if (item.reservedItems.length > 0) {
                    await tx.inventoryItem.updateMany({
                        where: { deliveryOrderItemId: item.id },
                        data: {
                            status: 'AVAILABLE',
                            deliveryOrderItemId: null
                        }
                    })
                }
            }
            // Mark as Cancelled and Inactive
            await tx.deliveryOrder.update({
                where: { id: params.id },
                data: { isActive: false, status: 'CANCELLED' }
            })
        })

        return NextResponse.json({ success: true, message: 'Moved to trash and stock released' })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const user = await requireAuth()
        const body = await request.json()
        const { status, notes, customerId, customerName, orderNumber, items, deliveryAddress, invoiceValue, additionalCosts, invoiceNumber, salesRepId } = body

        const order = await prisma.deliveryOrder.findUnique({
            where: { id: params.id },
            include: { items: { include: { reservedItems: true } } }
        })

        if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

        // 1. Status Change Logic
        if (status && status !== order.status) {
            // If cancelling, release all stock
            if (status === 'CANCELLED') {
                await prisma.$transaction(async (tx) => {
                    // Release stock
                    for (const item of order.items) {
                        if (item.reservedItems.length > 0) {
                            await tx.inventoryItem.updateMany({
                                where: { deliveryOrderItemId: item.id },
                                data: { status: 'AVAILABLE', deliveryOrderItemId: null }
                            })
                        }
                    }
                    // Update status
                    await tx.deliveryOrder.update({
                        where: { id: params.id },
                        data: { status: 'CANCELLED' }
                    })
                })
                return NextResponse.json({ success: true })
            }

            // If completing (and was not completed), ensure stock is allocated/sold
            if (status === 'COMPLETED' && order.status !== 'COMPLETED') {
                await prisma.$transaction(async (tx) => {
                    // Mark allocated items as SOLD
                    for (const item of order.items) {
                        if (item.reservedItems.length > 0) {
                            await tx.inventoryItem.updateMany({
                                where: { deliveryOrderItemId: item.id },
                                data: { status: 'SOLD' }
                            })
                        }
                    }
                    await tx.deliveryOrder.update({
                        where: { id: params.id },
                        data: { status: 'COMPLETED' }
                    })
                })
                return NextResponse.json({ success: true })
            }
            // Simple status update for other transitions
            await prisma.deliveryOrder.update({
                where: { id: params.id },
                data: { status }
            })
            return NextResponse.json({ success: true })
        }

        // 2. Full Update (Edit Items & Fields)
        if (items && Array.isArray(items)) {
            const updatedOrder = await prisma.$transaction(async (tx) => {
                // Update Header Fields
                await tx.deliveryOrder.update({
                    where: { id: params.id },
                    data: {
                        notes,
                        customerId,
                        customerName,
                        saleType: body.saleType,
                        endCustomerId: body.endCustomerId,
                        endCustomerName: body.endCustomerName,
                        orderNumber,
                        deliveryAddress,
                        invoiceNumber: invoiceNumber || null,
                        salesRepId: salesRepId !== undefined ? salesRepId : undefined,
                        invoiceValue: invoiceValue !== undefined ? Number(invoiceValue) : undefined,
                        additionalCosts: additionalCosts !== undefined ? Number(additionalCosts) : undefined
                    }
                })

                // Get existing items for diffing
                const existingItems = await tx.deliveryOrderItem.findMany({
                    where: { deliveryOrderId: params.id },
                    include: { reservedItems: true }
                })
                const existingItemIds = existingItems.map(i => i.id)
                const payloadIds = items.filter((i: any) => i.id).map((i: any) => i.id)

                // A. HANDLE DELETIONS
                const itemsToDelete = existingItems.filter(i => !payloadIds.includes(i.id))
                for (const item of itemsToDelete) {
                    // Release inventory back to AVAILABLE
                    if (item.reservedItems.length > 0) {
                        await tx.inventoryItem.updateMany({
                            where: { deliveryOrderItemId: item.id },
                            data: { status: 'AVAILABLE', deliveryOrderItemId: null }
                        })
                    }
                    await tx.deliveryOrderItem.delete({ where: { id: item.id } })
                }

                // B. HANDLE UPSERTS (Update or Create)
                for (const item of items) {
                    let orderItemId = item.id

                    // Check if new or existing
                    if (item.id && existingItemIds.includes(item.id)) {
                        // UPDATE Existing Item
                        await tx.deliveryOrderItem.update({
                            where: { id: item.id },
                            data: {
                                productId: item.productId,
                                quantity: Number(item.quantity),
                                unitPrice: Number(item.unitPrice)
                            }
                        })

                        // Inventory Adjustment Logic
                        const existingItem = existingItems.find(i => i.id === item.id)
                        const currentReservedCount = existingItem?.reservedItems.length || 0
                        const newQuantity = Number(item.quantity)

                        // If we need MORE (increase qty) -> Try to auto-allocate
                        if (newQuantity > currentReservedCount) {
                            const needed = newQuantity - currentReservedCount
                            const availableStock = await tx.inventoryItem.findMany({
                                where: { productId: item.productId, status: 'AVAILABLE' },
                                take: needed
                            })

                            if (availableStock.length > 0) { // Allocate what we can
                                await tx.inventoryItem.updateMany({
                                    where: { id: { in: availableStock.map(i => i.id) } },
                                    data: {
                                        status: order.status === 'COMPLETED' ? 'SOLD' : 'RESERVED',
                                        deliveryOrderItemId: item.id
                                    }
                                })
                            }
                        }
                        // If we need LESS (decrease qty) -> Release excess
                        else if (newQuantity < currentReservedCount) {
                            const toReleaseCount = currentReservedCount - newQuantity
                            // Release the last N items
                            const toRelease = existingItem?.reservedItems.slice(0, toReleaseCount) || []
                            if (toRelease.length > 0) {
                                await tx.inventoryItem.updateMany({
                                    where: { id: { in: toRelease.map(i => i.id) } },
                                    data: { status: 'AVAILABLE', deliveryOrderItemId: null }
                                })
                            }
                        }

                    } else {
                        // CREATE New Item
                        const newItem = await tx.deliveryOrderItem.create({
                            data: {
                                deliveryOrderId: params.id,
                                productId: item.productId,
                                quantity: Number(item.quantity),
                                unitPrice: Number(item.unitPrice),
                                isBackorder: false
                            }
                        })
                        orderItemId = newItem.id

                        // Auto-allocate logic for new item
                        const needed = Number(item.quantity)
                        const availableStock = await tx.inventoryItem.findMany({
                            where: { productId: item.productId, status: 'AVAILABLE' },
                            take: needed
                        })

                        if (availableStock.length > 0) {
                            await tx.inventoryItem.updateMany({
                                where: { id: { in: availableStock.map(i => i.id) } },
                                data: {
                                    status: order.status === 'COMPLETED' ? 'SOLD' : 'RESERVED',
                                    deliveryOrderItemId: orderItemId
                                }
                            })
                        }
                    }
                }

                return tx.deliveryOrder.findUnique({
                    where: { id: params.id },
                    include: { items: true }
                })
            })

            return NextResponse.json(updatedOrder)
        }

        // 3. Fallback (Simple Patch)
        const updated = await prisma.deliveryOrder.update({
            where: { id: params.id },
            data: {
                status,
                notes,
                deliveryAddress,
                invoiceNumber: invoiceNumber !== undefined ? invoiceNumber : undefined,
                saleType: body.saleType,
                endCustomerId: body.endCustomerId,
                endCustomerName: body.endCustomerName,
                invoiceValue: invoiceValue !== undefined ? Number(invoiceValue) : undefined,
                salesRepId: salesRepId !== undefined ? salesRepId : undefined,
                additionalCosts: additionalCosts !== undefined ? Number(additionalCosts) : undefined
            }
        })
        return NextResponse.json(updated)

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
