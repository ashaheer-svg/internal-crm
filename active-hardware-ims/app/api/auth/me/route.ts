import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
    try {
        const user = await getCurrentUser() as any

        if (!user) {
            return NextResponse.json({ user: null, permissions: [] }, { status: 401 })
        }

        const { password: _, ...userWithoutPassword } = user

        const safeUser = {
            ...userWithoutPassword,
            role: userWithoutPassword.role?.name || userWithoutPassword.legacyRole || 'UNKNOWN'
        }

        // Expose permissions array for client-side RBAC (already computed by auth.ts as "resource:action" strings)
        // Include 'all:manage' expansion so frontend can do a simple includes() check
        const permissions: string[] = user.permissions ?? []

        return NextResponse.json({ user: safeUser, permissions })
    } catch (error) {
        console.error('Get current user error:', error)
        return NextResponse.json({ user: null, permissions: [] }, { status: 401 })
    }
}

