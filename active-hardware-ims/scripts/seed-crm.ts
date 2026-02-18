
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Seeding CRM configuration...')

    // 1. Check for Default Pipeline
    const existingPipeline = await prisma.cRMPipeline.findFirst({
        where: { isDefault: true }
    })

    if (existingPipeline) {
        console.log('Default CRM Pipeline already exists.')
        return
    }

    console.log('Creating Default "Standard Sales Pipeline"...')

    const pipeline = await prisma.cRMPipeline.create({
        data: {
            name: 'Standard Sales Pipeline',
            isDefault: true,
            stages: {
                create: [
                    { name: 'Lead', order: 1, color: 'bg-gray-100' },
                    { name: 'Qualified', order: 2, color: 'bg-blue-100' },
                    { name: 'Proposal', order: 3, color: 'bg-yellow-100' },
                    { name: 'Negotiation', order: 4, color: 'bg-orange-100' },
                    { name: 'Won', order: 5, color: 'bg-green-100' },
                    { name: 'Lost', order: 6, color: 'bg-red-100' }
                ]
            }
        },
        include: {
            stages: true
        }
    })

    console.log(`Created Pipeline: ${pipeline.name} with ${pipeline.stages.length} stages.`)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
