import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const type = searchParams.get('type') || null
        const search = searchParams.get('search') || ''
        const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : null
        const limit = Number(searchParams.get('limit')) || 200
        const dateFrom = searchParams.get('dateFrom')
        const dateTo = searchParams.get('dateTo')
        const sortKey = searchParams.get('sortKey') || 'createdAt'
        const sortDir = (searchParams.get('sortDir') as 'asc' | 'desc') || 'desc'

        const where: any = {}

        if (type && type !== 'ALL') {
            where.type = type
        }

        if (search) {
            where.OR = [
                { serialNumber: { contains: search, mode: 'insensitive' } },
                { performedBy: { contains: search, mode: 'insensitive' } },
                { notes: { contains: search, mode: 'insensitive' } },
                { referenceId: { contains: search, mode: 'insensitive' } },
                { referenceType: { contains: search, mode: 'insensitive' } },
            ]
        }

        if (dateFrom || dateTo) {
            where.createdAt = {
                ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
                ...(dateTo ? { lte: new Date(new Date(dateTo).setHours(23, 59, 59, 999)) } : {})
            }
        }

        const orderBy: any = {}
        if (sortKey === 'date') orderBy.createdAt = sortDir
        else if (sortKey === 'quantity') orderBy.quantity = sortDir
        else orderBy[sortKey] = sortDir

        let logs;
        let total = 0;

        if (page && limit) {
            const skip = (page - 1) * limit
            const [results, count] = await Promise.all([
                prisma.transactionLog.findMany({
                    where,
                    orderBy,
                    skip,
                    take: limit,
                }),
                prisma.transactionLog.count({ where })
            ])
            logs = results
            total = count
        } else {
            logs = await prisma.transactionLog.findMany({
                where,
                orderBy,
                take: limit,
            })
        }

        // Enrich with product names — TransactionLog has productId as a plain string (no Prisma relation)
        const productIds = [...new Set(logs.map(l => l.productId).filter(Boolean))] as string[]

        let productMap: Record<string, { name: string; sku: string; model?: string | null }> = {}
        if (productIds.length > 0) {
            const products = await prisma.product.findMany({
                where: { id: { in: productIds } },
                select: { id: true, name: true, sku: true, model: true }
            })
            productMap = Object.fromEntries(products.map(p => [p.id, p]))
        }

        const enriched = logs.map(log => ({
            ...log,
            product: log.productId ? (productMap[log.productId] ?? null) : null
        }))

        if (page && limit) {
            return NextResponse.json({
                logs: enriched,
                meta: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit)
                }
            })
        }

        return NextResponse.json(enriched)
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch transaction logs' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { type, referenceType, referenceId, productId, serialNumber, quantity, fromLocation, toLocation, unitCost, performedBy, notes } = body

        const log = await prisma.transactionLog.create({
            data: {
                type,
                referenceType,
                referenceId,
                productId,
                serialNumber,
                quantity: quantity || 1,
                fromLocation,
                toLocation,
                unitCost,
                performedBy,
                notes
            }
        })

        return NextResponse.json(log)
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create transaction log' }, { status: 500 })
    }
}
