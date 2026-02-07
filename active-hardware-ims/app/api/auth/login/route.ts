import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyPassword, createSession, setSessionCookie } from '@/lib/auth'
import { logLogin } from '@/lib/audit'

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json()

        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email and password are required' },
                { status: 400 }
            )
        }

        // Find user by email
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() }
        })

        if (!user) {
            return NextResponse.json(
                { error: 'Invalid email or password' },
                { status: 401 }
            )
        }

        // Check if user is active
        if (!user.isActive) {
            return NextResponse.json(
                { error: 'Account is inactive. Please contact administrator.' },
                { status: 403 }
            )
        }

        // Verify password
        const isValid = await verifyPassword(password, user.password)
        if (!isValid) {
            return NextResponse.json(
                { error: 'Invalid email or password' },
                { status: 401 }
            )
        }

        // Create session
        const token = await createSession(user.id)
        await setSessionCookie(token)

        // Update last login
        await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() }
        })

        // Log login event
        await logLogin(user.id, user.name, {
            email: user.email,
            timestamp: new Date().toISOString()
        })

        // Return user info (without password)
        const { password: _, ...userWithoutPassword } = user

        return NextResponse.json({
            user: userWithoutPassword,
            mustChangePassword: user.mustChangePassword
        })
    } catch (error) {
        console.error('Login error:', error)
        return NextResponse.json(
            { error: 'Login failed' },
            { status: 500 }
        )
    }
}
