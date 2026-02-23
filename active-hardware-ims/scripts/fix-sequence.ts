import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function checkNextAvailable() {
    const seq = await prisma.sequence.findUnique({ where: { id: 'DO' } })
    if (!seq) {
        console.log("No DO sequence found.")
        return
    }

    const now = new Date()
    const year = now.getFullYear().toString().slice(-2)
    const month = (now.getMonth() + 1).toString().padStart(2, '0')
    const currentYearMonth = `${year}${month}`

    let n = seq.nextNumber
    if (seq.lastYearMonth !== currentYearMonth) {
        n = 1
    }

    console.log(`Checking numbers starting from ${n} for ${currentYearMonth}...`)

    for (let i = 0; i < 20; i++) {
        const testNum = n + i
        const formatted = `DO-${currentYearMonth}-${testNum.toString().padStart(4, '0')}`
        const exists = await prisma.deliveryOrder.findUnique({ where: { orderNumber: formatted } })

        if (exists) {
            console.log(`❌ ${formatted} EXISTS`)
        } else {
            console.log(`✅ ${formatted} is AVAILABLE`)
            if (i > 0 || (n === 1 && seq.lastYearMonth !== currentYearMonth)) {
                console.log(`Updating sequence to ${testNum + 1}...`)
                await prisma.sequence.update({
                    where: { id: 'DO' },
                    data: { nextNumber: testNum + 1, lastYearMonth: currentYearMonth }
                })
                console.log("Sequence updated.")
            }
            break
        }
    }
}

checkNextAvailable().finally(() => prisma.$disconnect())
