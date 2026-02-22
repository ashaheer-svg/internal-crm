import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET() {
    try {
        // Authenticated any user can get recipients list
        await requireAuth()

        const [users, roles] = await Promise.all([
            prisma.user.findMany({
                where: { isActive: true },
                select: {
                    id: true,
                    name: true,
                    role: {
                        select: { name: true }
                    }
                }
            }),
            prisma.role.findMany({
                select: {
                    id: true,
                    name: true
                }
            })
        ])

        // Map users to match expected structure in frontend
        const mappedUsers = users.map(u => ({
            id: u.id,
            name: u.name,
            role: (u.role as any)?.name || 'USER'
        }))

        return NextResponse.json({ users: mappedUsers, roles })
    } catch (error: any) {
        console.error('Fetch recipients error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to fetch recipients' },
            { status: 500 }
        )
    }
}
