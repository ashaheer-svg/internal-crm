export const ROLES = {
    ADMIN: 'ADMIN',
    SALES: 'SALES',
    VIEWER: 'VIEWER'
} as const

export type Role = typeof ROLES[keyof typeof ROLES]

export const PERMISSIONS = {
    // User management
    'users.create': [ROLES.ADMIN],
    'users.update': [ROLES.ADMIN],
    'users.delete': [ROLES.ADMIN],
    'users.view': [ROLES.ADMIN],

    // Inventory
    'inventory.create': [ROLES.ADMIN],
    'inventory.update': [ROLES.ADMIN],
    'inventory.delete': [ROLES.ADMIN],
    'inventory.view': [ROLES.ADMIN, ROLES.SALES, ROLES.VIEWER],

    // Invoices
    'invoices.create': [ROLES.ADMIN, ROLES.SALES],
    'invoices.update': [ROLES.ADMIN, ROLES.SALES],
    'invoices.delete': [ROLES.ADMIN],
    'invoices.view': [ROLES.ADMIN, ROLES.SALES, ROLES.VIEWER],

    // Customers
    'customers.create': [ROLES.ADMIN, ROLES.SALES],
    'customers.update': [ROLES.ADMIN, ROLES.SALES],
    'customers.delete': [ROLES.ADMIN],
    'customers.view': [ROLES.ADMIN, ROLES.SALES, ROLES.VIEWER],

    // Products
    'products.create': [ROLES.ADMIN],
    'products.update': [ROLES.ADMIN],
    'products.delete': [ROLES.ADMIN],
    'products.view': [ROLES.ADMIN, ROLES.SALES, ROLES.VIEWER],

    // Locations
    'locations.create': [ROLES.ADMIN],
    'locations.update': [ROLES.ADMIN],
    'locations.delete': [ROLES.ADMIN],
    'locations.view': [ROLES.ADMIN, ROLES.SALES, ROLES.VIEWER],

    // GRN
    'grn.create': [ROLES.ADMIN],
    'grn.update': [ROLES.ADMIN],
    'grn.view': [ROLES.ADMIN, ROLES.VIEWER],

    // Warranty
    'warranty.create': [ROLES.ADMIN, ROLES.SALES],
    'warranty.update': [ROLES.ADMIN, ROLES.SALES],
    'warranty.view': [ROLES.ADMIN, ROLES.SALES, ROLES.VIEWER],

    // Audit logs
    'audit.view': [ROLES.ADMIN],

    // Backup & Restore
    'backup.create': [ROLES.ADMIN],
    'backup.restore': [ROLES.ADMIN],

    // Settings
    'settings.manage': [ROLES.ADMIN]
} as const

export type Permission = keyof typeof PERMISSIONS

export function hasPermission(userRole: string, permission: Permission): boolean {
    const allowedRoles = PERMISSIONS[permission] as readonly string[]
    return allowedRoles.includes(userRole)
}

export function checkPermission(userRole: string, permission: Permission): void {
    if (!hasPermission(userRole, permission)) {
        throw new Error(`Permission denied: ${permission}`)
    }
}
