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
                        role: { select: { name: true } },
                        legacyRole: true,
                        isActive: true,
                        mustChangePassword: true,
                        createdAt: true
                    } as any
                })

                diagnostics.checks.adminUser = adminUser ? {
                    exists: true,
                    ...adminUser
                } : {
                    exists: false,
                    message: 'Admin user not found'
                }

                // 5b. Check RBAC (Roles and Permissions)
                try {
                    const p = prisma as any;
                    const roleCount = await p.role.count()
                    const permissionCount = await p.permission.count()
                    diagnostics.checks.rbacSystem = {
                        exists: true,
                        rolesCount: roleCount,
                        permissionsCount: permissionCount,
                        status: (roleCount > 0 && permissionCount > 0) ? 'CONFIGURED' : 'UNCONFIGURED'
                    }
                } catch (error: any) {
                    diagnostics.checks.rbacSystem = {
                        exists: false,
                        error: error.message
                    }
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
                // Check Product table
                const productTableInfo = await prisma.$queryRaw`PRAGMA table_info(Product);` as any[]
                const productColumns = productTableInfo.map((col: any) => col.name)
                const requiredProductColumns = [
                    'id', 'sku', 'name', 'brand', 'category', 'model', 'resellerPrice', 'accessCount'
                ]
                const missingProductColumns = requiredProductColumns.filter(col => !productColumns.includes(col))

                // Check Customer table
                const customerTableInfo = await prisma.$queryRaw`PRAGMA table_info(Customer);` as any[]
                const customerColumns = customerTableInfo.map((col: any) => col.name)
                const requiredCustomerColumns = [
                    'id', 'name', 'isActive', 'isCustomer', 'isSupplier', 'isPartner', 'salesRepId'
                ]
                const missingCustomerColumns = requiredCustomerColumns.filter(col => !customerColumns.includes(col))

                const schemaConsistent = missingProductColumns.length === 0 && missingCustomerColumns.length === 0

                diagnostics.checks.schemaConsistency = {
                    status: schemaConsistent ? 'CONSISTENT' : 'INCONSISTENT',
                    productTable: {
                        totalColumns: productTableInfo.length,
                        missingColumns: missingProductColumns.length > 0 ? missingProductColumns : undefined
                    },
                    customerTable: {
                        totalColumns: customerTableInfo.length,
                        missingColumns: missingCustomerColumns.length > 0 ? missingCustomerColumns : undefined
                    },
                    message: schemaConsistent
                        ? 'Database schema matches critical Prisma schema requirements'
                        : `Issues: ${missingProductColumns.length > 0 ? 'Product missing ' + missingProductColumns.join(', ') : ''} ${missingCustomerColumns.length > 0 ? 'Customer missing ' + missingCustomerColumns.join(', ') : ''}`
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
        const rbacConfigured = diagnostics.checks.rbacSystem?.status === 'CONFIGURED'

        diagnostics.overallStatus = {
            healthy: hasDatabase && hasConnection && hasAdminUser && hasEnv && schemaConsistent && rbacConfigured,
            issues: []
        }

        if (!hasEnv) diagnostics.overallStatus.issues.push('Missing .env file')
        if (!hasDatabase) diagnostics.overallStatus.issues.push('Database file not found')
        if (!hasConnection) diagnostics.overallStatus.issues.push('Cannot connect to database')
        if (!hasAdminUser) diagnostics.overallStatus.issues.push('Admin user not found in database')
        if (!schemaConsistent) diagnostics.overallStatus.issues.push('Database schema is inconsistent with Prisma schema')
        if (!rbacConfigured) diagnostics.overallStatus.issues.push('RBAC (Roles & Permissions) is unconfigured or empty')

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
        if (!rbacConfigured) {
            diagnostics.recommendations.push('Run: npx tsx prisma/seed-roles.ts (to seed default roles and permissions)')
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
