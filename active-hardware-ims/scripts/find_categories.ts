import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const brands = await prisma.product.findMany({
        select: { brand: true },
        distinct: ['brand']
    })
    console.log("Brands:", brands.map(b => b.brand))

    const synologyProducts = await prisma.product.findMany({
        where: { brand: { contains: 'Synology' } },
        select: { category: true, name: true, sku: true },
        distinct: ['category']
    })
    console.log("Synology Categories:", synologyProducts)

    const allCategories = await prisma.product.findMany({
        select: { category: true },
        distinct: ['category']
    })
    console.log("All Categories:", allCategories.map(c => c.category))
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
