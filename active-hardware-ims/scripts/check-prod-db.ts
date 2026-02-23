import { PrismaClient } from '@prisma/client'

// Manually point to prod.db
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: 'file:./prisma/prod.db',
        },
    },
})

async function checkProd() {
    console.log("--- Checking PROD.DB ---")

    try {
        const sequence = await prisma.sequence.findUnique({ where: { id: 'DO' } })
        console.log("Sequence Table Entry (PROD):", sequence)

        const lastDOs = await prisma.deliveryOrder.findMany({
            orderBy: { orderNumber: 'desc' },
            take: 10
        })
        console.log("Delivery Orders in PROD:", lastDOs.map(do_ => do_.orderNumber))
    } catch (e) {
        console.error("Error accessing PROD.DB:", e)
    }
}

checkProd()
    .finally(() => prisma.$disconnect())
