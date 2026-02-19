import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { hashPassword } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logCreate } from '@/lib/audit'

// GET - List all users (ADMIN only)
export async function GET() {
    try {
        const currentUser = await requireRole(['ADMIN'])

        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true,
                lastLoginAt: true,
                createdAt: true,
                updatedAt: true,
                salesRepId: true,
                salesRep: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json({ users })
    } catch (error: any) {
        console.error('List users error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to fetch users' },
            { status: error.message === 'Forbidden' ? 403 : 500 }
        )
    }
}

// POST - Create new user (ADMIN only)
export async function POST(request: Request) {
    try {
        const currentUser = await requireRole(['ADMIN'])
        const { name, email, password, role, salesRepId } = await request.json()

        // Validation
        if (!name || !email || !password || !role) {
            return NextResponse.json(
                { error: 'Name, email, password, and role are required' },
                { status: 400 }
            )
        }

        // Check for duplicate email
        const existing = await prisma.user.findUnique({
            where: { email: email.toLowerCase() }
        })

        if (existing) {
            return NextResponse.json(
                { error: 'User with this email already exists' },
                { status: 400 }
            )
        }

        // Validate role
        const validRoles = ['ADMIN', 'MANAGER', 'SALES', 'WAREHOUSE', 'VIEWER']
        if (!validRoles.includes(role)) {
            return NextResponse.json(
                { error: 'Invalid role' },
                { status: 400 }
            )
        }

        // Hash password
        const hashedPassword = await hashPassword(password)

        // Create user
        const user = await prisma.user.create({
            data: {
                name,
                email: email.toLowerCase(),
                password: hashedPassword,
                role,
                isActive: true,
                mustChangePassword: true,
                createdBy: currentUser.id,
                salesRepId: salesRepId || null
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true,
                createdAt: true,
                salesRepId: true
            }
        })

        // Log user creation
        await logCreate('USER', user.id, currentUser.id, currentUser.name, {
            name: user.name,
            email: user.email,
            role: user.role,
            salesRepId: user.salesRepId
        })

        return NextResponse.json({ user })
    } catch (error: any) {
        console.error('Create user error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to create user' },
            { status: error.message === 'Forbidden' ? 403 : 500 }
        )
    }
}
