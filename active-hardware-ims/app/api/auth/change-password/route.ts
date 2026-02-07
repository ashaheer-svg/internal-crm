import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { hashPassword, verifyPassword } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logAudit } from '@/lib/audit'

export async function POST(request: Request) {
    try {
        const user = await requireAuth()
        const { currentPassword, newPassword } = await request.json()

        if (!currentPassword || !newPassword) {
            return NextResponse.json(
                { error: 'Current password and new password are required' },
                { status: 400 }
            )
        }

        // Verify current password
        const isValid = await verifyPassword(currentPassword, user.password)
        if (!isValid) {
            return NextResponse.json(
                { error: 'Current password is incorrect' },
                { status: 401 }
            )
        }

        // Validate new password
        if (newPassword.length < 8) {
            return NextResponse.json(
                { error: 'New password must be at least 8 characters long' },
                { status: 400 }
            )
        }

        // Hash new password
        const hashedPassword = await hashPassword(newPassword)

        // Update password
        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                mustChangePassword: false
            }
        })

        // Log password change
        await logAudit({
            action: 'UPDATE',
            entityType: 'USER',
            entityId: user.id,
            userId: user.id,
            userName: user.name,
            changes: { after: { passwordChanged: true } },
            metadata: { timestamp: new Date().toISOString() }
        })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Change password error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to change password' },
            { status: error.message === 'Unauthorized' ? 401 : 500 }
        )
    }
}
