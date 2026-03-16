import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(request: Request) {
    try {
        await requireAuth()
        const { searchParams } = new URL(request.url)
        const search = searchParams.get('q') || ''

        const where: any = {
            isActive: true
        }

        if (search) {
            where.OR = [
                { name: { contains: search } },
                { email: { contains: search } }
            ]
        }

        const users = await prisma.user.findMany({
            where,
            select: {
                id: true,
                name: true,
                email: true
            },
            orderBy: { name: 'asc' },
            take: 20
        })

        return NextResponse.json(users)
    } catch (error: any) {
        console.error('Users Lookup Error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to fetch users' },
            { status: error.message === 'Unauthorized' ? 401 : 500 }
        )
    }
}
