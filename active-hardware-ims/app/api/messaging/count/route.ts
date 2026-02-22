import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET() {
    try {
        const user = await requireAuth()

        // Unread messages: 
        // 1. Where user is direct recipient AND receipt.viewedAt is null
        // 2. Where user's role is recipient AND receipt.viewedAt is null

        const unreadCount = await prisma.messageReceipt.count({
            where: {
                userId: user.id,
                viewedAt: null,
                isDone: false
            }
        })

        // Also count pending tasks (where isDone is false)
        const pendingTasksCount = await prisma.messageReceipt.count({
            where: {
                userId: user.id,
                isDone: false
            }
        })

        return NextResponse.json({
            unreadCount,
            pendingTasksCount,
            total: unreadCount // Or whichever number we want to show on the badge
        })
    } catch (error: any) {
        console.error('Get message count error:', error)
        return NextResponse.json({ count: 0 }, { status: 500 })
    }
}
