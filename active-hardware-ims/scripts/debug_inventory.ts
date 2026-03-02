
import { prisma } from '../lib/db'

async function main() {
    // Check all brands and categories to find the correct ones for Synology
    const brands = await prisma.product.groupBy({
        by: ['brand']
    })
    const categories = await prisma.product.groupBy({
        by: ['category']
    })

    console.log('Available Brands:', brands.map(b => b.brand))
    console.log('Available Categories:', categories.map(c => c.category))

    const synologyProducts = await prisma.product.findMany({
        where: {
            brand: { contains: 'SYNOLOGY' }
        },
        take: 5
    })
    console.log('Synology Products Sample:', JSON.stringify(synologyProducts, null, 2))
}

main()
    .catch(console.error)
    .finally(() => process.exit())
