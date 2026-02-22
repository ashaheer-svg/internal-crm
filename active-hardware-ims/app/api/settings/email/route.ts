import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePermission } from '@/lib/auth'

export async function GET() {
    try {
        await requirePermission('settings:manage')

        const settings = await (prisma as any).systemSetting.findMany({
            where: {
                key: {
                    in: ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_SECURE', 'SMTP_FROM']
                }
            }
        })

        // Convert array to object for easier consumption
        const config: Record<string, string> = {}
        settings.forEach((s: any) => {
            config[s.key] = s.value
        })

        // Return with defaults if missing
        return NextResponse.json({
            host: config['SMTP_HOST'] || '',
            port: config['SMTP_PORT'] || '587',
            user: config['SMTP_USER'] || '',
            secure: config['SMTP_SECURE'] === 'true',
            from: config['SMTP_FROM'] || '',
            hasPassword: !!(await (prisma as any).systemSetting.findUnique({ where: { key: 'SMTP_PASS' } }))
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        await requirePermission('settings:manage')
        const body = await request.json()
        const { host, port, user, pass, secure, from } = body

        const updates = [
            { key: 'SMTP_HOST', value: host },
            { key: 'SMTP_PORT', value: port.toString() },
            { key: 'SMTP_USER', value: user },
            { key: 'SMTP_SECURE', value: secure ? 'true' : 'false' },
            { key: 'SMTP_FROM', value: from }
        ]

        if (pass) {
            updates.push({ key: 'SMTP_PASS', value: pass })
        }

        // Batch upsert
        for (const item of updates) {
            await (prisma as any).systemSetting.upsert({
                where: { key: item.key },
                update: { value: item.value },
                create: { key: item.key, value: item.value }
            })
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
