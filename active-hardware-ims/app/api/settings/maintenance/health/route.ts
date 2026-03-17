import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import os from 'os'
import fs from 'fs'
import path from 'path'
import { prisma } from '@/lib/db'

export async function GET() {
    try {
        await requirePermission('settings:manage')

        // System Metrics
        const uptime = os.uptime()
        const loadAvg = os.loadavg()
        const totalMem = os.totalmem()
        const freeMem = os.freemem()
        const memoryUsage = process.memoryUsage()

        // Database Metrics
        let dbSize = 0
        try {
            const dbPath = path.join(process.cwd(), 'prisma', 'prod.db')
            if (fs.existsSync(dbPath)) {
                const stats = fs.statSync(dbPath)
                dbSize = stats.size
            } else {
                // Fallback to dev.db if prod.db doesn't exist (though in production it should)
                const devDbPath = path.join(process.cwd(), 'prisma', 'dev.db')
                if (fs.existsSync(devDbPath)) {
                    const stats = fs.statSync(devDbPath)
                    dbSize = stats.size
                }
            }
        } catch (e) {
            console.error('Failed to get DB size:', e)
        }

        // DB Connectivity Check
        let dbStatus = 'CONNECTED'
        try {
            await prisma.$queryRaw`SELECT 1`
        } catch (e) {
            dbStatus = 'DISCONNECTED'
        }

        // Schema reading
        const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma')
        const schemaString = fs.existsSync(schemaPath) ? fs.readFileSync(schemaPath, 'utf8') : ''

        return NextResponse.json({
            schemaString,
            system: {
                uptime,
                loadAvg,
                memory: {
                    total: totalMem,
                    free: freeMem,
                    process: memoryUsage
                },
                platform: os.platform(),
                arch: os.arch(),
                cpus: os.cpus().length,
                nodeVersion: process.version
            },
            database: {
                status: dbStatus,
                sizeBytes: dbSize,
                path: process.env.NODE_ENV === 'production' ? 'prisma/prod.db' : 'prisma/dev.db'
            },
            timestamp: new Date().toISOString()
        })

    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to fetch health metrics' },
            { status: 500 }
        )
    }
}
