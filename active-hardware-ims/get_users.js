const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    console.log("Fetching users from DB...")
    const users = await prisma.user.findMany({
        select: { id: true, name: true, email: true, isActive: true }
    })
    console.log(JSON.stringify(users, null, 2))
}

main().catch(console.error).finally(() => prisma.$disconnect())
