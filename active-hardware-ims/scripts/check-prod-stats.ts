import { PrismaClient } from '@prisma/client'
import path from 'path'

const dbPath = path.join(process.cwd(), 'prisma', 'prod.db')
const databaseUrl = `file:${dbPath}`

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: databaseUrl
        }
    }
})

async function main() {
    console.log('--- DIAGNOSTIC: PROD.DB STATS ---')
    try {
        const customerCount = await (prisma as any).customer.count()
        console.log('Customers found:', customerCount)

        const userCount = await (prisma as any).user.count()
        console.log('Users found:', userCount)
    } catch (err: any) {
        console.error('FAILURE:', err.message)
    } finally {
        await prisma.$disconnect()
    }
}

main()
