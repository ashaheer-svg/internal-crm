import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
    try {
        // Only ADMIN and MANAGER can view audit logs
        await requirePermission('audit_logs:read')

        const { searchParams } = new URL(request.url)
        const action = searchParams.get('action')
        const entityType = searchParams.get('entityType')
        const search = searchParams.get('search')
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '50')
        const skip = (page - 1) * limit
        const sortKey = searchParams.get('sortKey') || 'createdAt'
        const sortDir = searchParams.get('sortDir') || 'desc'

        const where: any = {}
        if (action && action !== 'ALL') where.action = action
        if (entityType) where.entityType = entityType
        if (search) {
            where.OR = [
                { userName: { contains: search } },
                { entityType: { contains: search } },
                { action: { contains: search } }
            ]
        }

        const orderBy: any = {}
        if (sortKey === 'date') orderBy.createdAt = sortDir
        else if (sortKey === 'user') orderBy.userName = sortDir
        else if (sortKey === 'action') orderBy.action = sortDir
        else if (sortKey === 'entity') orderBy.entityType = sortDir
        else orderBy[sortKey] = sortDir

        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                where,
                orderBy,
                skip,
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
            }),
            prisma.auditLog.count({ where })
        ])

        return NextResponse.json({
            logs,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        })
    } catch (error: any) {
        console.error('Fetch audit logs error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to fetch audit logs' },
            { status: error.message === 'Forbidden' ? 403 : 500 }
        )
    }
}
