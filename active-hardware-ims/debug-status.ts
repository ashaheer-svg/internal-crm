
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    try {
        console.log('Checking product status...')
        const totalProducts = await prisma.product.count()
        const activeProducts = await prisma.product.count({ where: { isActive: true } })
        const inactiveProducts = await prisma.product.count({ where: { isActive: false } })
        // Check for potential nulls if the migration didn't apply default
        // Prisma boolean fields shouldn't be null unless optional, but good to verify
        const allProducts = await prisma.product.findMany({
            include: {
                _count: {
                    select: { inventory: true }
                }
            },
            take: 10
        })

        console.log(`Total: ${totalProducts}`)
        console.log(`Active: ${activeProducts}`)
        console.log(`Inactive: ${inactiveProducts}`)
        console.log('Sample products:', allProducts)

    } catch (e) {
        console.error('Prisma Error:', e)
    } finally {
        await prisma.$disconnect()
    }
}

main()
