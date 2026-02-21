import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const DEFAULT_ROLES = [
    { name: 'ADMIN', description: 'System Administrator with full access to all features.', isSystemDefault: true },
    { name: 'MANAGER', description: 'Store Manager with access to most features except system settings.', isSystemDefault: false },
    { name: 'SALES', description: 'Sales Representative with access to CRM, Quotes, and Customers.', isSystemDefault: false },
    { name: 'WAREHOUSE', description: 'Warehouse Staff with access to Inventory, GRN, and Delivery Orders.', isSystemDefault: false },
    { name: 'VIEWER', description: 'Read-only access to standard reports and lists.', isSystemDefault: true }
]

const ALL_RESOURCES = [
    'inventory', 'quotes', 'projects', 'users', 'roles', 'settings', 'reports', 'delivery_orders', 'purchase_orders', 'customers', 'invoices', 'services', 'audit_logs'
]

async function main() {
    console.log('Seeding Default Roles and Permissions...')

    // 1. Create permissions matrix
    const ALL_ACTIONS = ['create', 'read', 'update', 'delete', 'manage']

    console.log('Creating base permissions...')
    for (const resource of ALL_RESOURCES) {
        for (const action of ALL_ACTIONS) {
            await prisma.permission.upsert({
                where: {
                    action_resource: { action, resource }
                },
                update: {}, // Do nothing if it exists
                create: { action, resource, description: `Can ${action} ${resource}` }
            })
        }
    }

    // Special global manage permission
    const globalManage = await prisma.permission.upsert({
        where: { action_resource: { action: 'manage', resource: 'all' } },
        update: {},
        create: { action: 'manage', resource: 'all', description: 'Unrestricted System Access' }
    })

    // 2. Create Default Roles
    for (const roleData of DEFAULT_ROLES) {
        const role = await prisma.role.upsert({
            where: { name: roleData.name },
            update: { description: roleData.description, isSystemDefault: roleData.isSystemDefault },
            create: roleData
        })
        console.log(`Ensured role: ${role.name}`)

        // If Admin, grant global manage
        if (role.name === 'ADMIN') {
            await prisma.rolePermission.upsert({
                where: { roleId_permissionId: { roleId: role.id, permissionId: globalManage.id } },
                update: {},
                create: { roleId: role.id, permissionId: globalManage.id }
            })
        }

        // Example basic permission seeds (this will be fleshed out or managed by UI)
        if (role.name === 'SALES') {
            const salesReadQuotes = await prisma.permission.findUnique({ where: { action_resource: { action: 'read', resource: 'quotes' } } })
            const salesCreateQuotes = await prisma.permission.findUnique({ where: { action_resource: { action: 'create', resource: 'quotes' } } })
            if (salesReadQuotes) await prisma.rolePermission.upsert({ where: { roleId_permissionId: { roleId: role.id, permissionId: salesReadQuotes.id } }, update: {}, create: { roleId: role.id, permissionId: salesReadQuotes.id } })
            if (salesCreateQuotes) await prisma.rolePermission.upsert({ where: { roleId_permissionId: { roleId: role.id, permissionId: salesCreateQuotes.id } }, update: {}, create: { roleId: role.id, permissionId: salesCreateQuotes.id } })
        }
    }

    // 3. Migrate Existing Users
    console.log('Migrating existing users to relational roles...')
    const users = await prisma.user.findMany()

    for (const user of users) {
        if (!user.roleId && user.legacyRole) {
            // Find the true Role record matching their legacy string
            const roleRecord = await prisma.role.findUnique({
                where: { name: user.legacyRole }
            })

            if (roleRecord) {
                await prisma.user.update({
                    where: { id: user.id },
                    data: { roleId: roleRecord.id }
                })
                console.log(`Migrated user ${user.email} to Role: ${roleRecord.name}`)
            } else {
                console.warn(`User ${user.email} has legacy role '${user.legacyRole}' which has no matching Role record!`)
            }
        }
    }

    console.log('RBAC Seeding Complete!')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
