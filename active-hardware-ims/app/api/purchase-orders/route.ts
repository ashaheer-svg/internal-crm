import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const productId = searchParams.get('productId')
        const status = searchParams.get('status')

        const where: any = {}
        if (productId) {
            where.items = {
                some: { productId }
            }
        }
        if (status) {
            where.status = status
        }

        const purchaseOrders = await prisma.purchaseOrder.findMany({
            where,
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

        let finalPoNumber = poNumber

        if (!finalPoNumber) {
            // Generate from sequence
            const date = new Date()
            const year = date.getFullYear().toString().slice(-2)
            const month = (date.getMonth() + 1).toString().padStart(2, '0')
            const currentYearMonth = `${year}${month}`

            // Transaction to safely get and increment
            const sequence = await prisma.sequence.upsert({
                where: { id: 'PO' },
                update: {},
                create: {
                    id: 'PO',
                    prefix: 'PO-',
                    nextNumber: 1,
                    lastYearMonth: currentYearMonth
                }
            })

            let nextNum = sequence.nextNumber
            if (sequence.lastYearMonth !== currentYearMonth) {
                nextNum = 1
            }

            finalPoNumber = `${sequence.prefix}${currentYearMonth}-${nextNum.toString().padStart(4, '0')}`

            // Increment sequence
            await prisma.sequence.update({
                where: { id: 'PO' },
                data: {
                    nextNumber: nextNum + 1,
                    lastYearMonth: currentYearMonth
                }
            })
        }

        const purchaseOrder = await prisma.purchaseOrder.create({
            data: {
                poNumber: finalPoNumber,
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
