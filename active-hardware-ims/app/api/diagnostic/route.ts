import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { exec } from 'child_process'
import { promisify } from 'util'
import { requireRole } from '@/lib/auth'

const execAsync = promisify(exec)

export async function GET() {
    const diagnostics: any = {
        timestamp: new Date().toISOString(),
        system: {},
        checks: {}
    }

    try {
        // FIXME: Bypassed for development. Enforce in production!
        // await requireRole(['ADMIN'])
        // 0. System Stats
        const totalMem = os.totalmem()
        const freeMem = os.freemem()
        const usedMem = totalMem - freeMem

        let diskInfo: any = { status: 'unknown' }
        try {
            // Node 18.15+ supports fs.statfs
            if ((fs as any).statfsSync) {
                const stats = (fs as any).statfsSync(process.cwd())
                const totalDisk = stats.bsize * stats.blocks
                const freeDisk = stats.bsize * stats.bavail // bavail is for non-root users
                diskInfo = {
                    total: totalDisk,
                    free: freeDisk,
                    used: totalDisk - freeDisk,
                    percentFree: Math.round((freeDisk / totalDisk) * 100)
                }
            }
        } catch (e) {
            diskInfo.error = String(e)
        }

        let topOutput = "Not available"
        try {
            // Try to run top/ps command
            if (process.platform !== 'win32') {
                // Linux: get top 5 processes by memory
                const { stdout } = await execAsync('ps -eo pid,ppid,cmd,%mem,%cpu --sort=-%mem | head -n 6')
                topOutput = stdout
            } else {
                // Windows alternative (basic)
                const { stdout } = await execAsync('tasklist /FI "MEMUSAGE gt 50000"')
                topOutput = stdout
            }
        } catch (e: any) {
            topOutput = `Error running top: ${e.message}`
        }

        diagnostics.system = {
            os: `${os.type()} ${os.release()} (${os.arch()})`,
            uptime: os.uptime(),
            loadAvg: os.loadavg(),
            memory: {
                total: totalMem,
                free: freeMem,
                used: usedMem,
                percentUsed: Math.round((usedMem / totalMem) * 100)
            },
            disk: diskInfo,
            top: topOutput
        }

        // 1. Check environment variables
        diagnostics.checks.environment = {
            DATABASE_URL: process.env.DATABASE_URL || 'NOT SET',
            NODE_ENV: process.env.NODE_ENV || 'NOT SET',
            hasEnvFile: fs.existsSync(path.join(process.cwd(), '.env')),
            processWorkingDirectory: process.cwd(),
            __dirname: __dirname
        }

        // 2. Check database file
        let dbPath = process.env.DATABASE_URL?.replace('file:', '') || './prisma/prod.db'

        // Handle potential query parameters in connection string (e.g. ?connection_limit=1)
        if (dbPath.includes('?')) {
            dbPath = dbPath.split('?')[0]
        }

        const fullDbPath = path.isAbsolute(dbPath)
            ? dbPath
            : path.join(process.cwd(), dbPath)
        diagnostics.checks.database = {
            path: fullDbPath,
            exists: fs.existsSync(fullDbPath),
            size: fs.existsSync(fullDbPath) ? fs.statSync(fullDbPath).size : 0
        }

        // 3. Test database connection
        try {
            await prisma.$connect()
            diagnostics.checks.databaseConnection = {
                status: 'SUCCESS',
                message: 'Database connection successful'
            }

            // 4. Check if User table exists and count users
            try {
                const userCount = await prisma.user.count()
                diagnostics.checks.userTable = {
                    exists: true,
                    count: userCount
                }

                // 5. Check for admin user
                const adminUser = await prisma.user.findUnique({
                    where: { email: 'admin@activehardware.com' },
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        role: true,
                        isActive: true,
                        mustChangePassword: true,
                        createdAt: true
                    }
                })

                diagnostics.checks.adminUser = adminUser ? {
                    exists: true,
                    ...adminUser
                } : {
                    exists: false,
                    message: 'Admin user not found'
                }
            } catch (error: any) {
                diagnostics.checks.userTable = {
                    exists: false,
                    error: error.message
                }
            }

            // 6. Check all tables
            try {
                const tables = await prisma.$queryRaw`
                    SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;
                ` as any[]

                diagnostics.checks.tables = {
                    count: tables.length,
                    list: tables.map((t: any) => t.name)
                }
            } catch (error: any) {
                diagnostics.checks.tables = {
                    error: error.message
                }
            }

            // 6b. Check database schema consistency
            try {
                // Check if Product table has accessCount column
                const productTableInfo = await prisma.$queryRaw`
                    PRAGMA table_info(Product);
                ` as any[]

                const columnNames = productTableInfo.map((col: any) => col.name)
                const hasAccessCount = columnNames.includes('accessCount')

                // Get all required columns from Prisma schema
                const requiredColumns = [
                    'id', 'sku', 'name', 'description', 'brand', 'category',
                    'model', 'minStock', 'warrantyMonths', 'lowResellerPrice',
                    'resellerPrice', 'accessCount', 'isActive', 'createdAt', 'updatedAt'
                ]

                const missingColumns = requiredColumns.filter(col => !columnNames.includes(col))
                const schemaConsistent = missingColumns.length === 0

                diagnostics.checks.schemaConsistency = {
                    status: schemaConsistent ? 'CONSISTENT' : 'INCONSISTENT',
                    productTable: {
                        hasAccessCount,
                        totalColumns: productTableInfo.length,
                        columns: columnNames,
                        missingColumns: missingColumns.length > 0 ? missingColumns : undefined
                    },
                    message: schemaConsistent
                        ? 'Database schema matches Prisma schema'
                        : `Missing columns: ${missingColumns.join(', ')}`
                }

                // Add to issues if schema is inconsistent
                if (!schemaConsistent) {
                    if (!diagnostics.overallStatus) {
                        diagnostics.overallStatus = { healthy: false, issues: [] }
                    }
                }
            } catch (error: any) {
                diagnostics.checks.schemaConsistency = {
                    status: 'ERROR',
                    error: error.message
                }
            }

        } catch (error: any) {
            diagnostics.checks.databaseConnection = {
                status: 'FAILED',
                error: error.message
            }
        } finally {
            await prisma.$disconnect()
        }

        // 7. Check Prisma schema file
        const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma')
        diagnostics.checks.prismaSchema = {
            exists: fs.existsSync(schemaPath),
            path: schemaPath
        }

        // 8. Check migrations
        const migrationsPath = path.join(process.cwd(), 'prisma', 'migrations')
        diagnostics.checks.migrations = {
            exists: fs.existsSync(migrationsPath),
            path: migrationsPath,
            count: fs.existsSync(migrationsPath) ? fs.readdirSync(migrationsPath).length : 0
        }

        // 9. Overall status
        const hasDatabase = diagnostics.checks.database.exists
        const hasConnection = diagnostics.checks.databaseConnection?.status === 'SUCCESS'
        const hasAdminUser = diagnostics.checks.adminUser?.exists === true
        const hasEnv = diagnostics.checks.environment.hasEnvFile
        const schemaConsistent = diagnostics.checks.schemaConsistency?.status === 'CONSISTENT'

        diagnostics.overallStatus = {
            healthy: hasDatabase && hasConnection && hasAdminUser && hasEnv && schemaConsistent,
            issues: []
        }

        if (!hasEnv) diagnostics.overallStatus.issues.push('Missing .env file')
        if (!hasDatabase) diagnostics.overallStatus.issues.push('Database file not found')
        if (!hasConnection) diagnostics.overallStatus.issues.push('Cannot connect to database')
        if (!hasAdminUser) diagnostics.overallStatus.issues.push('Admin user not found in database')
        if (!schemaConsistent) diagnostics.overallStatus.issues.push('Database schema is inconsistent with Prisma schema')

        // 10. Recommendations
        diagnostics.recommendations = []
        if (!hasEnv) {
            diagnostics.recommendations.push('Create .env file with DATABASE_URL="file:./prisma/prod.db"')
        }
        if (!hasDatabase || !hasConnection) {
            diagnostics.recommendations.push('Run: npx prisma migrate deploy')
        }
        if (!hasAdminUser) {
            diagnostics.recommendations.push('Run: npx prisma db seed')
        }
        if (!schemaConsistent) {
            diagnostics.recommendations.push('Run: npx prisma db push (to sync database schema with Prisma schema)')
        }

    } catch (error: any) {
        diagnostics.error = {
            message: error.message,
            stack: error.stack
        }
    }

    return NextResponse.json(diagnostics, {
        status: 200,
        headers: {
            'Content-Type': 'application/json'
        }
    })
}
