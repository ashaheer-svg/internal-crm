import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePermission } from '@/lib/auth'

export async function GET() {
    try {
        await requirePermission('settings:manage')

        const [users, salesReps, roles, permissions, rolePermissions] = await Promise.all([
            prisma.user.findMany(),
            prisma.salesRep.findMany(),
            prisma.role.findMany(),
            prisma.permission.findMany(),
            prisma.rolePermission.findMany()
        ])

        const exportData = {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            data: {
                users,
                salesReps,
                roles,
                permissions,
                rolePermissions
            }
        }

        const filename = `rbac_backup_${new Date().toISOString().split('T')[0]}.json`

        return new NextResponse(JSON.stringify(exportData, null, 2), {
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="${filename}"`
            }
        })
    } catch (error: any) {
        console.error('RBAC Export Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
