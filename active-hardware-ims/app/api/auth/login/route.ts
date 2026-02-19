import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyPassword, createSession, setSessionCookie } from '@/lib/auth'
import { logLogin } from '@/lib/audit'

// Simple in-memory rate limiter for login
const MAX_ATTEMPTS = 5
const LOCKOUT_DURATION_MS = 15 * 60 * 1000 // 15 minutes
const loginAttempts = new Map<string, { count: number, lockedUntil: number | null }>()

// Helper to clean up old entries periodically to prevent memory leaks in long-running processes
setInterval(() => {
    const now = Date.now()
    for (const [key, data] of Array.from(loginAttempts.entries())) {
        if (data.lockedUntil && data.lockedUntil < now) {
            loginAttempts.delete(key)
        }
    }
}, 60 * 60 * 1000)

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json()

        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email and password are required' },
                { status: 400 }
            )
        }

        const normalizedEmail = email.toLowerCase()

        // Rate limit check
        const attemptData = loginAttempts.get(normalizedEmail)
        if (attemptData) {
            if (attemptData.lockedUntil && attemptData.lockedUntil > Date.now()) {
                const remainingMinutes = Math.ceil((attemptData.lockedUntil - Date.now()) / 60000)
                return NextResponse.json(
                    { error: `Too many login attempts. Please try again in ${remainingMinutes} minutes.` },
                    { status: 429 }
                )
            }

            // If lock expired, reset
            if (attemptData.lockedUntil && attemptData.lockedUntil <= Date.now()) {
                loginAttempts.delete(normalizedEmail)
            }
        }

        // Find user by email
        const user = await prisma.user.findUnique({
            where: { email: normalizedEmail }
        })

        if (!user) {
            recordFailedAttempt(normalizedEmail)
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
            recordFailedAttempt(normalizedEmail)
            return NextResponse.json(
                { error: 'Invalid email or password' },
                { status: 401 }
            )
        }

        // Successful login, clear attempts
        loginAttempts.delete(normalizedEmail)

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

function recordFailedAttempt(email: string) {
    const current = loginAttempts.get(email) || { count: 0, lockedUntil: null }
    current.count += 1

    if (current.count >= MAX_ATTEMPTS) {
        current.lockedUntil = Date.now() + LOCKOUT_DURATION_MS
    }

    loginAttempts.set(email, current)
}
