import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { getNextSequence, SequenceType } from '@/lib/sequences'

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
        const { type, consume = false } = body // type: "PO", "GRN", "DO", "QUOTE", "INV", "PROJ"

        if (!type) {
            return NextResponse.json({ error: 'Invalid sequence type' }, { status: 400 })
        }

        // Map PROJ to sequence PROJ
        const seqType = (type === 'PROJ' ? 'PROJ' : type) as SequenceType
        
        const number = await getNextSequence(seqType, consume)

        return NextResponse.json({ number })
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Failed to generate sequence' }, { status: 500 })
    }
}

export async function PUT(request: Request) {
    try {
        await requireAuth()
        const body = await request.json()
        const { id, nextNumber } = body

        if (!id || nextNumber === undefined) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const now = new Date()
        const year = now.getFullYear().toString().slice(-2)
        const month = (now.getMonth() + 1).toString().padStart(2, '0')
        const currentYearMonth = `${year}${month}`

        const prefixes: Record<string, string> = {
            'PO': 'PO-',
            'PROJ': 'PROJ-',
            'DO': 'DO-',
            'QUOTE': 'QT-',
            'INV': 'INV-',
            'GRN': 'GRN-'
        }

        const prefix = prefixes[id] || `${id}-`

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
