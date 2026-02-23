import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function listSequences() {
    const seqs = await prisma.sequence.findMany()
    console.log("Sequences in DB:")
    console.log(JSON.stringify(seqs, null, 2))
}

listSequences()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
