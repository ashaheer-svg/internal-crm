
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testSalesReport() {
    console.log('Testing Sales Report Query...')
    try {
        const invoices = await prisma.invoice.findMany({
            where: {},
            include: {
                items: {
                    include: {
                        product: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        console.log(`Found ${invoices.length} invoices.`)

        const reportData = invoices.map(inv => ({
            invoiceNumber: inv.invoiceNumber,
            date: inv.createdAt,
            customer: inv.customerName,
            items: (inv as any).items.length,
            totalAmount: inv.totalAmount,
            status: inv.status
        }))

        console.log('Report Data sample:', reportData.slice(0, 1))

        const summary = {
            totalInvoices: invoices.length,
            totalItems: invoices.reduce((sum, inv) => sum + (inv as any).items.length, 0),
            totalRevenue: invoices.reduce((sum, inv) => sum + inv.totalAmount, 0)
        }

        console.log('Summary:', summary)
        console.log('Success!')
    } catch (error) {
        console.error('Failed to generate report:', error)
        process.exit(1)
    } finally {
        await prisma.$disconnect()
    }
}

testSalesReport()
