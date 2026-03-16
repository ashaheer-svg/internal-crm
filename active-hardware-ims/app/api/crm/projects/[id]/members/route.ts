import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
    const { id: projectId } = await context.params;
    try {
        const user = await requireAuth()
        const { userId, role } = await request.json()

        if (!userId || !role) {
            return NextResponse.json({ error: 'User ID and Role are required' }, { status: 400 })
        }

        // Verify project exists
        const project = await prisma.cRMProject.findUnique({
            where: { id: projectId }
        })

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 })
        }

        // Add member link
        const member = await prisma.projectMember.create({
            data: {
                projectId,
                userId,
                role: role.toUpperCase() // OWNER, MEMBER, VIEWER
            },
            include: {
                user: { select: { name: true, email: true } }
            }
        })

        // Audit Log
        try {
            const { logCreate } = await import('@/lib/audit')
            await logCreate('CRM_PROJECT_MEMBER', member.id, user.id, user.name, {
                projectId,
                userId,
                role: member.role
            } as any)
        } catch (e) {
            console.error('Failed to log audit:', e)
        }

        return NextResponse.json(member)

    } catch (error: any) {
        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'User is already a member of this project' }, { status: 400 })
        }
        return NextResponse.json(
            { error: error.message || 'Failed to add member' },
            { status: 500 }
        )
    }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
    const { id: projectId } = await context.params;
    try {
        const user = await requireAuth()
        const { userId } = await request.json()

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
        }

        const project = await prisma.cRMProject.findUnique({
             where: { id: projectId },
             include: { members: true }
        })

        if (!project) {
             return NextResponse.json({ error: 'Project not found' }, { status: 404 })
        }

        // Verify deletion is safe or ownership preserved
        const memberToDelete = project.members.find(m => m.userId === userId)
        if (memberToDelete?.role === 'OWNER') {
             return NextResponse.json({ error: 'Cannot remove the project OWNER' }, { status: 400 })
        }

        const deleted = await prisma.projectMember.delete({
            where: {
                projectId_userId: { projectId, userId }
            }
        })

        // Audit Log
        try {
            const { logDelete } = await import('@/lib/audit')
            await logDelete('CRM_PROJECT_MEMBER', deleted.id, user.id, user.name, deleted)
        } catch (e) {
            console.error('Audit delete failed:', e)
        }

        return NextResponse.json({ success: true })

    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to remove member' },
            { status: 500 }
        )
    }
}
