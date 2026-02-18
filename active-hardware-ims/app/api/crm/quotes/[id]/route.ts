import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(request: Request, context: unknown) {
    const { id } = (context as { params: { id: string } }).params;
    try {
        await requireAuth()

        const quote = await prisma.cRMQuote.findUnique({
            where: { id },
            include: {
                project: {
                    include: {
                        customer: true
                    }
                },
                items: {
                    include: {
                        product: true
                    }
                },
                createdBy: true
            }
        })

        if (!quote) {
            return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
        }

        return NextResponse.json(quote)

    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to fetch quote' },
            { status: 500 }
        )
    }
}
