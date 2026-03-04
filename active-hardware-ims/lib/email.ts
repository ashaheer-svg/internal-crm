import nodemailer from 'nodemailer'
import { prisma } from './db'
import { createDatabaseBackup, createBackupFilename } from './backup'
import fs from 'fs'
import path from 'path'

/**
 * Read SMTP configuration from the systemSetting DB table.
 * Values are set via Settings > Email in the admin UI.
 */
export async function getSmtpConfig(): Promise<Record<string, string>> {
    const settings = await (prisma as any).systemSetting.findMany({
        where: {
            key: {
                in: ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_SECURE', 'SMTP_FROM']
            }
        }
    })
    const cfg: Record<string, string> = {}
    settings.forEach((s: any) => { cfg[s.key] = s.value })
    return cfg
}

/**
 * Create a nodemailer transporter using DB-stored SMTP settings.
 */
export async function createMailTransporter() {
    const cfg = await getSmtpConfig()

    if (!cfg.SMTP_HOST || !cfg.SMTP_USER) {
        throw new Error('SMTP not configured. Go to Settings > Email to set it up.')
    }

    return nodemailer.createTransport({
        host: cfg.SMTP_HOST,
        port: Number(cfg.SMTP_PORT || 587),
        secure: cfg.SMTP_SECURE === 'true',
        auth: {
            user: cfg.SMTP_USER,
            pass: cfg.SMTP_PASS || ''
        }
    })
}

/**
 * Send a test email to verify SMTP configuration.
 */
export async function sendTestEmail(recipientEmail: string): Promise<void> {
    const cfg = await getSmtpConfig()
    const transporter = await createMailTransporter()

    await transporter.sendMail({
        from: cfg.SMTP_FROM || cfg.SMTP_USER,
        to: recipientEmail,
        subject: '[IMS] Email Test — SMTP Configuration Verified',
        text: 'This is a test email from Active Hardware IMS. Your SMTP configuration is working correctly.',
        html: `
            <div style="font-family: sans-serif; max-width: 480px;">
                <h2 style="color: #1d4ed8;">✅ Email Test Successful</h2>
                <p>Your SMTP configuration in Active Hardware IMS is working correctly.</p>
                <p style="color: #6b7280; font-size: 12px;">Sent: ${new Date().toLocaleString()}</p>
            </div>
        `
    })
}

/**
 * Create a gzip DB backup and email it as an attachment.
 * Reads recipient and SMTP config from the DB.
 */
export async function sendDailyBackupEmail(recipientEmail: string): Promise<{ sizeMB: string; filename: string }> {
    const cfg = await getSmtpConfig()
    const transporter = await createMailTransporter()

    const filename = createBackupFilename()
    const tmpPath = path.join(process.cwd(), 'prisma', 'tmp_email_' + filename)

    try {
        await createDatabaseBackup(tmpPath)
        const stats = fs.statSync(tmpPath)
        const sizeMB = (stats.size / 1024 / 1024).toFixed(2)
        const now = new Date()

        await transporter.sendMail({
            from: cfg.SMTP_FROM || cfg.SMTP_USER,
            to: recipientEmail,
            subject: `[IMS] Daily Backup — ${now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`,
            text: `Automated daily database backup.\n\nFile: ${filename}\nSize: ${sizeMB} MB\nTimestamp: ${now.toISOString()}\n\nKeep this file in a safe location.`,
            html: `
                <div style="font-family: sans-serif; max-width: 520px;">
                    <h2 style="color: #1d4ed8;">🗄️ Daily Database Backup</h2>
                    <table style="width:100%; border-collapse: collapse; font-size: 14px;">
                        <tr><td style="padding:4px 8px; color:#6b7280;">File</td><td style="padding:4px 8px;"><strong>${filename}</strong></td></tr>
                        <tr><td style="padding:4px 8px; color:#6b7280;">Size</td><td style="padding:4px 8px;">${sizeMB} MB</td></tr>
                        <tr><td style="padding:4px 8px; color:#6b7280;">Generated</td><td style="padding:4px 8px;">${now.toLocaleString()}</td></tr>
                    </table>
                    <p style="color:#6b7280; font-size:12px; margin-top:16px;">This is an automated backup from Active Hardware IMS. Store it securely.</p>
                </div>
            `,
            attachments: [{
                filename,
                path: tmpPath,
                contentType: 'application/gzip'
            }]
        })

        return { sizeMB, filename }
    } finally {
        // Always clean up the temp file
        if (fs.existsSync(tmpPath)) {
            fs.unlinkSync(tmpPath)
        }
    }
}
