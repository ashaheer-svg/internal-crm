import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { validateDatabaseFile } from '@/lib/backup'
import fs from 'fs'
import path from 'path'
import zlib from 'zlib'
import { promisify } from 'util'
import { PrismaClient } from '@prisma/client'

const gunzip = promisify(zlib.gunzip)

export async function POST(request: Request) {
    let tempPath = ""
    try {
        const user = await requirePermission('settings:manage')

        const formData = await request.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 })
        }

        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        // 1. Validate SQLite header
        const isValid = await validateDatabaseFile(buffer)
        if (!isValid) {
            return NextResponse.json({ error: 'Invalid database file. Must be a SQLite database.' }, { status: 400 })
        }

        // 2. Decompress if needed
        let dbBuffer: Buffer
        if (buffer.length >= 2 && buffer[0] === 0x1f && buffer[1] === 0x8b) {
            dbBuffer = await gunzip(buffer)
        } else {
            dbBuffer = buffer
        }

        // 3. Save to a temporary inspection file in the prisma directory
        const tempId = `temp_validate_${Date.now()}.db`
        tempPath = path.join(process.cwd(), 'prisma', tempId)
        await fs.promises.writeFile(tempPath, dbBuffer)

        // 4. Connect with Dynamic Prisma Client
        const tempClient = new PrismaClient({
            datasources: {
                db: {
                    url: `file:./${tempId}` // Relative to prisma/ folder
                }
            }
        })

        await tempClient.$connect()

        let stats = {
            users: 0,
            customers: 0,
            products: 0,
            deliveryOrders: 0
        }
        let lastBackupDate = "Unknown"

        try {
            stats.users = await tempClient.user.count()
            stats.customers = await tempClient.customer.count()
            stats.products = await tempClient.product.count()
            stats.deliveryOrders = await tempClient.deliveryOrder.count()

            // Fetch last backup from Audit Log if exists
            const lastBackupLog = await tempClient.auditLog.findFirst({
                where: { entityType: 'BACKUP' },
                orderBy: { createdAt: 'desc' },
                select: { createdAt: true }
            })
            if (lastBackupLog) {
                lastBackupDate = lastBackupLog.createdAt.toISOString()
            }
        } catch (queryError) {
            console.error('Schema mismatch or counting error:', queryError)
            await tempClient.$disconnect()
            return NextResponse.json({
                error: 'Database schema mismatch. This file might be from an incompatible older version or corrupted.',
                compatible: false
            }, { status: 400 })
        }

        await tempClient.$disconnect()

        return NextResponse.json({
            success: true,
            compatible: true,
            tempId: tempId, // Return identifier for final restore stage
            stats: stats,
            backupTimestamp: lastBackupDate,
            filename: file.name
        })

    } catch (error: any) {
        console.error('Validation API Error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to inspect database' },
            { status: error.message === 'Forbidden' ? 403 : 500 }
        )
    } finally {
        // NOTE: We DO NOT delete the tempPath file here, as the follow-up /restore endpoint
        // needs to consume it. We'll set a background cleanup or let /restore delete it.
    }
}
