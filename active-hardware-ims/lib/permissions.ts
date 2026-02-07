export const ROLES = {
    ADMIN: 'ADMIN',
    MANAGER: 'MANAGER',
    SALES: 'SALES',
    WAREHOUSE: 'WAREHOUSE',
    VIEWER: 'VIEWER'
} as const

export type Role = typeof ROLES[keyof typeof ROLES]

export const PERMISSIONS = {
    // User management
    'users.create': [ROLES.ADMIN],
    'users.update': [ROLES.ADMIN],
    'users.delete': [ROLES.ADMIN],
    'users.view': [ROLES.ADMIN, ROLES.MANAGER],

    // Inventory
    'inventory.create': [ROLES.ADMIN, ROLES.MANAGER, ROLES.WAREHOUSE],
    'inventory.update': [ROLES.ADMIN, ROLES.MANAGER, ROLES.WAREHOUSE],
    'inventory.delete': [ROLES.ADMIN, ROLES.MANAGER],
    'inventory.view': [ROLES.ADMIN, ROLES.MANAGER, ROLES.WAREHOUSE, ROLES.SALES, ROLES.VIEWER],

    // Invoices
    'invoices.create': [ROLES.ADMIN, ROLES.MANAGER, ROLES.SALES],
    'invoices.update': [ROLES.ADMIN, ROLES.MANAGER, ROLES.SALES],
    'invoices.delete': [ROLES.ADMIN, ROLES.MANAGER],
    'invoices.view': [ROLES.ADMIN, ROLES.MANAGER, ROLES.SALES, ROLES.VIEWER],

    // Customers
    'customers.create': [ROLES.ADMIN, ROLES.MANAGER, ROLES.SALES],
    'customers.update': [ROLES.ADMIN, ROLES.MANAGER, ROLES.SALES],
    'customers.delete': [ROLES.ADMIN, ROLES.MANAGER],
    'customers.view': [ROLES.ADMIN, ROLES.MANAGER, ROLES.SALES, ROLES.VIEWER],

    // Products
    'products.create': [ROLES.ADMIN, ROLES.MANAGER],
    'products.update': [ROLES.ADMIN, ROLES.MANAGER],
    'products.delete': [ROLES.ADMIN, ROLES.MANAGER],
    'products.view': [ROLES.ADMIN, ROLES.MANAGER, ROLES.WAREHOUSE, ROLES.SALES, ROLES.VIEWER],

    // Locations
    'locations.create': [ROLES.ADMIN, ROLES.MANAGER, ROLES.WAREHOUSE],
    'locations.update': [ROLES.ADMIN, ROLES.MANAGER, ROLES.WAREHOUSE],
    'locations.delete': [ROLES.ADMIN, ROLES.MANAGER],
    'locations.view': [ROLES.ADMIN, ROLES.MANAGER, ROLES.WAREHOUSE, ROLES.SALES, ROLES.VIEWER],

    // GRN
    'grn.create': [ROLES.ADMIN, ROLES.MANAGER, ROLES.WAREHOUSE],
    'grn.update': [ROLES.ADMIN, ROLES.MANAGER, ROLES.WAREHOUSE],
    'grn.view': [ROLES.ADMIN, ROLES.MANAGER, ROLES.WAREHOUSE, ROLES.VIEWER],

    // Warranty
    'warranty.create': [ROLES.ADMIN, ROLES.MANAGER, ROLES.SALES],
    'warranty.update': [ROLES.ADMIN, ROLES.MANAGER, ROLES.SALES],
    'warranty.view': [ROLES.ADMIN, ROLES.MANAGER, ROLES.SALES, ROLES.VIEWER],

    // Audit logs
    'audit.view': [ROLES.ADMIN, ROLES.MANAGER],

    // Backup & Restore
    'backup.create': [ROLES.ADMIN],
    'backup.restore': [ROLES.ADMIN],

    // Settings
    'settings.manage': [ROLES.ADMIN, ROLES.MANAGER]
} as const

export type Permission = keyof typeof PERMISSIONS

export function hasPermission(userRole: string, permission: Permission): boolean {
    const allowedRoles = PERMISSIONS[permission]
    return allowedRoles.includes(userRole as Role)
}

export function checkPermission(userRole: string, permission: Permission): void {
    if (!hasPermission(userRole, permission)) {
        throw new Error(`Permission denied: ${permission}`)
    }
}
