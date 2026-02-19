import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(request: Request) {
    try {
        await requireAuth()
        const { searchParams } = new URL(request.url)
        const includeInactive = searchParams.get('includeInactive') === 'true'

        const where = includeInactive ? {} : { isActive: true }

        const orders = await prisma.deliveryOrder.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                // _count: {
                //    select: { items: true }
                // }
                items: true,
                salesRep: true
            }
        })

        // Manual map to safe structure
        const safeOrders = orders.map((order: any) => ({
            ...order,
            _count: { items: order.items?.length || 0 }
        }))

        return NextResponse.json(safeOrders)
    } catch (error: any) {
        console.error("Error fetching Delivery Orders:", error)
        console.error("Error Stack:", error.stack)
        return NextResponse.json(
            { error: error.message || 'Failed to fetch delivery orders' },
            { status: 500 }
        )
    }
}

export async function POST(request: Request) {
    try {
        const user = await requireAuth()
        const body = await request.json()
        const { orderNumber, customerId, customerName, saleType, endCustomerId, endCustomerName, notes, items, invoiceNumber, salesRepId } = body

        if (!orderNumber || !customerName) {
            return NextResponse.json({ error: 'Order Number and Customer Name are required' }, { status: 400 })
        }

        if (saleType === 'PARTNER' && !endCustomerId) {
            return NextResponse.json({ error: 'End Customer is required for Partner Sales' }, { status: 400 })
        }

        if (!items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: 'At least one item is required' }, { status: 400 })
        }

        console.log("Creating DO:", { orderNumber, customerId, saleType, itemsCount: items.length })

        // Start transaction
        const order = await prisma.$transaction(async (tx) => {
            // Check if Customer exists if ID provided
            if (customerId) {
                const customer = await tx.customer.findUnique({ where: { id: customerId } })
                if (!customer) {
                    throw new Error(`Customer with ID ${customerId} not found`)
                }
            }

            // Check End Customer if provided
            if (endCustomerId) {
                const endCustomer = await tx.customer.findUnique({ where: { id: endCustomerId } })
                if (!endCustomer) {
                    throw new Error(`End Customer with ID ${endCustomerId} not found`)
                }
            }

            // Create Delivery Order
            const newOrder = await tx.deliveryOrder.create({
                data: {
                    orderNumber,
                    customerId,
                    customerName,
                    saleType: saleType || "DIRECT",
                    endCustomerId,
                    endCustomerName,
                    deliveryAddress: body.deliveryAddress,
                    invoiceValue: Number(body.invoiceValue) || 0,
                    invoiceNumber: invoiceNumber || null,
                    salesRepId: salesRepId || null,
                    additionalCosts: Number(body.additionalCosts) || 0,
                    notes,
                    status: 'DRAFT',
                    items: {
                        create: items.map((item: any) => ({
                            productId: item.productId,
                            quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
                            unitPrice: Number(item.unitPrice) || 0,
                            isBackorder: false // Initially false, updated on allocation
                        }))
                    }
                },
                include: {
                    items: true
                }
            })

            // Handle Backorder Fulfillment if linked
            // We expect body.backorderId to be present
            const backorderId = body.backorderId
            if (backorderId) {
                const backorderItem = await tx.backorderItem.findUnique({
                    where: { id: backorderId }
                })

                if (backorderItem) {
                    // Find the matching item in the new DO
                    // We assume the backorder product is present in the items list
                    const doItem = newOrder.items.find((i: any) => i.productId === backorderItem.productId)

                    if (doItem) {
                        // LINK THE ITEMS
                        await tx.deliveryOrderItem.update({
                            where: { id: doItem.id },
                            data: { backorderItemId: backorderId } as any
                        })

                        const quantityAllocated = Math.max(1, Math.floor(Number(doItem.quantity) || 1))
                        const newFulfilled = backorderItem.quantityFulfilled + quantityAllocated
                        const newStatus = newFulfilled >= backorderItem.quantityOrdered ? 'FULFILLED' : 'PARTIAL'

                        await tx.backorderItem.update({
                            where: { id: backorderId },
                            data: {
                                quantityFulfilled: newFulfilled,
                                status: newStatus
                            }
                        })
                    }
                }
            }

            return newOrder
        })

        return newOrder
    })

    // Audit Log
    const { logCreate } = await import('@/lib/audit')
    // User info is available in requireAuth scope but we need to pass it or fetch it again?
    // requireAuth returns the user, so we should allow 'POST' to capture it.
    // Wait, I need to check if 'const user' is defined in POST.
    // It is NOT defined in the previous read. 'await requireAuth()' was called but result not assigned.
    // I need to fix that first or in this same edit.

    // Let's assume I fix the assignment in the same block or I can't access 'user'.
    // Actually, looking at the file content I read:
    // line 44: await requireAuth() -> result is NOT assigned.
    // So I must assign it: const user = await requireAuth()

    // I will do that in a separate edit or try to catch it here if I include line 44.
    // Let's look at the range. Line 148 is far from 44.
    // I will split this into two edits or just use a follow-up.
    // Actually, I can't log without user ID.
    // I'll update line 44 first, then add logging.

    return NextResponse.json(order)
} catch (error: any) {
    console.error("Error creating Delivery Order:", error)
    if (error.code === 'P2002') {
        return NextResponse.json({ error: 'Delivery Order Number must be unique' }, { status: 400 })
    }
    return NextResponse.json(
        { error: error.message || 'Failed to create delivery order' },
        { status: 500 }
    )
}
    }
}
