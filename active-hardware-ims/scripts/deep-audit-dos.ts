import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function deepAudit() {
    console.log("--- Deep Audit of DeliveryOrder Table (dev.db) ---")

    const count = await prisma.deliveryOrder.count()
    console.log(`Total DO records: ${count}`)

    const allDOs = await prisma.deliveryOrder.findMany({
        select: { id: true, orderNumber: true, createdAt: true }
    })

    console.log("Detailed List of Order Numbers:")
    allDOs.forEach(d => {
        console.log(`- ID: ${d.id}, Number: '${d.orderNumber}', Created: ${d.createdAt}`)
    })

    // Check for potential sequence collision
    const seq = await prisma.sequence.findUnique({ where: { id: 'DO' } })
    console.log("Current Sequence:", seq)
}

deepAudit().finally(() => prisma.$disconnect())
