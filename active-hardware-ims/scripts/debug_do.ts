
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('--- Debugging Delivery Order Schema ---')
    try {
        // 1. Try to fetch one DO with isActive field
        console.log('Attempting to fetch first delivery order...')
        const order = await prisma.deliveryOrder.findFirst({
            select: {
                id: true,
                orderNumber: true,
                isActive: true // Explicitly select isActive to force error if missing
            }
        })
        console.log('Success! Found order:', order)

        // 2. Try to create a dummy one to verify constraints (optional, skipping for read-only debug)

    } catch (e: any) {
        console.error('--- ERROR ---')
        console.error(e.message)
        if (e.code) console.error('Error Code:', e.code)
    } finally {
        await prisma.$disconnect()
    }
}

main()
