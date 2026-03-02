
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    const email = 'admin@activehardware.com'
    const user = await prisma.user.findUnique({ where: { email } })

    if (!user) {
        console.log('USER_NOT_FOUND')
        return
    }

    const isValid = await bcrypt.compare('Admin@123', user.password)
    console.log('PASSWORD_VALID:', isValid)
    console.log('USER_ACTIVE:', user.isActive)
    console.log('HASH_TYPE:', user.password.startsWith('$2a$') || user.password.startsWith('$2y$') ? 'bcrypt' : 'unknown')
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
