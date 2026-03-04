import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth, requirePermission } from '@/lib/auth'
import { logUpdate } from '@/lib/audit'

export async function GET() {
    try {
        await requireAuth() // Any authenticated user can check maintenance mode

        const setting = await (prisma as any).systemSetting.findUnique({
            where: { key: 'MAINTENANCE_MODE' }
        })

        return NextResponse.json({
            enabled: setting?.value === 'true'
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const user = await requirePermission('settings:manage')
        const { enabled } = await request.json()

        const before = await (prisma as any).systemSetting.findUnique({
            where: { key: 'MAINTENANCE_MODE' }
        })

        const setting = await (prisma as any).systemSetting.upsert({
            where: { key: 'MAINTENANCE_MODE' },
            update: { value: enabled ? 'true' : 'false' },
            create: {
                key: 'MAINTENANCE_MODE',
                value: enabled ? 'true' : 'false'
            }
        })

        // Audit Log
        await logUpdate('SYSTEM_SETTING', 'MAINTENANCE_MODE', user.id, user.name, before, setting)

        return NextResponse.json({
            success: true,
            enabled: setting.value === 'true'
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
