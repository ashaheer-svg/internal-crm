import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function POST(request: Request) {
    try {
        const user = await requireAuth()
        const body = await request.json()
        const { projectId, userId, role } = body

        if (!projectId || !userId) {
            return NextResponse.json({ error: 'Project ID and User ID are required' }, { status: 400 })
        }

        // Check if member already exists
        const existing = await prisma.projectMember.findUnique({
            where: {
                projectId_userId: { projectId, userId }
            }
        })

        if (existing) {
            return NextResponse.json({ error: 'User is already a member' }, { status: 400 })
        }

        const member = await prisma.projectMember.create({
            data: {
                projectId,
                userId,
                role: role || 'MEMBER'
            },
            include: {
                user: true
            }
        })

        return NextResponse.json(member)

    } catch (error: any) {
        console.error('Failed to add member:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to add member' },
            { status: 500 }
        )
    }
}

export async function DELETE(request: Request) {
    try {
        await requireAuth()
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) return NextResponse.json({ error: 'Member ID required' }, { status: 400 })

        await prisma.projectMember.delete({
            where: { id }
        })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 })
    }
}
