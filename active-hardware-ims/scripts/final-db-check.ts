import { PrismaClient } from '@prisma/client'
import path from 'path'

async function checkDb(name: string, url: string) {
    console.log(`--- CHECKING ${name} ---`)
    const prisma = new PrismaClient({
        datasources: { db: { url } }
    })
    try {
        const count = await (prisma as any).cRMProject.count()
        console.log(`Projects: ${count}`)
        if (count > 0) {
            const projects = await (prisma as any).cRMProject.findMany({ take: 1, select: { id: true, title: true } })
            console.log('Sample Project:', JSON.stringify(projects[0]))
        }
    } catch (e: any) {
        console.log(`Error: ${e.message}`)
    } finally {
        await prisma.$disconnect()
    }
}

async function main() {
    await checkDb('DEV.DB', 'file:./prisma/dev.db')
    await checkDb('PROD.DB', 'file:./prisma/prod.db')
}

main()
