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
        const safeOrders = orders.map(order => ({
            ...order,
            _count: { items: order.items.length }
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
        await requireAuth()
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

            return newOrder
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
