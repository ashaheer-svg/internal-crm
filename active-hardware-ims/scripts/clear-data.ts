import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function clearData() {
    console.log('Starting to clear all data...')

    try {
        // Delete in order to respect foreign key constraints
        await prisma.reservation.deleteMany({})
        console.log('✓ Cleared reservations')

        await prisma.warrantyClaim.deleteMany({})
        console.log('✓ Cleared warranty claims')

        await prisma.invoiceItem.deleteMany({})
        console.log('✓ Cleared invoice items')

        await prisma.invoice.deleteMany({})
        console.log('✓ Cleared invoices')

        await prisma.gRNItem.deleteMany({})
        console.log('✓ Cleared GRN items')

        await prisma.goodsReceiptNote.deleteMany({})
        console.log('✓ Cleared goods receipt notes')

        await prisma.purchaseOrderItem.deleteMany({})
        console.log('✓ Cleared purchase order items')

        await prisma.purchaseOrder.deleteMany({})
        console.log('✓ Cleared purchase orders')

        await prisma.transactionLog.deleteMany({})
        console.log('✓ Cleared transaction logs')

        await prisma.inventoryItem.deleteMany({})
        console.log('✓ Cleared inventory items')

        await prisma.product.deleteMany({})
        console.log('✓ Cleared products')

        await prisma.location.deleteMany({})
        console.log('✓ Cleared locations')

        await prisma.user.deleteMany({})
        console.log('✓ Cleared users')

        console.log('\n✅ All data cleared successfully!')
    } catch (error) {
        console.error('❌ Error clearing data:', error)
        throw error
    } finally {
        await prisma.$disconnect()
    }
}

clearData()
