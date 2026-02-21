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

// Special per-resource permissions beyond the standard CRUD+manage matrix
const SPECIAL_PERMISSIONS = [
    { action: 'view_all', resource: 'projects', description: 'Can see all CRM projects (not just own)' }
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

    // Seed special permissions (outside standard CRUD matrix)
    console.log('Creating special permissions...')
    for (const sp of SPECIAL_PERMISSIONS) {
        await prisma.permission.upsert({
            where: { action_resource: { action: sp.action, resource: sp.resource } },
            update: {},
            create: sp
        })
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

        // Default permission seeds for SALES role
        if (role.name === 'SALES') {
            const salesReadQuotes = await prisma.permission.findUnique({ where: { action_resource: { action: 'read', resource: 'quotes' } } })
            const salesCreateQuotes = await prisma.permission.findUnique({ where: { action_resource: { action: 'create', resource: 'quotes' } } })
            if (salesReadQuotes) await prisma.rolePermission.upsert({ where: { roleId_permissionId: { roleId: role.id, permissionId: salesReadQuotes.id } }, update: {}, create: { roleId: role.id, permissionId: salesReadQuotes.id } })
            if (salesCreateQuotes) await prisma.rolePermission.upsert({ where: { roleId_permissionId: { roleId: role.id, permissionId: salesCreateQuotes.id } }, update: {}, create: { roleId: role.id, permissionId: salesCreateQuotes.id } })
        }

        // Comprehensive default permissions per role
        const defaultPermissions: Record<string, Array<{ action: string; resource: string }>> = {
            MANAGER: [
                { action: 'read', resource: 'reports' },
                { action: 'manage', resource: 'reports' },
                { action: 'read', resource: 'services' },
                { action: 'create', resource: 'services' },
                { action: 'update', resource: 'services' },
                { action: 'delete', resource: 'services' },
                { action: 'read', resource: 'inventory' },
                { action: 'create', resource: 'inventory' },
                { action: 'update', resource: 'inventory' },
                { action: 'read', resource: 'customers' },
                { action: 'create', resource: 'customers' },
                { action: 'update', resource: 'customers' },
                { action: 'read', resource: 'invoices' },
                { action: 'create', resource: 'invoices' },
                { action: 'update', resource: 'invoices' },
                { action: 'read', resource: 'delivery_orders' },
                { action: 'create', resource: 'delivery_orders' },
                { action: 'update', resource: 'delivery_orders' },
                { action: 'read', resource: 'purchase_orders' },
                { action: 'create', resource: 'purchase_orders' },
                { action: 'read', resource: 'projects' },
                { action: 'create', resource: 'projects' },
                { action: 'update', resource: 'projects' },
                { action: 'view_all', resource: 'projects' },
                { action: 'read', resource: 'quotes' },
                { action: 'create', resource: 'quotes' },
                { action: 'update', resource: 'quotes' },
                { action: 'read', resource: 'audit_logs' },
                { action: 'read', resource: 'users' },
            ],
            SALES: [
                { action: 'read', resource: 'reports' },
                { action: 'read', resource: 'services' },
                { action: 'create', resource: 'services' },
                { action: 'update', resource: 'services' },
                { action: 'read', resource: 'customers' },
                { action: 'create', resource: 'customers' },
                { action: 'update', resource: 'customers' },
                { action: 'read', resource: 'invoices' },
                { action: 'create', resource: 'invoices' },
                { action: 'update', resource: 'invoices' },
                { action: 'read', resource: 'inventory' },
                { action: 'read', resource: 'delivery_orders' },
                { action: 'read', resource: 'projects' },
                { action: 'create', resource: 'projects' },
                { action: 'update', resource: 'projects' },
                { action: 'read', resource: 'quotes' },
                { action: 'create', resource: 'quotes' },
                { action: 'update', resource: 'quotes' },
            ],
            WAREHOUSE: [
                { action: 'read', resource: 'reports' },
                // Warranty Lookup access (read-only to services for lookup)
                { action: 'read', resource: 'services' },
                { action: 'read', resource: 'inventory' },
                { action: 'create', resource: 'inventory' },
                { action: 'update', resource: 'inventory' },
                { action: 'read', resource: 'delivery_orders' },
                { action: 'create', resource: 'delivery_orders' },
                { action: 'update', resource: 'delivery_orders' },
                { action: 'read', resource: 'purchase_orders' },
                { action: 'create', resource: 'purchase_orders' },
                { action: 'update', resource: 'purchase_orders' },
            ],
            VIEWER: [
                { action: 'read', resource: 'reports' },
                // Warranty Lookup access (read-only)
                { action: 'read', resource: 'services' },
                { action: 'read', resource: 'inventory' },
                { action: 'read', resource: 'customers' },
                { action: 'read', resource: 'invoices' },
                { action: 'read', resource: 'delivery_orders' },
                { action: 'read', resource: 'purchase_orders' },
                { action: 'read', resource: 'projects' },
                { action: 'read', resource: 'quotes' },
            ],
        }

        const permissionsForRole = defaultPermissions[role.name] || []
        for (const perm of permissionsForRole) {
            const permRecord = await prisma.permission.findUnique({ where: { action_resource: { action: perm.action, resource: perm.resource } } })
            if (permRecord) {
                await prisma.rolePermission.upsert({
                    where: { roleId_permissionId: { roleId: role.id, permissionId: permRecord.id } },
                    update: {},
                    create: { roleId: role.id, permissionId: permRecord.id }
                })
                console.log(`  Assigned ${perm.resource}:${perm.action} to ${role.name}`)
            }
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
