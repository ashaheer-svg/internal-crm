import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import * as fs from 'fs'
import * as path from 'path'

export async function GET() {
    const diagnostics: any = {
        timestamp: new Date().toISOString(),
        checks: {}
    }

    try {
        // 1. Check environment variables
        diagnostics.checks.environment = {
            DATABASE_URL: process.env.DATABASE_URL || 'NOT SET',
            NODE_ENV: process.env.NODE_ENV || 'NOT SET',
            hasEnvFile: fs.existsSync(path.join(process.cwd(), '.env')),
            processWorkingDirectory: process.cwd(),
            __dirname: __dirname
        }

        // 2. Check database file
        const dbPath = process.env.DATABASE_URL?.replace('file:', '') || './prisma/prod.db'
        const fullDbPath = path.join(process.cwd(), dbPath)
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

        diagnostics.overallStatus = {
            healthy: hasDatabase && hasConnection && hasAdminUser && hasEnv,
            issues: []
        }

        if (!hasEnv) diagnostics.overallStatus.issues.push('Missing .env file')
        if (!hasDatabase) diagnostics.overallStatus.issues.push('Database file not found')
        if (!hasConnection) diagnostics.overallStatus.issues.push('Cannot connect to database')
        if (!hasAdminUser) diagnostics.overallStatus.issues.push('Admin user not found in database')

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
