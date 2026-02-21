import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePermission } from '@/lib/auth'
import { logCreate, logUpdate, logDelete } from '@/lib/audit'

export async function GET() {
    try {
        await requirePermission('roles:read')

        const roles = await prisma.role.findMany({
            include: {
                permissions: {
                    include: {
                        permission: true
                    }
                },
                _count: {
                    select: { users: true }
                }
            },
            orderBy: { createdAt: 'asc' }
        })

        const allPermissions = await prisma.permission.findMany()

        return NextResponse.json({ roles, allPermissions })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const currentUser = await requirePermission('roles:manage')
        const body = await request.json()
        const { name, description } = body

        if (!name) return NextResponse.json({ error: 'Role name is required' }, { status: 400 })

        const role = await prisma.role.create({
            data: {
                name: name.toUpperCase().replace(/\s+/g, '_'),
                description: description || '',
                isSystemDefault: false
            }
        })

        await logCreate('ROLE', role.id, currentUser.id, currentUser.name, { name: role.name })

        return NextResponse.json(role)
    } catch (error: any) {
        if (error.code === 'P2002') return NextResponse.json({ error: 'Role name already exists' }, { status: 400 })
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function PUT(request: Request) {
    try {
        const currentUser = await requirePermission('roles:manage')
        const body = await request.json()
        const { roleId, permissionId, action } = body
        // action is either 'GRANT' or 'REVOKE'

        if (!roleId || !permissionId || !action) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        if (action === 'GRANT') {
            await prisma.rolePermission.upsert({
                where: { roleId_permissionId: { roleId, permissionId } },
                update: {},
                create: { roleId, permissionId }
            })
        } else if (action === 'REVOKE') {
            await prisma.rolePermission.delete({
                where: { roleId_permissionId: { roleId, permissionId } }
            }).catch(() => { }) // Ignore if it doesn't exist
        }

        // Audit log the permission change
        await logUpdate('ROLE_PERMISSION', roleId, currentUser.id, currentUser.name,
            { permissionId, action: action === 'GRANT' ? 'revoked' : 'granted' },
            { permissionId, action: action === 'GRANT' ? 'granted' : 'revoked' }
        )

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function DELETE(request: Request) {
    try {
        const currentUser = await requirePermission('roles:manage')
        const { searchParams } = new URL(request.url)
        const roleId = searchParams.get('roleId')

        if (!roleId) {
            return NextResponse.json({ error: 'roleId is required' }, { status: 400 })
        }

        // Look up the role with user count
        const role = (prisma as any).role ?
            await (prisma as any).role.findUnique({
                where: { id: roleId },
                include: { _count: { select: { users: true } } }
            }) : null

        if (!role) {
            return NextResponse.json({ error: 'Role not found' }, { status: 404 })
        }

        // Block deletion of system-default roles
        if (role.isSystemDefault) {
            return NextResponse.json(
                { error: 'System default roles cannot be deleted.' },
                { status: 400 }
            )
        }

        // Block deletion if users are still assigned
        if (role._count.users > 0) {
            return NextResponse.json(
                { error: `Cannot delete role: ${role._count.users} user(s) are still assigned to it. Reassign them first.` },
                { status: 400 }
            )
        }

        // Delete all role permissions first, then the role
        await (prisma as any).rolePermission.deleteMany({ where: { roleId } })
        await (prisma as any).role.delete({ where: { id: roleId } })

        await logDelete('ROLE', roleId, currentUser.id, currentUser.name, { name: role.name })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

