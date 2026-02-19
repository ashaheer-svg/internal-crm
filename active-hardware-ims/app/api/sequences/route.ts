import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(request: Request) {
    try {
        await requireAuth()
        const sequences = await prisma.sequence.findMany()
        return NextResponse.json(sequences)
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch sequences' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        await requireAuth()
        const body = await request.json()
        const { type, consume = false } = body // type: "PO", "GRN", "DO", "PROJ"

        if (!type || !["PO", "GRN", "DO", "PROJ"].includes(type)) {
            return NextResponse.json({ error: 'Invalid sequence type' }, { status: 400 })
        }

        const now = new Date()
        const year = now.getFullYear().toString().slice(-2)
        const month = (now.getMonth() + 1).toString().padStart(2, '0')
        const currentYearMonth = `${year}${month}`

        // Find or create sequence
        let sequence = await prisma.sequence.findUnique({
            where: { id: type }
        })

        if (!sequence) {
            let prefix = 'PO-'
            if (type === 'GRN') prefix = 'GRN-'
            if (type === 'DO') prefix = 'DO-'
            if (type === 'PROJ') prefix = 'PROJ-'

            sequence = await prisma.sequence.create({
                data: {
                    id: type,
                    prefix,
                    nextNumber: 1,
                    lastYearMonth: currentYearMonth
                }
            })
        }

        // Logic to reset if month changed
        let nextNum = sequence.nextNumber
        let lastYM = sequence.lastYearMonth

        if (lastYM !== currentYearMonth) {
            nextNum = 1
            lastYM = currentYearMonth
        }

        const formattedNumber = `${sequence.prefix}${currentYearMonth}-${nextNum.toString().padStart(4, '0')}`

        if (consume) {
            await prisma.sequence.update({
                where: { id: type },
                data: {
                    nextNumber: nextNum + 1,
                    lastYearMonth: lastYM
                }
            })
        }

        return NextResponse.json({ number: formattedNumber })
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Failed to generate sequence' }, { status: 500 })
    }
}

export async function PUT(request: Request) {
    try {
        const user = await requireAuth()
        // Admin only ideally

        const body = await request.json()
        const { id, nextNumber } = body

        if (!id || !nextNumber) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const now = new Date()
        const year = now.getFullYear().toString().slice(-2)
        const month = (now.getMonth() + 1).toString().padStart(2, '0')
        const currentYearMonth = `${year}${month}`

        let prefix = 'PO-'
        if (id === 'GRN') prefix = 'GRN-'
        if (id === 'DO') prefix = 'DO-'
        if (id === 'PROJ') prefix = 'PROJ-'

        const sequence = await prisma.sequence.upsert({
            where: { id },
            update: { nextNumber: Number(nextNumber) },
            create: {
                id,
                prefix,
                nextNumber: Number(nextNumber),
                lastYearMonth: currentYearMonth
            }
        })

        return NextResponse.json(sequence)
    } catch (error: any) {
        return NextResponse.json({ error: 'Failed to update sequence' }, { status: 500 })
    }
}
