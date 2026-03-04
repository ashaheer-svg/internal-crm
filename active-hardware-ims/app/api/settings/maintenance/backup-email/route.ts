import { NextResponse } from 'next/server'
import { requirePermission, requireAuth } from '@/lib/auth'
import { sendDailyBackupEmail } from '@/lib/email'
import { logCreate } from '@/lib/audit'

/**
 * POST /api/settings/maintenance/backup-email
 *
 * Creates a gzip DB backup and emails it as an attachment.
 * Body: { recipientEmail: string }
 *
 * Can be called by:
 *  - Admin user via the Settings > Maintenance UI
 *  - Linux cron: curl -X POST ... -H "Authorization: Bearer <CRON_SECRET>" -d '{"recipientEmail":"admin@co.com"}'
 */
export async function POST(request: Request) {
    try {
        // Allow both authenticated admin users AND cron with CRON_SECRET
        const cronSecret = process.env.CRON_SECRET
        const authHeader = request.headers.get('Authorization')
        const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`

        let performedBy = 'cron'
        let userId = 'system'

        if (!isCron) {
            const user = await requirePermission('settings:manage')
            performedBy = user.name
            userId = user.id
        }

        const body = await request.json().catch(() => ({}))
        const { recipientEmail } = body

        if (!recipientEmail) {
            return NextResponse.json({ error: 'recipientEmail is required' }, { status: 400 })
        }

        const { sizeMB, filename } = await sendDailyBackupEmail(recipientEmail)

        // Audit log the backup
        await logCreate('BACKUP', 'email-backup', userId, performedBy, {
            event: 'EMAIL_BACKUP_SENT',
            recipient: recipientEmail,
            filename,
            sizeMB,
            timestamp: new Date().toISOString()
        })

        return NextResponse.json({
            success: true,
            recipient: recipientEmail,
            filename,
            sizeMB
        })

    } catch (error: any) {
        console.error('[Backup Email] Failed:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

/**
 * POST /api/settings/maintenance/backup-email/test
 * Sends a test email to verify SMTP config — imported separately
 * (handled by backup-email/test/route.ts)
 */
