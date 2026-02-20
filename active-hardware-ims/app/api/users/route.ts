import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { hashPassword } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logCreate } from '@/lib/audit'

// GET - List all users (ADMIN only)
export async function GET() {
    try {
        const currentUser = await requirePermission('users:read')

        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: {
                    select: { id: true, name: true }
                },
                legacyRole: true,
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

        // Safely map relational role name to top-level `role` property and extract the `roleId`
        const mappedUsers = users.map(u => {
            const { role, ...rest } = u;
            const r = role as any; // Typecast for local TS
            return {
                ...rest,
                roleId: r?.id || null,
                role: r?.name || u.legacyRole || 'UNKNOWN'
            }
        })

        return NextResponse.json({ users: mappedUsers })
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
        const currentUser = await requirePermission('users:create')
        const { name, email, password, roleId, salesRepId } = await request.json()

        // Validation
        if (!name || !email || !password || !roleId) {
            return NextResponse.json(
                { error: 'Name, email, password, and role selection are required' },
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

        // Validate that the role exists
        const roleRecord = await prisma.role.findUnique({ where: { id: roleId } })
        if (!roleRecord) {
            return NextResponse.json(
                { error: 'Selected Role is invalid or has been deleted' },
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
                roleId: roleId,
                isActive: true,
                mustChangePassword: true,
                createdBy: currentUser.id,
                salesRepId: salesRepId || null
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: { select: { name: true } },
                isActive: true,
                createdAt: true,
                salesRepId: true
            }
        })

        // Log user creation
        await logCreate('USER', user.id, currentUser.id, currentUser.name, {
            name: user.name,
            email: user.email,
            role: user.role?.name,
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
