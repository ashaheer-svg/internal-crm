import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
    try {
        const purchaseOrders = await prisma.purchaseOrder.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                items: {
                    include: {
                        product: true
                    }
                }
            }
        })
        return NextResponse.json(purchaseOrders)
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch purchase orders' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { poNumber, supplier, items, notes } = body

        if (!poNumber || !supplier || !items || items.length === 0) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Calculate total
        const totalAmount = items.reduce((sum: number, item: any) => sum + item.totalCost, 0)

        const purchaseOrder = await prisma.purchaseOrder.create({
            data: {
                poNumber,
                supplier,
                totalAmount,
                status: 'DRAFT',
                notes,
                items: {
                    create: items.map((item: any) => ({
                        productId: item.productId,
                        quantity: item.quantity,
                        unitCost: item.unitCost,
                        totalCost: item.totalCost
                    }))
                }
            },
            include: {
                items: {
                    include: {
                        product: true
                    }
                }
            }
        })

        return NextResponse.json(purchaseOrder)
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: 'Failed to create purchase order' }, { status: 500 })
    }
}
