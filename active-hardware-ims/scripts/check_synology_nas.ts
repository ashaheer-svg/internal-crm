
import { prisma } from '../lib/db'

async function main() {
    const products = await prisma.product.findMany({
        select: {
            model: true,
            name: true,
            sku: true,
            brand: true,
            category: true
        }
    })

    // Filter manually for Synology NAS (case-insensitive)
    const filtered = products.filter(p =>
        p.brand?.toUpperCase() === 'SYNOLOGY' &&
        p.category?.toUpperCase() === 'NAS'
    )

    console.log(JSON.stringify(filtered, null, 2))
}

main()
    .catch(console.error)
    .finally(() => process.exit())
