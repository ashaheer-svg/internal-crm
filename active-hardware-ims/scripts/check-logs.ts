import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkLogs() {
    try {
        const logs = await prisma.auditLog.findMany({
            where: {
                OR: [
                    { action: { contains: 'RESET' } },
                    { action: { contains: 'DELETE' } },
                    { entityType: 'database' }
                ]
            },
            take: 20,
            orderBy: { createdAt: 'desc' }
        })

        console.log('Recent Critical Logs:')
        console.log(JSON.stringify(logs, null, 2))
    } catch (e) {
        console.error(e)
    } finally {
        await prisma.$disconnect()
    }
}

checkLogs()
