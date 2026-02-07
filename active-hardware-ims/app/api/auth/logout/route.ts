import { NextResponse } from 'next/server'
import { getCurrentUser, clearSessionCookie, deleteSession } from '@/lib/auth'
import { logLogout } from '@/lib/audit'
import { cookies } from 'next/headers'

export async function POST() {
    try {
        const user = await getCurrentUser()

        if (user) {
            // Get session token
            const cookieStore = await cookies()
            const token = cookieStore.get('session')?.value

            // Log logout event
            await logLogout(user.id, user.name)

            // Delete session from database
            if (token) {
                await deleteSession(token)
            }
        }

        // Clear session cookie
        await clearSessionCookie()

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Logout error:', error)
        // Still clear the cookie even if there's an error
        await clearSessionCookie()
        return NextResponse.json({ success: true })
    }
}
