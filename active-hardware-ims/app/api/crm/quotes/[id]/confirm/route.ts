import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        await requireAuth()
        const { id } = await params

        const quote = await prisma.cRMQuote.update({
            where: { id },
            data: {
                status: 'ACCEPTED'
            }
        })

        // Optionally, we could update the Project Status to WON here if desired
        // For now, just mark quote as Accepted.

        return NextResponse.json(quote)

    } catch (error: any) {
        console.error('Failed to confirm quote:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to confirm quote' },
            { status: 500 }
        )
    }
}
