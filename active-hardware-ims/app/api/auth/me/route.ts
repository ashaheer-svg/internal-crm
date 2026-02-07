import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
    try {
        const user = await getCurrentUser()

        if (!user) {
            return NextResponse.json({ user: null }, { status: 401 })
        }

        // Return user info without password
        const { password: _, ...userWithoutPassword } = user

        return NextResponse.json({ user: userWithoutPassword })
    } catch (error) {
        console.error('Get current user error:', error)
        return NextResponse.json({ user: null }, { status: 401 })
    }
}
