import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { getDatabasePath } from '@/lib/backup'
import fs from 'fs'
import path from 'path'

export async function GET() {
    try {
        const user = await requirePermission('settings:manage')

        const dbPath = getDatabasePath()

        if (!fs.existsSync(dbPath)) {
            return NextResponse.json(
                { error: 'Database file not found' },
                { status: 404 }
            )
        }

        const stats = await fs.promises.stat(dbPath)
        const fileBuffer = await fs.promises.readFile(dbPath)
        
        const filename = path.basename(dbPath)

        return new NextResponse(fileBuffer, {
            headers: {
                'Content-Type': 'application/x-sqlite3',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Length': stats.size.toString()
            }
        })

    } catch (error: any) {
        console.error('Database download error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to download database' },
            { status: error.message === 'Forbidden' ? 403 : 500 }
        )
    }
}
