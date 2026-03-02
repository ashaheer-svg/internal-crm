
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    const email = 'admin@activehardware.com'
    const hashedPassword = await bcrypt.hash('Admin@123', 10)

    await prisma.user.update({
        where: { email },
        data: {
            password: hashedPassword,
            isActive: true,
            mustChangePassword: false
        }
    })

    console.log('ADMIN_PASSWORD_RESET_SUCCESSFUL')
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
