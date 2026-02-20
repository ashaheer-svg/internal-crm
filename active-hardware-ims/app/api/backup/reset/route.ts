import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logCreate } from '@/lib/audit'
import bcrypt from 'bcryptjs'

export async function POST() {
    try {
        const user = await requirePermission('settings:manage')

        // Delete all data in order (respecting foreign key constraints)
        await prisma.$transaction(async (tx) => {
            // Delete child records first
            await tx.backorderItem.deleteMany({})
            await tx.warrantyClaim.deleteMany({})
            await tx.invoiceItem.deleteMany({})
            await tx.invoice.deleteMany({})
            await tx.inventoryItem.deleteMany({})
            await tx.goodsReceiptNote.deleteMany({})
            await tx.product.deleteMany({})
            await tx.location.deleteMany({})
            await tx.customer.deleteMany({})

            // Delete audit logs (except we'll keep the reset log)
            await tx.auditLog.deleteMany({})

            // Delete all sessions except current user's
            await tx.session.deleteMany({
                where: {
                    userId: { not: user.id }
                }
            })

            // Delete all users except the current admin
            await tx.user.deleteMany({
                where: {
                    id: { not: user.id }
                }
            })

            // Get the Admin role
            const adminRole = await (tx as any).role.findFirst({ where: { name: 'ADMIN' } })

            // Reset the current admin user to default state
            const hashedPassword = await bcrypt.hash('Admin@123', 10)

            const userData: any = {
                name: 'System Administrator',
                email: 'admin@activehardware.com',
                password: hashedPassword,
                mustChangePassword: true
            }
            if (adminRole) {
                userData.roleId = adminRole.id
            }

            await tx.user.update({
                where: { id: user.id },
                data: userData
            })
        })

        // Log the reset action
        await logCreate('BACKUP', 'database', user.id, user.name, {
            action: 'RESET',
            timestamp: new Date().toISOString(),
            message: 'Database reset to clean state'
        })

        return NextResponse.json({
            success: true,
            message: 'Database reset successfully. Default admin credentials: admin@activehardware.com / Admin@123'
        })
    } catch (error: any) {
        console.error('Database reset error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to reset database' },
            { status: error.message === 'Forbidden' ? 403 : 500 }
        )
    }
}
