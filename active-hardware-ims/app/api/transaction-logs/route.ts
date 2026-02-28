import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const type = searchParams.get('type') || null
        const search = searchParams.get('search') || ''
        const limit = Number(searchParams.get('limit')) || 200
        const dateFrom = searchParams.get('dateFrom')
        const dateTo = searchParams.get('dateTo')

        const where: any = {}

        if (type && type !== 'ALL') {
            where.type = type
        }

        if (search) {
            where.OR = [
                { serialNumber: { contains: search } },
                { performedBy: { contains: search } },
                { notes: { contains: search } },
                { referenceId: { contains: search } },
                { referenceType: { contains: search } },
            ]
        }

        if (dateFrom || dateTo) {
            where.createdAt = {
                ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
                ...(dateTo ? { lte: new Date(new Date(dateTo).setHours(23, 59, 59, 999)) } : {})
            }
        }

        const logs = await prisma.transactionLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: limit,
        })

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
