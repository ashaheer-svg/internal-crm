
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    try {
        const users = await prisma.user.findMany({
            include: { role: true }
        })
        console.log('USERS_IN_DB:', JSON.stringify(users.map(u => ({ email: u.email, role: u.role?.name })), null, 2))
    } catch (e) {
        console.error('DB_ERROR:', e)
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
