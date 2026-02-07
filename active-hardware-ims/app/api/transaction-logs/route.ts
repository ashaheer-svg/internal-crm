import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
    try {
        const logs = await prisma.transactionLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: 100 // Limit to last 100 transactions
        })
        return NextResponse.json(logs)
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
