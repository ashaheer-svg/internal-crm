import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('--- PRISMA CLIENT INSPECTION ---')
    const keys = Object.keys(prisma)
    console.log('Available models/keys (filtered):')
    const filteredKeys = keys.filter(k =>
        k.toLowerCase().includes('task') ||
        k.toLowerCase().includes('message') ||
        k.toLowerCase().includes('project') ||
        k.toLowerCase().includes('crm')
    )
    console.log(filteredKeys.sort())

    // Try a simple findFirst on ProjectTask
    try {
        const anyTask = await (prisma as any).projectTask.findFirst()
        console.log('projectTask.findFirst success')
    } catch (e: any) {
        console.log('projectTask.findFirst failed:', e.message)
    }

    try {
        const anyMsg = await (prisma as any).message.findFirst()
        console.log('message.findFirst success')
    } catch (e: any) {
        console.log('message.findFirst failed:', e.message)
    }

    await prisma.$disconnect()
}

main()
