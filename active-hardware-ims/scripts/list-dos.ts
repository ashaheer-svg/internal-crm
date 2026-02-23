import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function listDOs() {
    const dos = await prisma.deliveryOrder.findMany({ select: { orderNumber: true } })
    console.log("All DO Numbers in DB:")
    dos.forEach(d => console.log(`- ${d.orderNumber}`))
}

listDOs().finally(() => prisma.$disconnect())
