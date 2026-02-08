import { prisma } from './db'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import crypto from 'crypto'

const SESSION_DURATION = 24 * 60 * 60 * 1000 // 24 hours

// Password hashing
export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash)
}

// Session management
export async function createSession(userId: string): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + SESSION_DURATION)

    await prisma.session.create({
        data: {
            userId,
            token,
            expiresAt
        }
    })

    return token
}

export async function getSession(token: string) {
    const session = await prisma.session.findUnique({
        where: { token },
        include: { user: true }
    })

    if (!session || session.expiresAt < new Date()) {
        return null
    }

    return session
}

export async function deleteSession(token: string): Promise<void> {
    await prisma.session.delete({
        where: { token }
    }).catch(() => {
        // Session might not exist, ignore error
    })
}

// Get current user from cookies
export async function getCurrentUser() {
    const cookieStore = await cookies()
    const token = cookieStore.get('session')?.value

    if (!token) {
        return null
    }

    const session = await getSession(token)
    return session?.user || null
}

// Auth guards
export async function requireAuth() {
    const user = await getCurrentUser()
    if (!user) {
        throw new Error('Unauthorized')
    }
    if (!user.isActive) {
        throw new Error('Account is inactive')
    }
    return user
}

export async function requireRole(allowedRoles: string[]) {
    const user = await requireAuth()
    if (!allowedRoles.includes(user.role)) {
        throw new Error('Forbidden')
    }
    return user
}

// Set session cookie
export async function setSessionCookie(token: string) {
    const cookieStore = await cookies()
    cookieStore.set('session', token, {
        httpOnly: true,
        // Only set secure if we are using HTTPS or if explicitly enabled
        // This allows login on HTTP (IP address) deployments
        secure: process.env.USE_SECURE_COOKIES === 'true',
        sameSite: 'lax',
        maxAge: SESSION_DURATION / 1000,
        path: '/'
    })
}

// Clear session cookie
export async function clearSessionCookie() {
    const cookieStore = await cookies()
    cookieStore.delete('session')
}
