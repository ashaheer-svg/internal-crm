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

        let successCount = 0;
        let errorCount = 0;
        const errors: Array<{ row: string; details: string; identifier?: string }> = [];

        const recordError = (entity: string, item: any, err: any) => {
            errorCount++;
            errors.push({
                row: entity,
                identifier: item?.name || item?.email || item?.action || item?.id || 'Unknown Record',
                details: err.message || String(err)
            });
        };

        // 1. Upsert Permissions
        if (permissions) {
            for (const perm of permissions) {
                try {
                    await prisma.permission.upsert({
                        where: { id: perm.id },
                        update: {
                            action: perm.action,
                            resource: perm.resource,
                            description: perm.description
                        },
                        create: perm
                    })
                    successCount++;
                } catch (err: any) { recordError('Permission', perm, err) }
            }
        }

        // 2. Upsert Roles
        if (roles) {
            for (const role of roles) {
                try {
                    await prisma.role.upsert({
                        where: { id: role.id },
                        update: {
                            name: role.name,
                            description: role.description,
                            isSystemDefault: role.isSystemDefault
                        },
                        create: role
                    })
                    successCount++;
                } catch (err: any) { recordError('Role', role, err) }
            }
        }

        // 3. Upsert RolePermissions
        if (rolePermissions) {
            for (const rp of rolePermissions) {
                try {
                    await prisma.rolePermission.upsert({
                        where: { id: rp.id },
                        update: {
                            roleId: rp.roleId,
                            permissionId: rp.permissionId
                        },
                        create: rp
                    })
                    successCount++;
                } catch (err: any) { recordError('RolePermission', rp, err) }
            }
        }

        // 4. Upsert SalesReps
        if (salesReps) {
            for (const sr of salesReps) {
                try {
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
                    successCount++;
                } catch (err: any) { recordError('SalesRep', sr, err) }
            }
        }

        // 5. Upsert Users
        if (users) {
            for (const user of users) {
                try {
                    const clashingUser = await prisma.user.findUnique({
                        where: { email: user.email }
                    })
                    
                    if (clashingUser && clashingUser.id !== user.id) {
                        await prisma.user.update({
                            where: { id: clashingUser.id },
                            data: { email: `clash_${Date.now()}_${clashingUser.email}` }
                        })
                    }

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
                    successCount++;
                } catch (err: any) { recordError('User', user, err) }
            }
        }

        return NextResponse.json({ 
            success: true, 
            message: 'Import process completed.',
            successCount,
            errorCount,
            errors
        })
    } catch (error: any) {
        console.error('RBAC Import Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
