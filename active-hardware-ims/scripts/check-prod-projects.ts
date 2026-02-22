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
    console.log('--- DIAGNOSTIC: PROD.DB CRM PROJECTS ---')
    console.log('Using DB URL:', databaseUrl)
    try {
        const projects = await (prisma as any).cRMProject.findMany({
            select: { id: true, title: true, isDeleted: true, projectCode: true }
        })
        console.log('Projects found:', projects.length)
        console.log(JSON.stringify(projects, null, 2))
    } catch (err: any) {
        console.error('FAILURE:', err.message)
    } finally {
        await prisma.$disconnect()
    }
}

main()
