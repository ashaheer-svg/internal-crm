
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    try {
        console.log('Testing Complex API query...')
        const products = await prisma.product.findMany({
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: {
                        inventory: {
                            where: { status: "AVAILABLE" }
                        }
                    }
                },
                inventory: {
                    where: { status: "AVAILABLE" },
                    select: {
                        id: true,
                        serialNumber: true,
                        status: true,
                        locationId: true
                    }
                }
            }
        })
        console.log(`Found ${products.length} active products`)
        if (products.length > 0) {
            console.log('First product sample:', JSON.stringify(products[0], null, 2))
        }

    } catch (e) {
        console.error('Prisma Error:', e)
    } finally {
        await prisma.$disconnect()
    }
}

main()
