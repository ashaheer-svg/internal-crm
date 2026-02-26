import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePermission } from '@/lib/auth'

export async function GET() {
    try {
        await requirePermission('locations:read')
        const locations = await prisma.location.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { inventory: true }
                }
            }
        })
        return NextResponse.json(locations)
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        await requirePermission('locations:manage')
        const body = await request.json()
        const { name, type, address } = body

        if (!name || !type) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const location = await prisma.location.create({
            data: {
                name,
                type, // 'PHYSICAL' | 'VIRTUAL'
                address
            }
        })

        return NextResponse.json(location)
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create location' }, { status: 500 })
    }
}
