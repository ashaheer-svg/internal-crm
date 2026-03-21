import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        await requireAuth()
        const logs = await prisma.auditLog.findMany({
            where: {
                entityType: 'DELIVERY_ORDER',
                entityId: params.id
            },
            orderBy: { createdAt: 'asc' }
        })

        return NextResponse.json(logs)
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
