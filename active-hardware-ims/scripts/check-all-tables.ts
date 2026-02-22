import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('--- DIAGNOSTIC: DEV.DB TABLES ---')
    try {
        // Query to list all tables in SQLite
        const tables: any[] = await prisma.$queryRaw`SELECT name FROM sqlite_master WHERE type='table'`
        console.log('Tables found:', tables.length)
        for (const t of tables) {
            const count: any[] = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "${t.name}"`)
            console.log(`- ${t.name}: ${count[0].count}`)
        }
    } catch (err: any) {
        console.error('FAILURE:', err.message)
    } finally {
        await prisma.$disconnect()
    }
}

main()
