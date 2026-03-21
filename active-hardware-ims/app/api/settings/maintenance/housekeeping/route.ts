import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePermission, requireAuth } from '@/lib/auth'
import { logCreate } from '@/lib/audit'

/**
 * GET /api/settings/maintenance/housekeeping
 *
 * Runs daily DB housekeeping:
 *  1. PRAGMA optimize   — refreshes query planner statistics
 *  2. WAL checkpoint    — merges WAL journal into main DB file
 *  3. VACUUM            — reclaims space from deleted rows
 *  4. Prune AuditLog    — deletes entries older than 365 days
 *  5. Prune sessions    — deletes expired session tokens
 *
 * Can be called by:
 *  - Admin user via the Settings > Maintenance UI
 *  - Linux cron job with Authorization: Bearer <CRON_SECRET> header
 */
export async function GET(request: Request) {
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

        const results: Record<string, any> = {}

        // 1. PRAGMA optimize — update internal statistics
        await prisma.$executeRaw`PRAGMA optimize`
        results.pragmaOptimize = 'done'

        // 2. WAL checkpoint — merge WAL into main DB (reduces *.db-wal file size)
        await prisma.$queryRaw`PRAGMA wal_checkpoint(FULL)`
        results.walCheckpoint = 'done'

        // 3. VACUUM — reclaim space from deleted records
        await prisma.$executeRaw`VACUUM`
        results.vacuum = 'done'

        // 4. Prune AuditLog — delete entries older than 365 days
        const auditCutoff = new Date()
        auditCutoff.setDate(auditCutoff.getDate() - 365)

        const auditPruneResult = await prisma.auditLog.deleteMany({
            where: { createdAt: { lt: auditCutoff } }
        })
        results.auditLogPruned = auditPruneResult.count

        // 5. Prune expired sessions
        let sessionsPruned = 0
        try {
            const sessionPrune = await (prisma as any).session.deleteMany({
                where: { expiresAt: { lt: new Date() } }
            })
            sessionsPruned = sessionPrune.count
        } catch {
            // Session model may not exist — safe to ignore
        }
        results.sessionsPruned = sessionsPruned

        // 6. Prune old dismissed BuildRejections (>90 days)
        let rejectionsPruned = 0
        try {
            const rejectionCutoff = new Date()
            rejectionCutoff.setDate(rejectionCutoff.getDate() - 90)
            const rejPrune = await (prisma as any).buildRejection.deleteMany({
                where: {
                    dismissed: true,
                    dismissedAt: { lt: rejectionCutoff }
                }
            })
            rejectionsPruned = rejPrune.count
        } catch {
            // Safe to ignore if model doesn't exist yet
        }
        results.dismissedRejectionsPruned = rejectionsPruned

        // Log the housekeeping run
        await logCreate('SYSTEM_SETTING', 'HOUSEKEEPING', userId, performedBy, {
            event: 'DAILY_HOUSEKEEPING',
            ...results,
            timestamp: new Date().toISOString()
        })

        return NextResponse.json({
            success: true,
            performedBy,
            timestamp: new Date().toISOString(),
            results
        })

    } catch (error: any) {
        console.error('[Housekeeping] Failed:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
