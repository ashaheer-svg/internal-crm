import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('--- DIAGNOSTIC: SEQUENCE TABLE ---')
    try {
        const sequences = await prisma.sequence.findMany()
        console.log(JSON.stringify(sequences, null, 2))
    } catch (err: any) {
        console.error('FAILURE:', err.message)
    } finally {
        await prisma.$disconnect()
    }
}

main()
