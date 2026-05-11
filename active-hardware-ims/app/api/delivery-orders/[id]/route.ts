import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { sendDeliveryShippedAlert, sendLowStockAlert } from '@/lib/whatsapp'
import { activateServiceContract } from '@/lib/service-manager'
import { sendSystemMessage } from '@/lib/notifications'
import { format } from 'date-fns'

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        await requireAuth()
        const order = await prisma.deliveryOrder.findUnique({
            where: { id: params.id },
            include: {
                buildRejections: true,
                builtBy: { select: { name: true } },
                items: {
                    include: {
                        product: {
                            include: {
                                serviceDefinition: true
                            }
                        },
                        reservedItems: true, // Include reserved serials
                        details: true
                    }
                },
                salesRep: true,
                quotes: true,
                customer: { select: { id: true, taxId: true, name: true } },
                endCustomer: { select: { id: true, taxId: true, name: true } }
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
        const user = await requireAuth()
        const { searchParams } = new URL(request.url)
        const type = searchParams.get('type') // 'soft' | 'hard'

        const order = await prisma.deliveryOrder.findUnique({
            where: { id: params.id },
            include: { items: { include: { reservedItems: true, product: true } } }
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

        // Notify TECHNICAL and SALES-MGR for Deactivation
        try {
            const [techRole, salesMgrRole] = await Promise.all([
                prisma.role.findUnique({ where: { name: 'TECHNICAL' } }),
                prisma.role.findUnique({ where: { name: 'SALES-MGR' } })
            ]);

            const itemsList = order.items.map(i => `- ${i.product?.name || 'Item'} (Qty: ${i.quantity})`).join('\n');
            const content = `Delivery Order ${order.orderNumber} has been DEACTIVATED (Moved to Trash).\n\n` +
                `End Customer: ${order.endCustomerName || order.customerName}\n` +
                `Partner: ${order.customerName}\n` +
                `Items:\n${itemsList}\n` +
                `Expected Delivery: ${order.updatedAt ? format(new Date(order.updatedAt), 'dd MMM yyyy') : 'N/A'}`;

            const metadata = {
                deliveryOrderNumber: order.orderNumber,
                customerName: order.endCustomerName || order.customerName,
                partnerName: order.saleType === 'PARTNER' ? order.customerName : null,
                invoiceNumber: order.invoiceNumber || null
            };
            if (techRole) await sendSystemMessage({ subject: `DO DEACTIVATED: ${order.orderNumber}`, content, recipientRoleId: techRole.id, category: 'UPDATE', priority: 'HIGH', senderId: user.id, ...metadata });
            if (salesMgrRole) await sendSystemMessage({ subject: `DO DEACTIVATED: ${order.orderNumber}`, content, recipientRoleId: salesMgrRole.id, category: 'UPDATE', priority: 'HIGH', senderId: user.id, ...metadata });
        } catch (err) {
            console.error('Failed to send deactivation notification:', err);
        }

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
        const { status, notes, customerId, customerName, orderNumber, items, deliveryAddress, invoiceValue, additionalCosts, invoiceNumber, salesRepId, buildInstructions, deliveryInstructions, additionalContact, deliveryCharges } = body

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
            // Pre-flight validation when moving past DRAFT
            if (status === 'CONFIRMED' || status === 'READY_FOR_BUILD') {
                if (!order.customerId) {
                    return NextResponse.json({ error: 'Cannot confirm: Order must have a customer assigned.' }, { status: 400 })
                }
                if (order.items.length === 0) {
                    return NextResponse.json({ error: 'Cannot confirm: Order must have at least one item.' }, { status: 400 })
                }
            }

            // If cancelling, release all RESERVED stock (but NOT RMA items — they stay quarantined)
            if (status === 'CANCELLED') {
                await prisma.$transaction(async (tx) => {
                    // Release stock — only RESERVED items. RMA items are managed separately via dismissal.
                    for (const item of order.items) {
                        if (item.reservedItems.length > 0) {
                            await tx.inventoryItem.updateMany({
                                where: {
                                    deliveryOrderItemId: item.id,
                                    status: 'RESERVED' // CR2: explicitly exclude RMA items
                                },
                                data: { status: 'AVAILABLE', deliveryOrderItemId: null }
                            })
                        }
                    }
                    // Update status and other common fields
                    await tx.deliveryOrder.update({
                        where: { id: params.id },
                        data: { 
                            status: 'CANCELLED',
                            notes: notes !== undefined ? notes : undefined,
                            deliveryAddress: deliveryAddress !== undefined ? deliveryAddress : undefined,
                            invoiceNumber: invoiceNumber !== undefined ? invoiceNumber : undefined,
                            salesRepId: salesRepId !== undefined ? salesRepId : undefined,
                            additionalCosts: additionalCosts !== undefined ? Number(additionalCosts) : undefined,
                            invoiceValue: invoiceValue !== undefined ? Number(invoiceValue) : undefined,
                            saleType: (body as any).saleType,
                            endCustomerId: (body as any).endCustomerId,
                            endCustomerName: (body as any).endCustomerName,
                        } as any
                    })
                })

                // F5: Audit log for cancellation
                const { logCreate } = await import('@/lib/audit')
                await logCreate('DELIVERY_ORDER', params.id, user.id, user.name, {
                    event: 'CANCELLED',
                    orderNumber: order.orderNumber,
                    customerName: order.customerName,
                })

                // Notify TECHNICAL and SALES-MGR
                try {
                    const [techRole, salesMgrRole] = await Promise.all([
                        prisma.role.findUnique({ where: { name: 'TECHNICAL' } }),
                        prisma.role.findUnique({ where: { name: 'SALES-MGR' } })
                    ]);

                    const itemsList = order.items.map(i => `- ${i.product?.name} (Qty: ${i.quantity})`).join('\n');
                    const content = `Delivery Order ${order.orderNumber} has been CANCELLED.\n\n` +
                        `End Customer: ${order.endCustomerName || order.customerName}\n` +
                        `Partner: ${order.customerName}\n` +
                        `Items:\n${itemsList}\n` +
                        `Expected Delivery: ${order.updatedAt ? format(new Date(order.updatedAt), 'dd MMM yyyy') : 'N/A'}`;

                    const metadata = {
                        deliveryOrderNumber: order.orderNumber,
                        customerName: (body as any).endCustomerName || order.endCustomerName || customerName || order.customerName,
                        partnerName: ((body as any).saleType || order.saleType) === 'PARTNER' ? (customerName || order.customerName) : null,
                        invoiceNumber: invoiceNumber !== undefined ? invoiceNumber : (order.invoiceNumber || null)
                    };
                    if (techRole) await sendSystemMessage({ subject: `DO CANCELLED: ${order.orderNumber}`, content, recipientRoleId: techRole.id, category: 'UPDATE', priority: 'HIGH', senderId: user.id, ...metadata });
                    if (salesMgrRole) await sendSystemMessage({ subject: `DO CANCELLED: ${order.orderNumber}`, content, recipientRoleId: salesMgrRole.id, category: 'UPDATE', priority: 'HIGH', senderId: user.id, ...metadata });
                } catch (err) {
                    console.error('Failed to send cancellation notification:', err);
                }

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
                            product: { include: { serviceDefinition: true } },
                            details: true
                        }
                    })

                    for (const item of finalItems) {
                        const serviceType = item.product?.serviceDefinition?.type;
                        const isService = !!serviceType;
                        const isRental = serviceType === 'RENTAL';

                        if (isService) {
                            console.log(`[SERVICE_ACTIVATION] Starting activation for DO ${currentOrder.orderNumber}, Product: ${item.product.sku} (Type: ${serviceType})`);

                            // 1. Activate Service Contract / Rental Agreement
                            try {
                                const contract = await activateServiceContract({
                                    customerId: (currentOrder.saleType === 'PARTNER' && currentOrder.endCustomerId) ? currentOrder.endCustomerId : currentOrder.customerId!,
                                    partnerId: (currentOrder.saleType === 'PARTNER') ? currentOrder.customerId! : undefined,
                                    productId: item.productId!,
                                    startDate: (item as any).serviceStartDate!,
                                    description: `${isRental ? 'Rental' : 'Service'} fulfilled via Delivery Order ${currentOrder.orderNumber}`,
                                    contractValue: item.unitPrice,
                                    invoiceReference: currentOrder.invoiceNumber || currentOrder.orderNumber || 'N/A',
                                    salesRepId: currentOrder.salesRepId || undefined,
                                    productModel: (item as any).details?.[0]?.modelName || 'Multiple',
                                    coveredSerials: (item as any).details?.map((d: any) => d.serialNumbers).join(', '),
                                    items: (item as any).details?.map((d: any) => ({
                                        modelName: d.modelName,
                                        serialNumbers: d.serialNumbers
                                    }))
                                }, tx)

                                console.log(`[SERVICE_ACTIVATION] Successfully activated ${serviceType} contract for ${item.product.sku}`);

                                // 2. If physical items are allocated to this service/rental
                                if (item.reservedItems.length > 0) {
                                    for (const reserved of item.reservedItems) {
                                        // Update Inventory Status
                                        await tx.inventoryItem.update({
                                            where: { id: reserved.id },
                                            data: { status: isRental ? 'LOANED' : 'SOLD' }
                                        })

                                        // If RENTAL, link to RentalAsset dashboard
                                        if (isRental) {
                                            await tx.rentalAsset.upsert({
                                                where: { serialNumber: reserved.serialNumber },
                                                create: {
                                                    name: item.product.name,
                                                    serialNumber: reserved.serialNumber,
                                                    productId: item.productId,
                                                    status: 'RENTED',
                                                    currentContractId: contract.id
                                                },
                                                update: {
                                                    status: 'RENTED',
                                                    currentContractId: contract.id,
                                                    productId: item.productId,
                                                    isDeleted: false
                                                }
                                            })
                                        }

                                        // Log physical transaction
                                        await tx.transactionLog.create({
                                            data: {
                                                type: 'ISSUE',
                                                referenceType: 'DELIVERY_ORDER',
                                                referenceId: currentOrder.id,
                                                productId: item.productId,
                                                serialNumber: reserved.serialNumber,
                                                quantity: 1,
                                                unitCost: item.unitPrice,
                                                notes: `${isRental ? 'Rental asset loaned' : 'Service hardware sold'} via DO ${currentOrder.orderNumber}`
                                            }
                                        })
                                    }
                                } else {
                                    // Log pure service transaction (no physical asset)
                                    await tx.transactionLog.create({
                                        data: {
                                            type: 'ISSUE',
                                            referenceType: 'DELIVERY_ORDER',
                                            referenceId: currentOrder.id,
                                            productId: item.productId,
                                            serialNumber: isRental ? 'RENTAL-VIRTUAL' : 'SERVICE',
                                            quantity: item.quantity,
                                            unitCost: item.unitPrice,
                                            notes: `${serviceType} fulfilled via DO ${currentOrder.orderNumber}`
                                        }
                                    })
                                }

                            } catch (error: any) {
                                console.error(`[SERVICE_ACTIVATION] FAILED for ${item.product.sku}:`, error.message);
                                throw error; // Re-throw to ensure transaction integrity
                            }
                        } else if (item.reservedItems.length > 0) {
                            // Standard hardware sale
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

                    // 4. Update Status and common fields
                    await tx.deliveryOrder.update({
                        where: { id: params.id },
                        data: { 
                            status: 'COMPLETED',
                            notes: notes !== undefined ? notes : undefined,
                            deliveryAddress: deliveryAddress !== undefined ? deliveryAddress : undefined,
                            invoiceNumber: invoiceNumber !== undefined ? invoiceNumber : undefined,
                            salesRepId: salesRepId !== undefined ? salesRepId : undefined,
                            additionalCosts: additionalCosts !== undefined ? Number(additionalCosts) : undefined,
                            invoiceValue: invoiceValue !== undefined ? Number(invoiceValue) : undefined,
                            saleType: (body as any).saleType,
                            endCustomerId: (body as any).endCustomerId,
                            endCustomerName: (body as any).endCustomerName,
                        } as any
                    })
                }, {
                    maxWait: 10000,
                    timeout: 60000
                })

                // F4: Audit log for DO completion
                const { logCreate: logCompleted } = await import('@/lib/audit')
                await logCompleted('DELIVERY_ORDER', params.id, user.id, user.name, {
                    event: 'COMPLETED',
                    orderNumber: order.orderNumber,
                    customerName: order.customerName,
                })

                // Notify SALES (Owner), TECHNICAL, and SALES-MGR
                try {
                    const [techRole, salesMgrRole] = await Promise.all([
                        prisma.role.findUnique({ where: { name: 'TECHNICAL' } }),
                        prisma.role.findUnique({ where: { name: 'SALES-MGR' } })
                    ]);

                    const itemsList = order.items.map(i => `- ${i.product?.name} (Qty: ${i.quantity})`).join('\n');
                    const content = `Delivery Order ${order.orderNumber} has been COMPLETED/SHIPPED.\n\n` +
                        `End Customer: ${order.endCustomerName || order.customerName}\n` +
                        `Partner: ${order.customerName}\n` +
                        `Items:\n${itemsList}\n` +
                        `Expected Delivery: ${order.updatedAt ? format(new Date(order.updatedAt), 'dd MMM yyyy') : 'N/A'}`;

                    const metadata = {
                        deliveryOrderNumber: order.orderNumber,
                        customerName: (body as any).endCustomerName || order.endCustomerName || customerName || order.customerName,
                        partnerName: ((body as any).saleType || order.saleType) === 'PARTNER' ? (customerName || order.customerName) : null,
                        invoiceNumber: invoiceNumber !== undefined ? invoiceNumber : (order.invoiceNumber || null)
                    };
                    if (order.salesRepId) await sendSystemMessage({ subject: `DO COMPLETED: ${order.orderNumber}`, content, recipientUserId: order.salesRepId, category: 'UPDATE', priority: 'MEDIUM', senderId: user.id, ...metadata });
                    if (techRole) await sendSystemMessage({ subject: `DO COMPLETED: ${order.orderNumber}`, content, recipientRoleId: techRole.id, category: 'UPDATE', priority: 'MEDIUM', senderId: user.id, ...metadata });
                    if (salesMgrRole) await sendSystemMessage({ subject: `DO COMPLETED: ${order.orderNumber}`, content, recipientRoleId: salesMgrRole.id, category: 'UPDATE', priority: 'MEDIUM', senderId: user.id, ...metadata });
                } catch (err) {
                    console.error('Failed to send completion notification:', err);
                }

                // --- WhatsApp Alerts ---
                try {
                    // 1. Shipment Alert
                    if (order.customerId) {
                        const customer = await prisma.customer.findUnique({ where: { id: order.customerId } })
                        if (customer?.phone) {
                            sendDeliveryShippedAlert(customer.phone, order.orderNumber).catch(async (err) => {
                                console.error('[WhatsApp] Shipment alert failed:', err)
                                // Log failure so it's traceable in Audit Logs
                                const { logCreate: logError } = await import('@/lib/audit')
                                await logError('DELIVERY_ORDER', params.id, user.id, user.name, {
                                    event: 'WHATSAPP_ALERT_FAILED',
                                    alertType: 'SHIPMENT',
                                    error: err?.message || String(err)
                                }).catch(console.error)
                            })
                        }
                    }

                    // 2. Low Stock Alerts — batch all products in one query
                    const doItems = await prisma.deliveryOrderItem.findMany({
                        where: { deliveryOrderId: params.id },
                        select: { productId: true }
                    })
                    const productIds = doItems.map(i => i.productId).filter(Boolean) as string[]

                    if (productIds.length > 0) {
                        const products = await prisma.product.findMany({
                            where: { id: { in: productIds }, minStock: { gt: 0 } },
                            select: { id: true, name: true, minStock: true, _count: { select: { inventory: { where: { status: 'AVAILABLE' } } } } }
                        })

                        for (const product of products) {
                            if (product._count.inventory < (product.minStock ?? 0)) {
                                sendLowStockAlert(product.name, product._count.inventory, product.minStock!).catch(async (err) => {
                                    console.error('[WhatsApp] Low-stock alert failed:', err)
                                })
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
                data: { 
                    status: status || order.status,
                    invoiceNumber: invoiceNumber !== undefined ? invoiceNumber : order.invoiceNumber
                }
            })

            // Notify for CONFIRMED/READY_FOR_BUILD
            if (status === 'CONFIRMED' || status === 'READY_FOR_BUILD') {
                try {
                    const [techRole, salesMgrRole] = await Promise.all([
                        prisma.role.findUnique({ where: { name: 'TECHNICAL' } }),
                        prisma.role.findUnique({ where: { name: 'SALES-MGR' } })
                    ]);

                    const itemsList = order.items.map(i => `- ${i.product?.name} (Qty: ${i.quantity})`).join('\n');
                    const content = `Delivery Order ${order.orderNumber} is now ${status}.\n\n` +
                        `End Customer: ${order.endCustomerName || order.customerName}\n` +
                        `Partner: ${order.customerName}\n` +
                        `Items:\n${itemsList}\n` +
                        `Expected Delivery: ${order.updatedAt ? format(new Date(order.updatedAt), 'dd MMM yyyy') : 'N/A'}`;

                    const metadata = {
                        deliveryOrderNumber: order.orderNumber,
                        customerName: (body as any).endCustomerName || order.endCustomerName || customerName || order.customerName,
                        partnerName: ((body as any).saleType || order.saleType) === 'PARTNER' ? (customerName || order.customerName) : null,
                        invoiceNumber: invoiceNumber !== undefined ? invoiceNumber : (order.invoiceNumber || null)
                    };
                    if (techRole) await sendSystemMessage({ subject: `DO ${status}: ${order.orderNumber}`, content, recipientRoleId: techRole.id, category: 'UPDATE', priority: 'HIGH', senderId: user.id, ...metadata });
                    if (salesMgrRole) await sendSystemMessage({ subject: `DO ${status}: ${order.orderNumber}`, content, recipientRoleId: salesMgrRole.id, category: 'UPDATE', priority: 'HIGH', senderId: user.id, ...metadata });
                } catch (err) {
                    console.error('Failed to send status update notification:', err);
                }
            }

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
                        additionalCosts: additionalCosts !== undefined ? Number(additionalCosts) : undefined,
                        buildInstructions: buildInstructions !== undefined ? buildInstructions : undefined,
                        deliveryInstructions: deliveryInstructions !== undefined ? deliveryInstructions : undefined,
                        additionalContact: additionalContact !== undefined ? additionalContact : undefined,
                        deliveryCharges: ((user as any).role?.name === 'ADMIN' || (user as any).role?.name === 'ACC-MGR') && deliveryCharges !== undefined ? Number(deliveryCharges) : undefined
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
                                unitPrice: Number(item.unitPrice),
                                details: {
                                    deleteMany: {},
                                    create: item.details?.map((d: any) => ({
                                        modelName: d.modelName,
                                        serialNumbers: d.serialNumbers
                                    })) || []
                                }
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
                                isBackorder: false,
                                details: {
                                    create: item.details?.map((d: any) => ({
                                        modelName: d.modelName,
                                        serialNumbers: d.serialNumbers
                                    })) || []
                                }
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
                additionalCosts: additionalCosts !== undefined ? Number(additionalCosts) : undefined,
                buildInstructions: buildInstructions !== undefined ? buildInstructions : undefined,
                deliveryInstructions: deliveryInstructions !== undefined ? deliveryInstructions : undefined,
                additionalContact: additionalContact !== undefined ? additionalContact : undefined,
                deliveryCharges: ((user as any).role?.name === 'ADMIN' || (user as any).role?.name === 'ACC-MGR') && deliveryCharges !== undefined ? Number(deliveryCharges) : undefined
            } as any
        })
        return NextResponse.json(updated)

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
