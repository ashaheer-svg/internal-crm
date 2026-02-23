import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkSync() {
    console.log("--- Checking Sequence Sync ---")

    const sequence = await prisma.sequence.findUnique({ where: { id: 'DO' } })
    console.log("Sequence Table Entry:", sequence)

    const lastDOs = await prisma.deliveryOrder.findMany({
        orderBy: { orderNumber: 'desc' },
        take: 5
    })
    console.log("Last 5 Delivery Orders:", lastDOs.map(do_ => do_.orderNumber))

    // Find absolute max number for current month
    const now = new Date()
    const year = now.getFullYear().toString().slice(-2)
    const month = (now.getMonth() + 1).toString().padStart(2, '0')
    const currentYearMonth = `${year}${month}`

    const monthDOs = await prisma.deliveryOrder.findMany({
        where: {
            orderNumber: { contains: `DO-${currentYearMonth}` }
        }
    })

    if (monthDOs.length > 0) {
        const numbers = monthDOs.map(do_ => {
            const parts = do_.orderNumber.split('-')
            const numPart = parts[parts.length - 1]
            return parseInt(numPart)
        }).filter(n => !isNaN(n))

        const maxNum = Math.max(...numbers)
        console.log(`Max DO Number for ${currentYearMonth} is: ${maxNum}`)

        if (sequence && sequence.nextNumber <= maxNum) {
            console.log(`⚠️ SYNC ERROR: Sequence nextNumber (${sequence.nextNumber}) is <= Max DO Number (${maxNum})`)
            console.log(`FIX: Updating sequence to ${maxNum + 1}`)

            await prisma.sequence.update({
                where: { id: 'DO' },
                data: { nextNumber: maxNum + 1 }
            })
            console.log("✅ Sequence synced.")
        } else {
            console.log("✅ Sequence appears to be in sync or ahead.")
        }
    } else {
        console.log(`No DOs found for ${currentYearMonth}.`)
    }
}

checkSync()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
