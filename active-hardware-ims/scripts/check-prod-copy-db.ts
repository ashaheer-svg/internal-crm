import { PrismaClient } from '@prisma/client'
import path from 'path'

const dbPath = path.join(process.cwd(), 'prisma', 'prod - Copy.db')
const databaseUrl = `file:${dbPath}`

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: databaseUrl
        }
    }
})

async function main() {
    console.log('--- DIAGNOSTIC: PROD - COPY.DB TABLES ---')
    console.log('Using DB URL:', databaseUrl)
    try {
        const tables: any[] = await prisma.$queryRaw`SELECT name FROM sqlite_master WHERE type='table'`
        console.log('Tables found:', tables.length)
        for (const t of tables) {
            try {
                const count: any[] = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "${t.name}"`)
                console.log(`- ${t.name}: ${count[0].count}`)
            } catch (e) {
                // Ignore errors for system tables
            }
        }
    } catch (err: any) {
        console.error('FAILURE:', err.message)
    } finally {
        await prisma.$disconnect()
    }
}

main()
