import { NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'
import { requireRole } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function GET() {
    try {
        // FIXME: Bypassed for development. Enforce in production!
        // Enforce Admin Access
        // await requireRole(['ADMIN'])

        let dbPath = process.env.DATABASE_URL?.replace('file:', '') || './prisma/prod.db'

        // Handle potential query parameters
        if (dbPath.includes('?')) {
            dbPath = dbPath.split('?')[0]
        }

        const fullDbPath = path.isAbsolute(dbPath)
            ? dbPath
            : path.join(process.cwd(), dbPath)

        if (!fs.existsSync(fullDbPath)) {
            return new NextResponse('Database file not found', { status: 404 })
        }

        const fileBuffer = fs.readFileSync(fullDbPath)
        const stats = fs.statSync(fullDbPath)

        return new NextResponse(fileBuffer, {
            headers: {
                'Content-Disposition': `attachment; filename="prod.db"`,
                'Content-Type': 'application/x-sqlite3',
                'Content-Length': stats.size.toString()
            }
        })

    } catch (error: any) {
        return new NextResponse(`Error downloading database: ${error.message}`, { status: 500 })
    }
}
