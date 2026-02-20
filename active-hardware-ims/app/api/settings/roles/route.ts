import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePermission } from '@/lib/auth'

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
        await requirePermission('roles:manage')
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

        return NextResponse.json(role)
    } catch (error: any) {
        if (error.code === 'P2002') return NextResponse.json({ error: 'Role name already exists' }, { status: 400 })
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function PUT(request: Request) {
    try {
        await requirePermission('roles:manage')
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

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
