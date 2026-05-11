import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { getNextSequence } from '@/lib/sequences'

export async function GET(request: Request) {
    try {
        await requireAuth()
        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status')
        const includeInactive = searchParams.get('includeInactive') === 'true'
        const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : null
        const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : null
        const search = searchParams.get('search')
        const sortKey = searchParams.get('sortKey') || 'createdAt'
        const sortDir = (searchParams.get('sortDir') as 'asc' | 'desc') || 'desc'
        const buildType = searchParams.get('buildType') // 'ALL', 'HARDWARE', 'SERVICE'

        const where: any = includeInactive ? {} : { isActive: true }

        if (status) {
            if (status.includes(',')) {
                where.status = { in: status.split(',') }
            } else {
                where.status = status
            }
        }

        if (buildType === 'SERVICE') {
            where.items = {
                some: {
                    product: {
                        serviceDefinition: { isNot: null }
                    }
                }
            }
        } else if (buildType === 'HARDWARE') {
            where.items = {
                none: {
                    product: {
                        serviceDefinition: { isNot: null }
                    }
                }
            }
        }

        if (search) {
            where.OR = [
                { orderNumber: { contains: search } },
                { customerName: { contains: search } },
                { endCustomerName: { contains: search } },
                { notes: { contains: search } },
            ]
        }

        const orderBy: any = {}
        if (sortKey === 'date') orderBy.createdAt = sortDir
        else if (sortKey === 'amount') orderBy.invoiceValue = sortDir
        else orderBy[sortKey] = sortDir

        const include = {
            items: {
                include: {
                    product: {
                        include: {
                            serviceDefinition: true
                        }
                    },
                    details: true
                }
            },
            salesRep: true
        }

        // Always include count if pagination is requested or if it's the build queue
        if (page && limit) {
            const skip = (page - 1) * limit
            const [orders, total] = await Promise.all([
                prisma.deliveryOrder.findMany({
                    where,
                    orderBy,
                    skip,
                    take: limit,
                    include
                }),
                prisma.deliveryOrder.count({ where })
            ])

            const safeOrders = orders.map((order: any) => ({
                ...order,
                hasServiceItem: order.items?.some((i: any) => i.product?.serviceDefinition),
                _count: { items: order.items?.length || 0 }
            }))

            return NextResponse.json({
                deliveryOrders: safeOrders,
                meta: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit)
                }
            })
        }

        const orders = await prisma.deliveryOrder.findMany({
            where,
            orderBy,
            include
        })

        const safeOrders = orders.map((order: any) => ({
            ...order,
            hasServiceItem: order.items?.some((i: any) => i.product?.serviceDefinition),
            _count: { items: order.items?.length || 0 }
        }))

        return NextResponse.json(safeOrders)
    } catch (error: any) {
        console.error("Error fetching Delivery Orders:", error)
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
        const { orderNumber, customerId, customerName, saleType, endCustomerId, endCustomerName, notes, items, invoiceNumber, salesRepId, quoteReference, additionalCosts } = body

        if (!customerName) {
            return NextResponse.json({ error: 'Customer Name is required' }, { status: 400 })
        }

        let finalOrderNumber = orderNumber
        if (!finalOrderNumber) {
            finalOrderNumber = await getNextSequence('DO', true)
        } else {
            await import('@/lib/sequences').then(m => m.incrementSequence('DO'))
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
            const newOrder = await (tx as any).deliveryOrder.create({
                data: {
                    orderNumber: finalOrderNumber,
                    customerId,
                    customerName,
                    saleType: saleType || "DIRECT",
                    endCustomerId,
                    endCustomerName,
                    deliveryAddress: body.deliveryAddress,
                    invoiceValue: (Number(body.invoiceValue) || items.reduce((sum: number, i: any) => sum + (Number(i.unitPrice) * Number(i.quantity)), 0)) || 0,
                    invoiceNumber: invoiceNumber || null,
                    poNumber: body.poNumber || null,
                    salesRepId: salesRepId || null,
                    additionalCosts: Number(additionalCosts) || 0,
                    notes,
                    status: 'DRAFT',
                    quoteReference: quoteReference || null,
                    buildInstructions: body.buildInstructions || null,
                    deliveryInstructions: body.deliveryInstructions || null,
                    additionalContact: body.additionalContact || null,
                    deliveryCharges: body.deliveryCharges ? Number(body.deliveryCharges) : 0,
                    items: {
                        create: items.map((item: any) => ({
                            productId: item.productId,
                            quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
                            unitPrice: Number(item.unitPrice) || 0,
                            isBackorder: false,
                            details: {
                                create: item.details?.map((d: any) => ({
                                    modelName: d.modelName,
                                    serialNumbers: d.serialNumbers
                                })) || []
                            }
                        }))
                    }
                },
                include: {
                    items: {
                        include: {
                            product: {
                                include: {
                                    serviceDefinition: true
                                }
                            },
                            details: true
                        }
                    }
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
                    const doItem = (newOrder as any).items.find((i: any) => i.productId === backorderItem.productId)

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

        // Audit Log
        const { logCreate } = await import('@/lib/audit')
        await logCreate('DELIVERY_ORDER', order.id, user.id, user.name, {
            orderNumber: order.orderNumber,
            customerName: order.customerName,
            invoiceValue: order.invoiceValue
        })

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

