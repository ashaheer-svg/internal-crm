import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { sendTestEmail } from '@/lib/email'

/**
 * POST /api/settings/maintenance/backup-email/test
 * Sends a test email to verify SMTP configuration.
 * Body: { recipientEmail: string }
 */
export async function POST(request: Request) {
    try {
        const user = await requirePermission('settings:manage')
        const { recipientEmail } = await request.json()

        if (!recipientEmail) {
            return NextResponse.json({ error: 'recipientEmail is required' }, { status: 400 })
        }

        await sendTestEmail(recipientEmail)

        return NextResponse.json({ success: true, recipient: recipientEmail })

    } catch (error: any) {
        console.error('[Test Email] Failed:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
