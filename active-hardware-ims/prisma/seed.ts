import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    console.log('Seeding database...')

    // Check if admin user already exists
    const existingAdmin = await prisma.user.findUnique({
        where: { email: 'admin@activehardware.com' }
    })

    if (existingAdmin) {
        console.log('Admin user already exists')
        // Ensure 'Sold' location exists even if admin exists
        const soldLocation = await prisma.location.findFirst({ where: { name: 'Sold' } })
        if (!soldLocation) {
            await prisma.location.create({
                data: {
                    name: 'Sold',
                    address: 'Virtual Location',
                    description: 'Items that have been sold'
                }
            })
            console.log("Created 'Sold' location")
        }
        return
    }

    // Create default admin user
    const hashedPassword = await bcrypt.hash('Admin@123', 10)

    const admin = await prisma.user.create({
        data: {
            name: 'System Administrator',
            email: 'admin@activehardware.com',
            password: hashedPassword,
            role: 'ADMIN',
            isActive: true,
            mustChangePassword: true
        }
    })

    console.log('Created admin user:', admin.email)
    console.log('Default password: Admin@123')
    console.log('Please change the password on first login')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
