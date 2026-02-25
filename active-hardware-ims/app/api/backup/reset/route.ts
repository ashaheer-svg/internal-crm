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
            // 1. CRM & Projects
            await tx.cRMQuoteItem.deleteMany({})
            await tx.cRMQuote.deleteMany({})
            await tx.cRMActivity.deleteMany({})
            await tx.projectTask.deleteMany({})
            await tx.projectMember.deleteMany({})
            await tx.cRMProject.deleteMany({})
            await tx.cRMStage.deleteMany({})
            await tx.cRMPipeline.deleteMany({})

            // 2. Messaging
            await tx.messageReceipt.deleteMany({})
            await tx.messageAttachment.deleteMany({})
            await tx.message.deleteMany({})

            // 3. Services & Rental
            await tx.rentalAsset.deleteMany({})
            await tx.serviceContract.deleteMany({})
            await tx.serviceDefinition.deleteMany({})

            // 4. Sales & Inventory
            await tx.deliveryOrderItem.deleteMany({})
            await tx.deliveryOrder.deleteMany({})
            await tx.backorderItem.deleteMany({})
            await tx.invoiceItem.deleteMany({})
            await tx.invoice.deleteMany({})
            await tx.reservation.deleteMany({})
            await tx.warrantyClaim.deleteMany({})
            await tx.inventoryItem.deleteMany({})
            await tx.gRNItem.deleteMany({})
            await tx.goodsReceiptNote.deleteMany({})
            await tx.purchaseOrderItem.deleteMany({})
            await tx.purchaseOrder.deleteMany({})
            await tx.product.deleteMany({})
            await tx.location.deleteMany({})

            // 5. Customers & Partners
            await tx.partnerEmployee.deleteMany({})
            await tx.deliveryAddress.deleteMany({})
            await tx.customer.deleteMany({})
            await tx.salesRep.deleteMany({})

            // 6. Generic Settings & Logs
            await tx.transactionLog.deleteMany({})
            await tx.category.deleteMany({})
            await tx.sequence.deleteMany({})
            await tx.taxConfiguration.deleteMany({})
            await tx.systemSetting.deleteMany({})
            await tx.auditLog.deleteMany({})

            // 7. Identity Cleanup
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

            // 8. Re-initialize current user to default Admin state
            const adminRole = await tx.role.findFirst({ where: { name: 'ADMIN' } })
            const hashedPassword = await bcrypt.hash('Admin@123', 10)

            await tx.user.update({
                where: { id: user.id },
                data: {
                    name: 'System Administrator',
                    email: 'admin@activehardware.com',
                    password: hashedPassword,
                    mustChangePassword: true,
                    roleId: adminRole?.id || undefined
                }
            })

            // 9. Re-seed default "Sold" Location
            await tx.location.create({
                data: {
                    name: 'Sold',
                    address: 'Virtual Location',
                    type: 'VIRTUAL'
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
