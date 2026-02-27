import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { sendDeliveryShippedAlert, sendLowStockAlert } from '@/lib/whatsapp'
import { activateServiceContract } from '@/lib/service-manager'

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        await requireAuth()
        const order = await prisma.deliveryOrder.findUnique({
            where: { id: params.id },
            include: {
                items: {
                    include: {
                        product: {
                            include: {
                                serviceDefinition: true
                            }
                        },
                        reservedItems: true // Include reserved serials
                    }
                },
                salesRep: true
            } as any
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
            include: {
                items: {
                    include: {
                        reservedItems: true,
                        product: { include: { serviceDefinition: true } }
                    }
                },
                quotes: true
            }
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
                    const { createBackorder } = body

                    // Refresh order data within transaction to ensure we have latest items
                    const currentOrder = await tx.deliveryOrder.findUnique({
                        where: { id: params.id },
                        include: {
                            items: {
                                include: {
                                    reservedItems: true,
                                    product: { include: { serviceDefinition: true } }
                                }
                            }
                        }
                    })

                    if (!currentOrder) throw new Error("Order not found during completion")

                    // 1. Calculate Unfulfilled Items and Values
                    const backorderItems = []
                    const itemsToRemove = []
                    const itemsToUpdate = []
                    let totalBackorderValue = 0

                    for (const item of currentOrder.items) {
                        const isService = !!item.product?.serviceDefinition

                        if (isService) {
                            // Service Validation: Must have dates set if we are completing
                            if (!(item as any).serviceStartDate || !(item as any).serviceEndDate) {
                                throw new Error(`Service item "${item.product!.name}" is not fulfilled. Please provide the service period.`)
                            }
                            // Services are considered fully fulfilled if dates are set
                            continue
                        }

                        const reservedCount = item.reservedItems.length
                        const missingQty = item.quantity - reservedCount

                        if (missingQty > 0) {
                            const itemValuePerUnit = item.unitPrice || 0
                            const backorderVal = itemValuePerUnit * missingQty
                            totalBackorderValue += backorderVal

                            if (createBackorder) {
                                backorderItems.push({
                                    productId: item.productId,
                                    quantity: Math.floor(missingQty),
                                    unitPrice: item.unitPrice,
                                    isBackorder: true
                                })
                            } else {
                                // Logic to REVERT existing backorder fulfillment if this item was linked
                                const dbItem = await tx.deliveryOrderItem.findUnique({
                                    where: { id: item.id }
                                })

                                if ((dbItem as any)?.backorderItemId) {
                                    await tx.backorderItem.update({
                                        where: { id: (dbItem as any).backorderItemId },
                                        data: {
                                            quantityFulfilled: { decrement: missingQty },
                                            status: 'PARTIAL'
                                        }
                                    })
                                }
                            }

                            if (reservedCount === 0) {
                                itemsToRemove.push(item.id)
                            } else {
                                itemsToUpdate.push({ id: item.id, quantity: Math.floor(reservedCount) })
                            }
                        }
                    }

                    // 2. Process Backorder (if requested and needed)
                    if (createBackorder && backorderItems.length > 0) {
                        // Generate robust backorder number
                        const baseOrderNumber = currentOrder.orderNumber.split('-BO')[0]
                        const boCount = await tx.deliveryOrder.count({
                            where: { orderNumber: { startsWith: `${baseOrderNumber}-BO` } }
                        })
                        const newOrderNumber = `${baseOrderNumber}-BO${boCount + 1}`

                        // Create New DO
                        await tx.deliveryOrder.create({
                            data: {
                                orderNumber: newOrderNumber,
                                customerName: currentOrder.customerName,
                                status: 'DRAFT',
                                isActive: true,
                                customerId: currentOrder.customerId,
                                deliveryAddress: currentOrder.deliveryAddress,
                                salesRepId: currentOrder.salesRepId,
                                invoiceValue: totalBackorderValue,
                                quoteReference: (currentOrder as any).quoteReference,
                                items: {
                                    create: backorderItems
                                }
                            } as any
                        })

                        // Update Original Order Items
                        if (itemsToRemove.length > 0) {
                            await tx.deliveryOrderItem.deleteMany({
                                where: { id: { in: itemsToRemove } }
                            })
                        }
                        for (const update of itemsToUpdate) {
                            await tx.deliveryOrderItem.update({
                                where: { id: update.id },
                                data: { quantity: update.quantity }
                            })
                        }

                        // Adjust Original Order Value
                        const currentInvoiceValue = Number(currentOrder.invoiceValue) || 0
                        const newOriginalValue = Math.max(0, currentInvoiceValue - totalBackorderValue)
                        await tx.deliveryOrder.update({
                            where: { id: params.id },
                            data: { invoiceValue: newOriginalValue }
                        })
                    }

                    // 3. Mark allocated items as SOLD and log transactions
                    const finalItems = await tx.deliveryOrderItem.findMany({
                        where: { deliveryOrderId: params.id },
                        include: {
                            reservedItems: true,
                            product: { include: { serviceDefinition: true } }
                        }
                    })

                    for (const item of finalItems) {
                        if (item.product?.serviceDefinition) {
                            console.log(`[SERVICE_ACTIVATION] Starting activation for DO ${currentOrder.orderNumber}, Product: ${item.product.sku}`);
                            // ACTIVATE SERVICE CONTRACT
                            try {
                                await activateServiceContract({
                                    customerId: currentOrder.customerId!,
                                    productId: item.productId!,
                                    startDate: (item as any).serviceStartDate!,
                                    description: `Fulfilled via Delivery Order ${currentOrder.orderNumber}`,
                                    contractValue: item.unitPrice,
                                    invoiceReference: currentOrder.invoiceNumber || currentOrder.orderNumber || 'N/A',
                                    salesRepId: currentOrder.salesRepId || undefined
                                }, tx)
                                console.log(`[SERVICE_ACTIVATION] Successfully activated contract for ${item.product.sku}`);
                            } catch (error: any) {
                                console.error(`[SERVICE_ACTIVATION] FAILED for ${item.product.sku}:`, error.message);
                                // We don't throw here to avoid rolling back hardware fulfillment if one service fails, 
                                // although in a transaction it might still roll back if not caught or depending on tx logic.
                                // But since activateServiceContract uses a separate 'db' instance, it won't automagically roll back the 'tx'
                                // unless we re-throw.
                                throw error; // Re-throw to ensure transaction integrity
                            }

                            // Log Transaction as ISSUE (Revenue recognized)
                            await tx.transactionLog.create({
                                data: {
                                    type: 'ISSUE',
                                    referenceType: 'DELIVERY_ORDER',
                                    referenceId: currentOrder.id,
                                    productId: item.productId,
                                    serialNumber: 'SERVICE', // Identifier for non-serialized
                                    quantity: item.quantity,
                                    unitCost: item.unitPrice,
                                    notes: `Service fulfilled via DO ${currentOrder.orderNumber}`
                                }
                            })
                        } else if (item.reservedItems.length > 0) {
                            await tx.inventoryItem.updateMany({
                                where: { deliveryOrderItemId: item.id },
                                data: { status: 'SOLD' }
                            })

                            for (const reserved of item.reservedItems) {
                                await tx.transactionLog.create({
                                    data: {
                                        type: 'ISSUE',
                                        referenceType: 'DELIVERY_ORDER',
                                        referenceId: currentOrder.id,
                                        productId: item.productId!,
                                        serialNumber: reserved.serialNumber,
                                        quantity: 1,
                                        unitCost: item.unitPrice,
                                        notes: `Sold via Delivery Order ${currentOrder.orderNumber} to ${currentOrder.customerName}`
                                    }
                                })
                            }
                        }
                    }

                    // 4. Update Status
                    await tx.deliveryOrder.update({
                        where: { id: params.id },
                        data: { status: 'COMPLETED' }
                    })
                }, {
                    maxWait: 10000, // 10 seconds to acquire connection
                    timeout: 60000  // 60 seconds total execution time for complex orders
                })

                // --- WhatsApp Alerts ---
                try {
                    // 1. Shipment Alert
                    if (order.customerId) {
                        const customer = await prisma.customer.findUnique({ where: { id: order.customerId } })
                        if (customer?.phone) {
                            sendDeliveryShippedAlert(customer.phone, order.orderNumber).catch(console.error)
                        }
                    }

                    // 2. Low Stock Alerts
                    const finalItems = await prisma.deliveryOrderItem.findMany({
                        where: { deliveryOrderId: params.id }
                    })

                    for (const item of finalItems) {
                        const product = await prisma.product.findUnique({ where: { id: item.productId } })
                        if (product && product.minStock && product.minStock > 0) {
                            const availableCount = await prisma.inventoryItem.count({
                                where: { productId: product.id, status: 'AVAILABLE' }
                            })
                            if (availableCount < product.minStock) {
                                sendLowStockAlert(product.name, availableCount, product.minStock).catch(console.error)
                            }
                        }
                    }
                } catch (err) {
                    console.error('Failed to process WhatsApp alerts for Delivery Order:', err)
                }

                return NextResponse.json({ success: true })
            }
            // Simple status update for other transitions
            await prisma.deliveryOrder.update({
                where: { id: params.id },
                data: { status }
            })

            // Sync with CRM Quotes if linked
            if (order.quotes && order.quotes.length > 0) {
                // Determine a CRM-friendly status name for the new workflow
                let crmStatus = 'ACCEPTED' // Default
                if (status === 'READY_FOR_BUILD') crmStatus = 'READY FOR BUILD'
                if (status === 'BUILDING') crmStatus = 'BUILDING'
                if (status === 'BUILT') crmStatus = 'BUILT'
                if (status === 'COMPLETED') crmStatus = 'SHIPPED'
                if (status === 'CANCELLED') crmStatus = 'CANCELLED'

                for (const quote of order.quotes) {
                    await prisma.cRMQuote.update({
                        where: { id: quote.id },
                        data: { status: crmStatus }
                    })
                }
            }

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
                        saleType: (body as any).saleType,
                        endCustomerId: (body as any).endCustomerId,
                        endCustomerName: (body as any).endCustomerName,
                        orderNumber,
                        deliveryAddress,
                        invoiceNumber: invoiceNumber || null,
                        salesRepId: salesRepId !== undefined ? salesRepId : undefined,
                        invoiceValue: invoiceValue !== undefined ? Number(invoiceValue) : undefined,
                        additionalCosts: additionalCosts !== undefined ? Number(additionalCosts) : undefined
                    } as any
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
                saleType: (body as any).saleType,
                endCustomerId: (body as any).endCustomerId,
                endCustomerName: (body as any).endCustomerName,
                invoiceValue: invoiceValue !== undefined ? Number(invoiceValue) : undefined,
                salesRepId: salesRepId !== undefined ? salesRepId : undefined,
                additionalCosts: additionalCosts !== undefined ? Number(additionalCosts) : undefined
            } as any
        })
        return NextResponse.json(updated)

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
