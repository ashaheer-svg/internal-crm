import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { getNextSequence } from '@/lib/sequences'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const productId = searchParams.get('productId')
        const status = searchParams.get('status')
        const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : null
        const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : null
        const search = searchParams.get('search')
        const sortKey = searchParams.get('sortKey') || 'createdAt'
        const sortDir = (searchParams.get('sortDir') as 'asc' | 'desc') || 'desc'

        const where: any = {}
        if (productId) {
            where.items = {
                some: { productId }
            }
        }
        if (status) {
            where.status = { in: status.split(',') }
        }
        if (search) {
            where.OR = [
                { poNumber: { contains: search } },
                { supplier: { contains: search } },
                { notes: { contains: search } },
            ]
        }

        const orderBy: any = {}
        if (sortKey === 'date') orderBy.createdAt = sortDir
        else if (sortKey === 'amount') orderBy.totalAmount = sortDir
        else orderBy[sortKey] = sortDir

        const include = {
            items: {
                include: {
                    product: true
                }
            }
        }

        if (page && limit) {
            const skip = (page - 1) * limit
            const [purchaseOrders, total] = await Promise.all([
                prisma.purchaseOrder.findMany({
                    where,
                    orderBy,
                    skip,
                    take: limit,
                    include
                }),
                prisma.purchaseOrder.count({ where })
            ])
            return NextResponse.json({
                purchaseOrders,
                meta: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit)
                }
            })
        }

        const purchaseOrders = await prisma.purchaseOrder.findMany({
            where,
            orderBy,
            include
        })
        return NextResponse.json(purchaseOrders)
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch purchase orders' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const user = await requireAuth() // Need user for logging
        const body = await request.json()
        const { poNumber, supplier, items, notes, poDate } = body

        if (!supplier || !items || items.length === 0) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Calculate total
        const totalAmount = items.reduce((sum: number, item: any) => sum + item.totalCost, 0)

        // Generate from sequence
        let finalPoNumber = poNumber
        if (!finalPoNumber) {
            finalPoNumber = await getNextSequence('PO', true)
        } else {
            // If user provided a number (e.g. from the auto-suggested field), 
            // we should still ensure the sequence is updated/consumed if it matches the current next number.
            // For simplicity and to match the user's requirement of "sequential auto generation",
            // we'll explicitly increment it here.
            await import('@/lib/sequences').then(m => m.incrementSequence('PO'))
        }

        const purchaseOrder = await prisma.purchaseOrder.create({
            data: {
                poNumber: finalPoNumber,
                supplier,
                totalAmount,
                status: 'DRAFT',
                notes,
                createdAt: poDate ? new Date(poDate) : undefined,
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

        // Audit Log
        const { logCreate } = await import('@/lib/audit')
        await logCreate('PURCHASE_ORDER', purchaseOrder.id, user.id, user.name, {
            poNumber: purchaseOrder.poNumber,
            supplier: purchaseOrder.supplier,
            totalAmount: purchaseOrder.totalAmount
        })

        return NextResponse.json(purchaseOrder)
    } catch (error: any) {
        console.error('Error creating PO:', error)

        // Handle Prisma unique constraint error
        if (error.code === 'P2002' && error.meta?.target?.includes('poNumber')) {
            return NextResponse.json({ error: 'A purchase order with this number already exists' }, { status: 409 }) // 409 Conflict
        }

        return NextResponse.json(
            { error: error.message || 'Failed to create purchase order' },
            { status: 500 }
        )
    }
}
