import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function logoutAllUsers() {
    console.log('Logging out all users...')

    try {
        const { count } = await prisma.session.deleteMany({})
        console.log(`✅ Successfully logged out ${count} users (deleted ${count} sessions).`)
    } catch (error) {
        console.error('❌ Error logging out users:', error)
        process.exit(1)
    } finally {
        await prisma.$disconnect()
    }
}

logoutAllUsers()
