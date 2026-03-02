
import { prisma } from '../lib/db'

async function main() {
    const products = await prisma.product.findMany({
        where: {
            brand: 'SYNOLOGY',
            category: 'NAS'
        },
        select: {
            model: true,
            name: true,
            sku: true,
            brand: true,
            category: true
        }
    })
    console.log(JSON.stringify(products, null, 2))
}

main()
    .catch(console.error)
    .finally(() => process.exit())
