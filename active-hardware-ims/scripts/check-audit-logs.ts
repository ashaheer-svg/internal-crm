import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('--- DIAGNOSTIC: AUDIT LOGS FOR CRM_PROJECT ---')
    try {
        const logs = await prisma.auditLog.findMany({
            where: { entityType: 'CRM_PROJECT' },
            take: 10,
            orderBy: { createdAt: 'desc' }
        })
        console.log('Logs found:', logs.length)
        console.log(JSON.stringify(logs, null, 2))
    } catch (err: any) {
        console.error('FAILURE:', err.message)
    } finally {
        await prisma.$disconnect()
    }
}

main()
