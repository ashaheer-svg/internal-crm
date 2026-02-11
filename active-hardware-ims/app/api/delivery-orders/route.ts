import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET() {
    try {
        await requireAuth()

        const orders = await prisma.deliveryOrder.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { items: true }
                }
            }
        })
        return NextResponse.json(orders)
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
        await requireAuth()
        const body = await request.json()
        const { orderNumber, customerId, customerName, notes, items } = body

        if (!orderNumber || !customerName) {
            return NextResponse.json({ error: 'Order Number and Customer Name are required' }, { status: 400 })
        }

        if (!items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: 'At least one item is required' }, { status: 400 })
        }

        console.log("Creating DO:", { orderNumber, customerId, itemsCount: items.length })

        // Start transaction
        const order = await prisma.$transaction(async (tx) => {
            // Check if Customer exists if ID provided
            if (customerId) {
                const customer = await tx.customer.findUnique({ where: { id: customerId } })
                if (!customer) {
                    throw new Error(`Customer with ID ${customerId} not found`)
                }
            }

            // Create Delivery Order
            const newOrder = await tx.deliveryOrder.create({
                data: {
                    orderNumber,
                    customerId,
                    customerName,
                    deliveryAddress: body.deliveryAddress,
                    invoiceValue: Number(body.invoiceValue) || 0,
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
