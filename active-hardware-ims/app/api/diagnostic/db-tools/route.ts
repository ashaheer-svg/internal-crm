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
        // 1. Delete all data in reverse topological order (children first)
        await prisma.$transaction([
            // Transaction/Activity Logs
            prisma.auditLog.deleteMany(),
            prisma.transactionLog.deleteMany(),

            // Financial Documents & Items
            prisma.backorderItem.deleteMany(),
            prisma.invoiceItem.deleteMany(),
            prisma.invoice.deleteMany(),

            prisma.deliveryOrderItem.deleteMany(),
            prisma.deliveryOrder.deleteMany(),

            prisma.purchaseOrderItem.deleteMany(),
            prisma.purchaseOrder.deleteMany(),

            prisma.gRNItem.deleteMany(),
            prisma.goodsReceiptNote.deleteMany(),

            // Warranty & Reservations
            prisma.warrantyClaim.deleteMany(),
            prisma.reservation.deleteMany(),

            // Core Inventory
            prisma.inventoryItem.deleteMany(),

            // Settings / Auxiliary
            prisma.deliveryAddress.deleteMany(),

            // Main Entities
            prisma.product.deleteMany(),
            prisma.customer.deleteMany(),
            // prisma.location.deleteMany(), // Keep locations or reset? Resetting is cleaner.
            prisma.location.deleteMany(),
            prisma.category.deleteMany(),

            // System
            prisma.session.deleteMany(),
            prisma.user.deleteMany(),
            prisma.sequence.deleteMany(),
        ])

        // 2. Re-seed Admin User and Default Location (Hardcoded here to avoid spawning 'npm run seed' process which might be slow/complex)

        // Default Location
        await prisma.location.create({
            data: {
                name: 'Main Warehouse',
                type: 'PHYSICAL',
                address: '123 Main St' // Placeholder
            }
        })

        // Sold Location
        await prisma.location.create({
            data: {
                name: 'Sold',
                address: 'Virtual Location',
                type: 'VIRTUAL'
            }
        })

        // Admin User
        const hashedPassword = await bcrypt.hash('Admin@123', 10)
        await prisma.user.create({
            data: {
                name: 'System Administrator',
                email: 'admin@activehardware.com',
                password: hashedPassword,
                role: 'ADMIN',
                isActive: true,
                mustChangePassword: true
            }
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

        await prisma.user.upsert({
            where: { email: 'admin@activehardware.com' },
            update: {
                password: hashedPassword,
                role: 'ADMIN',
                isActive: true,
                // Unlock if locked?
            },
            create: {
                name: 'System Administrator',
                email: 'admin@activehardware.com',
                password: hashedPassword,
                role: 'ADMIN',
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
