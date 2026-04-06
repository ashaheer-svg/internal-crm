import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const DEFAULT_ROLES = [
    { name: 'ADMIN', description: 'System Administrator with full access to all features.', isSystemDefault: true },
    { name: 'SALES', description: 'Sales Representative with access to CRM, Quotes, and Customers.', isSystemDefault: false },
    { name: 'SALES-MGR', description: 'Sales Manager with unrestricted CRM project access.', isSystemDefault: false },
    { name: 'ACC-MGR', description: 'Accounts / Operations Manager — full view of transactions, inventory, and financials.', isSystemDefault: false },
    { name: 'TECHNICAL', description: 'Technical staff — access to the Build Queue and inventory management.', isSystemDefault: false },
    { name: 'VIEWER', description: 'Read-only access to standard reports and lists.', isSystemDefault: true }
]

const ALL_RESOURCES = [
    'inventory', 'quotes', 'projects', 'users', 'roles', 'settings', 'reports', 'delivery_orders', 'purchase_orders', 'customers', 'invoices', 'services', 'audit_logs', 'warranty_rma', 'general_lookup', 'build', 'locations', 'backorders', 'stock_movements', 'grn_lookup',
    'reports:inventory-valuation', 'reports:stock-movement', 'reports:sales', 'reports:purchase', 'reports:warranty', 'reports:location', 'reports:backorder', 'reports:profitability'
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
            SALES: [
                { action: 'read', resource: 'reports' },
                { action: 'read', resource: 'services' },
                { action: 'create', resource: 'services' },
                { action: 'update', resource: 'services' },
                // Warranty & RMA management
                { action: 'read', resource: 'warranty_rma' },
                { action: 'create', resource: 'warranty_rma' },
                { action: 'update', resource: 'warranty_rma' },
                // general_lookup covers warranty lookup
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
                { action: 'read', resource: 'general_lookup' },
                { action: 'read', resource: 'locations' },
                { action: 'read', resource: 'reports:sales' },
                { action: 'read', resource: 'reports:warranty' },
                { action: 'read', resource: 'reports:backorder' },
                // Backorders & Stock Movements
                { action: 'read', resource: 'backorders' },
                { action: 'read', resource: 'stock_movements' },
            ],
            'SALES-MGR': [
                { action: 'read', resource: 'projects' },
                { action: 'view_all', resource: 'projects' },
                { action: 'create', resource: 'projects' },
                { action: 'update', resource: 'projects' },
                { action: 'read', resource: 'quotes' },
                { action: 'create', resource: 'quotes' },
                { action: 'update', resource: 'quotes' },
                { action: 'read', resource: 'customers' },
                { action: 'create', resource: 'customers' },
                { action: 'update', resource: 'customers' },
                { action: 'read', resource: 'reports' },
                { action: 'read', resource: 'reports:sales' },
                { action: 'read', resource: 'general_lookup' },
            ],
            'ACC-MGR': [
                // Transactions
                { action: 'read', resource: 'delivery_orders' },
                { action: 'create', resource: 'delivery_orders' },
                { action: 'update', resource: 'delivery_orders' },
                { action: 'read', resource: 'purchase_orders' },
                { action: 'create', resource: 'purchase_orders' },
                { action: 'update', resource: 'purchase_orders' },
                { action: 'read', resource: 'invoices' },
                { action: 'create', resource: 'invoices' },
                { action: 'update', resource: 'invoices' },
                // Inventory & Build
                { action: 'read', resource: 'inventory' },
                { action: 'update', resource: 'inventory' },
                { action: 'read', resource: 'build' },
                { action: 'update', resource: 'build' },
                { action: 'read', resource: 'locations' },
                // Customers
                { action: 'read', resource: 'customers' },
                { action: 'create', resource: 'customers' },
                { action: 'update', resource: 'customers' },
                // Reports
                { action: 'read', resource: 'reports' },
                { action: 'read', resource: 'reports:sales' },
                { action: 'read', resource: 'reports:inventory-valuation' },
                { action: 'read', resource: 'reports:stock-movement' },
                { action: 'read', resource: 'reports:purchase' },
                { action: 'read', resource: 'reports:backorder' },
                { action: 'read', resource: 'reports:profitability' },
                // Backorders & Stock Movements
                { action: 'read', resource: 'backorders' },
                { action: 'read', resource: 'stock_movements' },
                // Warranty & RMA — primary handler of build rejections
                { action: 'read', resource: 'warranty_rma' },
                { action: 'create', resource: 'warranty_rma' },
                { action: 'update', resource: 'warranty_rma' },
                // Audit Logs — for traceability of dismissals and rejections
                { action: 'read', resource: 'audit_logs' },
                // Lookup
                { action: 'read', resource: 'general_lookup' },
                { action: 'read', resource: 'grn_lookup' },
            ],
            TECHNICAL: [
                // Build Queue — read queue, mark as built, reject items
                { action: 'read', resource: 'build' },
                { action: 'update', resource: 'build' },
                { action: 'read', resource: 'delivery_orders' },
                { action: 'update', resource: 'delivery_orders' },
                { action: 'read', resource: 'inventory' },
                { action: 'manage', resource: 'inventory' }, // needed to reject serials during build
                { action: 'read', resource: 'locations' },
                { action: 'read', resource: 'general_lookup' },
                { action: 'read', resource: 'grn_lookup' },
            ],
            VIEWER: [
                { action: 'read', resource: 'reports' },
                { action: 'read', resource: 'general_lookup' },
                { action: 'read', resource: 'grn_lookup' },
                { action: 'read', resource: 'inventory' },
                { action: 'read', resource: 'customers' },
                { action: 'read', resource: 'invoices' },
                { action: 'read', resource: 'delivery_orders' },
                { action: 'read', resource: 'purchase_orders' },
                { action: 'read', resource: 'projects' },
                { action: 'read', resource: 'quotes' },
                { action: 'read', resource: 'locations' },
                { action: 'read', resource: 'reports:inventory-valuation' },
                { action: 'read', resource: 'reports:stock-movement' },
                { action: 'read', resource: 'reports:sales' },
                { action: 'read', resource: 'reports:purchase' },
                { action: 'read', resource: 'reports:warranty' },
                { action: 'read', resource: 'reports:location' },
                { action: 'read', resource: 'reports:backorder' },
                { action: 'read', resource: 'backorders' },
                { action: 'read', resource: 'stock_movements' },
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
