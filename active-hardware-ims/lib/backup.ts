import fs from 'fs'
import path from 'path'
import zlib from 'zlib'
import { promisify } from 'util'
import { prisma } from './db'

const gzip = promisify(zlib.gzip)
const gunzip = promisify(zlib.gunzip)

/**
 * Get the absolute path to the SQLite database file
 */
export function getDatabasePath(): string {
    const databaseUrl = process.env.DATABASE_URL
    const defaultPath = path.join(process.cwd(), 'prisma', 'dev.db')

    if (!databaseUrl || !databaseUrl.startsWith('file:')) {
        return defaultPath
    }

    const filePath = databaseUrl.replace('file:', '')
    
    // Prisma relative paths are relative to the schema.prisma location (usually in ./prisma folder)
    if (filePath.startsWith('./') || !filePath.includes('/')) {
        const filename = path.basename(filePath)
        return path.join(process.cwd(), 'prisma', filename)
    }

    // fallback or absolute
    return path.resolve(process.cwd(), 'prisma', filePath)
}

/**
 * Generate a timestamped backup filename
 */
export function createBackupFilename(): string {
    const now = new Date()
    const timestamp = now.toISOString()
        .replace(/:/g, '-')
        .replace(/\..+/, '')
        .replace('T', '_')
    return `backup_${timestamp}.db.gz`
}

/**
 * Validate that a file is a compressed SQLite database or uncompressed SQLite database
 */
export async function validateDatabaseFile(buffer: Buffer): Promise<boolean> {
    // Check if it's a gzip file (starts with 0x1f 0x8b)
    if (buffer.length >= 2 && buffer[0] === 0x1f && buffer[1] === 0x8b) {
        try {
            // Try to decompress and check if it's a SQLite database
            const decompressed = await gunzip(buffer)
            const sqliteHeader = Buffer.from('SQLite format 3\0')
            return decompressed.subarray(0, sqliteHeader.length).equals(sqliteHeader)
        } catch {
            return false
        }
    }

    // Check if it's an uncompressed SQLite file
    const sqliteHeader = Buffer.from('SQLite format 3\0')
    if (buffer.length < sqliteHeader.length) {
        return false
    }

    return buffer.subarray(0, sqliteHeader.length).equals(sqliteHeader)
}

/**
 * Create a backup of the current database (compressed)
 */
export async function createDatabaseBackup(destinationPath: string): Promise<void> {
    const sourcePath = getDatabasePath()

    if (!fs.existsSync(sourcePath)) {
        throw new Error('Database file not found')
    }

    // Read and compress the database file
    const fileBuffer = await fs.promises.readFile(sourcePath)
    const compressed = await gzip(fileBuffer)
    await fs.promises.writeFile(destinationPath, compressed)
}

/**
 * Restore database from a backup file (handles both compressed and uncompressed)
 */
export async function restoreDatabaseFromBackup(backupPath: string): Promise<void> {
    const dbPath = getDatabasePath()

    // Create a safety backup of current database
    const safetyBackupPath = path.join(
        process.cwd(),
        'prisma',
        `safety_backup_${Date.now()}.db`
    )

    try {
        // Create safety backup
        if (fs.existsSync(dbPath)) {
            await fs.promises.copyFile(dbPath, safetyBackupPath)
        }

        // Read backup file
        const backupBuffer = await fs.promises.readFile(backupPath)

        // Check if it's compressed (gzip header: 0x1f 0x8b)
        let dbBuffer: Buffer
        if (backupBuffer.length >= 2 && backupBuffer[0] === 0x1f && backupBuffer[1] === 0x8b) {
            // Decompress
            dbBuffer = await gunzip(backupBuffer)
        } else {
            // Already uncompressed
            dbBuffer = backupBuffer
        }

        // Disconnect Prisma client
        await prisma.$disconnect()

        // Write database file
        await fs.promises.writeFile(dbPath, dbBuffer)

        // Reconnect Prisma client
        await prisma.$connect()

    } catch (error) {
        // If restore fails, restore from safety backup
        if (fs.existsSync(safetyBackupPath)) {
            await fs.promises.copyFile(safetyBackupPath, dbPath)
        }
        throw error
    } finally {
        // Clean up safety backup after successful restore
        if (fs.existsSync(safetyBackupPath)) {
            await fs.promises.unlink(safetyBackupPath)
        }
    }
}

/**
 * Get recent backup history from audit logs
 */
export async function getBackupHistory(limit: number = 10) {
    const backups = await prisma.auditLog.findMany({
        where: {
            entityType: 'BACKUP'
        },
        orderBy: {
            createdAt: 'desc'
        },
        take: limit,
        select: {
            id: true,
            createdAt: true,
            userName: true,
            metadata: true
        }
    })

    return backups
}
