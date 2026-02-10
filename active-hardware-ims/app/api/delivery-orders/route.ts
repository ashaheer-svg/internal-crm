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

        // Start transaction
        const order = await prisma.$transaction(async (tx) => {
            // Create Delivery Order
            const newOrder = await tx.deliveryOrder.create({
                data: {
                    orderNumber,
                    customerId,
                    customerName,
                    notes,
                    status: 'DRAFT',
                    items: {
                        create: items.map((item: any) => ({
                            productId: item.productId,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            isBackorder: false // Initially false, updated on allocation
                        }))
                    }
                },
                include: {
                    items: true
                }
            })

            // Note: We are NOT allocating inventory here yet. That happens in the Edit/Allocate step.
            // Items are created as "Requirements".

            return newOrder
        })

        return NextResponse.json(order)
    } catch (error: any) {
        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'Delivery Order Number must be unique' }, { status: 400 })
        }
        return NextResponse.json(
            { error: error.message || 'Failed to create delivery order' },
            { status: 500 }
        )
    }
}
