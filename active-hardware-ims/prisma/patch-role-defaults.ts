import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    // Only ADMIN and VIEWER are truly system-protected
    const protected_roles = ['ADMIN', 'VIEWER']
    const unprotected_roles = ['MANAGER', 'SALES', 'WAREHOUSE']

    for (const name of unprotected_roles) {
        const updated = await (prisma as any).role.updateMany({
            where: { name },
            data: { isSystemDefault: false }
        })
        console.log(`Set ${name} isSystemDefault=false (matched ${updated.count} records)`)
    }

    for (const name of protected_roles) {
        const updated = await (prisma as any).role.updateMany({
            where: { name },
            data: { isSystemDefault: true }
        })
        console.log(`Set ${name} isSystemDefault=true (matched ${updated.count} records)`)
    }

    console.log('Done!')
}

main().catch(console.error).finally(() => prisma.$disconnect())
