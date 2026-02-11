
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(request: Request) {
    try {
        await requireAuth()
        const { searchParams } = new URL(request.url)
        const type = searchParams.get('type')
        const activeOnly = searchParams.get('active') === 'true'

        const where: any = {}
        if (type) where.type = type
        if (activeOnly) where.isActive = true

        const partners = await prisma.partner.findMany({
            where,
            orderBy: { name: 'asc' }
        })

        return NextResponse.json(partners)
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        await requireAuth()
        const body = await request.json()
        const { name, email, phone, address, type } = body

        if (!name || !type) {
            return NextResponse.json({ error: 'Name and Type are required' }, { status: 400 })
        }

        const partner = await prisma.partner.create({
            data: {
                name,
                email,
                phone,
                address,
                type,
                isActive: true
            }
        })

        return NextResponse.json(partner)
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
