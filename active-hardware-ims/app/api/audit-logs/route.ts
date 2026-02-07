import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
    try {
        // Only ADMIN and MANAGER can view audit logs
        await requireRole(['ADMIN', 'MANAGER'])

        const { searchParams } = new URL(request.url)
        const action = searchParams.get('action')
        const entityType = searchParams.get('entityType')
        const limit = parseInt(searchParams.get('limit') || '100')

        const where: any = {}
        if (action) where.action = action
        if (entityType) where.entityType = entityType

        const logs = await prisma.auditLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: {
                user: {
                    select: {
                        name: true,
                        email: true,
                        role: true
                    }
                }
            }
        })

        return NextResponse.json({ logs })
    } catch (error: any) {
        console.error('Fetch audit logs error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to fetch audit logs' },
            { status: error.message === 'Forbidden' ? 403 : 500 }
        )
    }
}
