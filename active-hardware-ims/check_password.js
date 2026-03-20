const { PrismaClient } = require('@prisma/client')
const { verifyPassword } = require('./lib/auth')
const prisma = new PrismaClient()

async function main() {
    const user = await prisma.user.findUnique({ where: { email: 'admin@activehardware.com' } })
    if (!user) {
        console.log("Admin user not found.")
        return
    }

    const passwordsToTest = ['12345678', 'Admin@123']
    for (const pw of passwordsToTest) {
        const isValid = await verifyPassword(pw, user.password)
        console.log(`Password '${pw}': ${isValid ? 'VALID ✅' : 'INVALID ❌'}`)
    }
}

main().catch(console.error).finally(() => prisma.$disconnect())
