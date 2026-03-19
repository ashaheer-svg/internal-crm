import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { exec } from 'child_process'
import { promisify } from 'util'
import bcrypt from 'bcryptjs'
import { requireRole } from '@/lib/auth'

const execAsync = promisify(exec)

export async function POST(req: Request) {
    try {
        // FIXME: Bypassed for development. Enforce in production!
        // await requireRole(['ADMIN'])
        const { action } = await req.json()

        if (!action) {
            return NextResponse.json({ error: 'Action is required' }, { status: 400 })
        }

        switch (action) {
            case 'reset':
                return await handleReset()
            case 'check':
                return await handleCheck()
            case 'fix':
                return await handleFix()
            case 'restore-admin':
                return await handleRestoreAdmin()
            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

async function handleReset() {
    try {
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
            await tx.session.deleteMany({})
            await tx.user.deleteMany({})

            // 8. Re-initialize Admin Role and User
            let adminRole = await tx.role.findFirst({ where: { name: 'ADMIN' } })
            if (!adminRole) {
                adminRole = await tx.role.create({
                    data: {
                        name: 'ADMIN',
                        description: 'System Administrator (Auto-generated)',
                        isSystemDefault: true
                    }
                })
            }

            const hashedPassword = await bcrypt.hash('Admin@123', 10)

            await tx.user.create({
                data: {
                    name: 'System Administrator',
                    email: 'admin@activehardware.com',
                    password: hashedPassword,
                    roleId: adminRole.id,
                    isActive: true,
                    mustChangePassword: true
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

        return NextResponse.json({
            success: true,
            message: 'Database reset successfully. Default user: admin@activehardware.com / Admin@123'
        })

    } catch (error: any) {
        console.error('Reset failed:', error)
        return NextResponse.json({ error: `Reset failed: ${error.message}` }, { status: 500 })
    }
}

async function handleCheck() {
    try {
        // Run prisma migrate status
        const { stdout, stderr } = await execAsync('npx prisma migrate status')
        return NextResponse.json({
            success: true,
            output: stdout || stderr
        })
    } catch (error: any) {
        // migrate status returns non-zero exit code if not in sync, but we want to show the output
        return NextResponse.json({
            success: false,
            output: error.stdout || error.stderr || error.message
        })
    }
}

async function handleFix() {
    try {
        // Run prisma migrate deploy
        const { stdout, stderr } = await execAsync('npx prisma migrate deploy')
        return NextResponse.json({
            success: true,
            output: stdout || stderr
        })
    } catch (error: any) {
        return NextResponse.json({
            success: false,
            output: error.stdout || error.stderr || error.message
        })
    }
}

async function handleRestoreAdmin() {
    try {
        const hashedPassword = await bcrypt.hash('Admin@123', 10)

        let adminRole = await prisma.role.findFirst({ where: { name: 'ADMIN' } })
        if (!adminRole) {
            adminRole = await prisma.role.create({
                data: {
                    name: 'ADMIN',
                    description: 'System Administrator (Auto-generated)',
                    isSystemDefault: true
                }
            })
        }

        await prisma.user.upsert({
            where: { email: 'admin@activehardware.com' },
            update: {
                password: hashedPassword,
                roleId: adminRole.id,
                isActive: true,
                // Unlock if locked?
            },
            create: {
                name: 'System Administrator',
                email: 'admin@activehardware.com',
                password: hashedPassword,
                roleId: adminRole.id,
                isActive: true,
                mustChangePassword: true
            }
        })

        return NextResponse.json({
            success: true,
            message: 'Admin user restored. Login: admin@activehardware.com / Admin@123'
        })
    } catch (error: any) {
        return NextResponse.json({ error: `Restore Admin failed: ${error.message}` }, { status: 500 })
    }
}
