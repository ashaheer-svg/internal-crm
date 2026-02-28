import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

/**
 * POST /api/services/expire-check
 * Bulk-updates service contracts whose `endDate` has passed to EXPIRED status.
 * Safe to call on every Service dashboard load, or via a scheduled job.
 */
export async function POST() {
    try {
        await requireAuth()

        const now = new Date()

        const result = await prisma.serviceContract.updateMany({
            where: {
                status: 'ACTIVE',
                isDeleted: false,
                endDate: {
                    not: null,
                    lt: now
                }
            },
            data: {
                status: 'EXPIRED'
            }
        })

        return NextResponse.json({
            success: true,
            expiredCount: result.count,
            message: `${result.count} contract(s) marked as EXPIRED.`
        })
    } catch (error: any) {
        console.error('[expire-check] Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
