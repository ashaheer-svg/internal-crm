import { prisma } from './db'

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT'

export type AuditEntityType =
    | 'USER'
    | 'CUSTOMER'
    | 'PRODUCT'
    | 'INVENTORY'
    | 'INVOICE'
    | 'LOCATION'
    | 'GRN'
    | 'WARRANTY'
    | 'BACKORDER'
    | 'BACKUP'
    | 'SERVICE_CONTRACT'
    | 'RENTAL'
    | 'CRM_PROJECT'
    | 'CRM_QUOTE'
    | 'DELIVERY_ORDER'
    | 'PURCHASE_ORDER'
    | 'CRM_TASK'
    | 'CRM_PIPELINE'
    | 'ROLE'
    | 'ROLE_PERMISSION'
    | 'MESSAGE'
    | 'SYSTEM_SETTING'
    | 'DELIVERY_ORDER_BUILD'
    | 'DELIVERY_ORDER_BUILD_REJECT'

interface AuditLogParams {
    action: AuditAction
    entityType: AuditEntityType
    entityId?: string
    userId: string
    userName: string
    changes?: { before?: any; after?: any }
    metadata?: any
}

export async function logAudit(params: AuditLogParams) {
    const { action, entityType, entityId, userId, userName, changes, metadata } = params

    try {
        await prisma.auditLog.create({
            data: {
                action,
                entityType,
                entityId: entityId || null,
                userId,
                userName,
                changes: changes ? JSON.stringify(changes) : null,
                metadata: metadata ? JSON.stringify(metadata) : null
            }
        })
    } catch (error) {
        console.error('Failed to create audit log:', error)
        // Don't throw - audit logging should not break the main operation
    }
}

// Helper functions for common operations
export async function logCreate(
    entityType: AuditEntityType,
    entityId: string,
    userId: string,
    userName: string,
    data: any
) {
    await logAudit({
        action: 'CREATE',
        entityType,
        entityId,
        userId,
        userName,
        changes: { after: data }
    })
}

export async function logUpdate(
    entityType: AuditEntityType,
    entityId: string,
    userId: string,
    userName: string,
    before: any,
    after: any
) {
    await logAudit({
        action: 'UPDATE',
        entityType,
        entityId,
        userId,
        userName,
        changes: { before, after }
    })
}

export async function logDelete(
    entityType: AuditEntityType,
    entityId: string,
    userId: string,
    userName: string,
    data: any
) {
    await logAudit({
        action: 'DELETE',
        entityType,
        entityId,
        userId,
        userName,
        changes: { before: data }
    })
}

export async function logLogin(userId: string, userName: string, metadata?: any) {
    await logAudit({
        action: 'LOGIN',
        entityType: 'USER',
        entityId: userId,
        userId,
        userName,
        metadata
    })
}

export async function logLogout(userId: string, userName: string) {
    await logAudit({
        action: 'LOGOUT',
        entityType: 'USER',
        entityId: userId,
        userId,
        userName
    })
}

// Backup-specific logging functions
export async function logBackup(userId: string, userName: string, metadata: any) {
    await logAudit({
        action: 'CREATE',
        entityType: 'BACKUP',
        entityId: 'database',
        userId,
        userName,
        metadata
    })
}

export async function logRestore(userId: string, userName: string, metadata: any) {
    await logAudit({
        action: 'UPDATE',
        entityType: 'BACKUP',
        entityId: 'database',
        userId,
        userName,
        metadata
    })
}
