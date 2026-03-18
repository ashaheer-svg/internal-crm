const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    // 1. Update existing 'RMA' items to 'RMA_DEFECTIVE_RECEIVED'
    const updatedItems = await prisma.inventoryItem.updateMany({
      where: { status: 'RMA' },
      data: { status: 'RMA_DEFECTIVE_RECEIVED' }
    })
    console.log(`Updated ${updatedItems.count} items from status 'RMA' to 'RMA_DEFECTIVE_RECEIVED'`)

    // 2. Seed 'SRMA' sequence if not exists
    const existingSeq = await prisma.sequence.findUnique({
      where: { id: 'SRMA' }
    })

    if (!existingSeq) {
      await prisma.sequence.create({
        data: {
          id: 'SRMA',
          nextNumber: 1,
          prefix: 'SRMA-',
        }
      })
      console.log('Created sequence entry for SRMA.')
    } else {
      console.log('Sequence SRMA already exists.')
    }

  } catch (error) {
    console.error('Migration failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
