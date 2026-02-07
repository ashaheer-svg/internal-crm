import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { validateDatabaseFile, restoreDatabaseFromBackup } from '@/lib/backup'
import { logRestore } from '@/lib/audit'
import fs from 'fs'
import path from 'path'

export async function POST(request: Request) {
    try {
        const user = await requireRole(['ADMIN'])

        const formData = await request.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            )
        }

        // Convert file to buffer
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        // Validate it's a SQLite database (compressed or uncompressed)
        const isValid = await validateDatabaseFile(buffer)
        if (!isValid) {
            return NextResponse.json(
                { error: 'Invalid database file. Please upload a valid SQLite database (.db or .db.gz).' },
                { status: 400 }
            )
        }

        // Save uploaded file temporarily
        const tempPath = path.join(process.cwd(), 'prisma', `temp_restore_${Date.now()}.db.gz`)
        await fs.promises.writeFile(tempPath, buffer)

        try {
            // Restore database
            await restoreDatabaseFromBackup(tempPath)

            // Log restore action
            await logRestore(user.id, user.name, {
                filename: file.name,
                size: buffer.length,
                timestamp: new Date().toISOString()
            })

            return NextResponse.json({
                success: true,
                message: 'Database restored successfully. Please refresh the page.'
            })
        } finally {
            // Clean up temp file
            if (fs.existsSync(tempPath)) {
                await fs.promises.unlink(tempPath)
            }
        }
    } catch (error: any) {
        console.error('Restore error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to restore database' },
            { status: error.message === 'Forbidden' ? 403 : 500 }
        )
    }
}
