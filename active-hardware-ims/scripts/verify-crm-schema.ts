import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('--- VERIFICATION: CRM TABLES & SCHEMA ---')
    try {
        const tables: any[] = await prisma.$queryRaw`SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'CRM%'`
        console.log('CRM Tables found:', tables.map(t => t.name).join(', '))

        const taskFields: any[] = await prisma.$queryRaw`PRAGMA table_info(ProjectTask)`
        const hasRoleField = taskFields.some(f => f.name === 'assignedToRoleId')
        console.log('ProjectTask has assignedToRoleId:', hasRoleField)

        if (!hasRoleField) {
            console.error('CRITICAL: assignedToRoleId missing from ProjectTask table!')
        }

    } catch (err: any) {
        console.error('FAILURE:', err.message)
    } finally {
        await prisma.$disconnect()
    }
}

main()
