import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePermission } from '@/lib/auth'

export async function POST(request: Request) {
    try {
        await requirePermission('settings:manage')

        const body = await request.json()
        const { data } = body

        if (!data) {
            return NextResponse.json({ error: 'Invalid backup format' }, { status: 400 })
        }

        const { users, salesReps, roles, permissions, rolePermissions } = data

        // 1. Upsert Permissions
        if (permissions) {
            for (const perm of permissions) {
                await prisma.permission.upsert({
                    where: { id: perm.id },
                    update: {
                        action: perm.action,
                        resource: perm.resource,
                        description: perm.description
                    },
                    create: perm
                })
            }
        }

        // 2. Upsert Roles
        if (roles) {
            for (const role of roles) {
                await prisma.role.upsert({
                    where: { id: role.id },
                    update: {
                        name: role.name,
                        description: role.description,
                        isSystemDefault: role.isSystemDefault
                    },
                    create: role
                })
            }
        }

        // 3. Upsert RolePermissions
        if (rolePermissions) {
            for (const rp of rolePermissions) {
                await prisma.rolePermission.upsert({
                    where: { id: rp.id },
                    update: {
                        roleId: rp.roleId,
                        permissionId: rp.permissionId
                    },
                    create: rp
                })
            }
        }

        // 4. Upsert SalesReps
        if (salesReps) {
            for (const sr of salesReps) {
                await prisma.salesRep.upsert({
                    where: { id: sr.id },
                    update: {
                        name: sr.name,
                        email: sr.email,
                        phone: sr.phone,
                        isActive: sr.isActive
                    },
                    create: sr
                })
            }
        }

        // 5. Upsert Users
        if (users) {
            for (const user of users) {
                // Ensure we handle potentially missing roleId/salesRepId safely
                await prisma.user.upsert({
                    where: { id: user.id },
                    update: {
                        name: user.name,
                        email: user.email,
                        password: user.password,
                        isActive: user.isActive,
                        mustChangePassword: user.mustChangePassword,
                        roleId: user.roleId,
                        salesRepId: user.salesRepId,
                        legacyRole: user.legacyRole
                    },
                    create: user
                })
            }
        }

        return NextResponse.json({ success: true, message: 'Data imported/merged successfully' })
    } catch (error: any) {
        console.error('RBAC Import Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
