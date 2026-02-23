import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET() {
    try {
        await requireAuth()

        const dateStr = new Date().toISOString().slice(2, 7).replace('-', '')

        // Find existing quotes from today to avoid immediate collisions
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
        const suggestedNumber = `QT-${dateStr}-${random}`

        return NextResponse.json({ suggestedNumber })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
