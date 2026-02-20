import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { getDatabasePath, createBackupFilename } from '@/lib/backup'
import { logBackup } from '@/lib/audit'
import fs from 'fs'
import zlib from 'zlib'
import { promisify } from 'util'

const gzip = promisify(zlib.gzip)

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

        // Read the database file
        const fileBuffer = await fs.promises.readFile(dbPath)

        // Compress the file
        const compressedBuffer = await gzip(fileBuffer)

        // Generate filename with timestamp
        const filename = createBackupFilename()

        // Log backup action
        await logBackup(user.id, user.name, {
            filename,
            originalSize: fileBuffer.length,
            compressedSize: compressedBuffer.length,
            compressionRatio: ((1 - compressedBuffer.length / fileBuffer.length) * 100).toFixed(2) + '%',
            timestamp: new Date().toISOString()
        })

        // Return compressed file as download
        return new NextResponse(compressedBuffer, {
            headers: {
                'Content-Type': 'application/gzip',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Length': compressedBuffer.length.toString()
            }
        })
    } catch (error: any) {
        console.error('Backup download error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to download backup' },
            { status: error.message === 'Forbidden' ? 403 : 500 }
        )
    }
}
