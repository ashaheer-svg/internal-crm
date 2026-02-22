import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('--- DIAGNOSTIC: CRM PROJECTS ---')
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
