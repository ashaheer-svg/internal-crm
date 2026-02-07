import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logCreate } from '@/lib/audit'
import bcrypt from 'bcryptjs'

export async function POST() {
    try {
        const user = await requireRole(['ADMIN'])

        // Delete all data in order (respecting foreign key constraints)
        await prisma.$transaction(async (tx) => {
            // Delete child records first
            await tx.backorder.deleteMany({})
            await tx.warranty.deleteMany({})
            await tx.invoiceItem.deleteMany({})
            await tx.invoice.deleteMany({})
            await tx.inventoryItem.deleteMany({})
            await tx.gRN.deleteMany({})
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

            // Reset the current admin user to default state
            const hashedPassword = await bcrypt.hash('Admin@123', 10)
            await tx.user.update({
                where: { id: user.id },
                data: {
                    name: 'System Administrator',
                    email: 'admin@activehardware.com',
                    password: hashedPassword,
                    role: 'ADMIN',
                    mustChangePassword: true
                }
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
