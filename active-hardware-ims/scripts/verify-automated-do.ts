import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log("--- Automated Quote to DO Workflow Verification ---")

    // 1. Get an existing user
    const user = await prisma.user.findFirst({ where: { isActive: true } })
    if (!user) {
        console.error("No active user found.")
        return
    }

    // 2. Ensure an ACC-MGR role exists
    let accMgrRole = await prisma.role.findFirst({ where: { name: 'ACC-MGR' } })
    if (!accMgrRole) {
        accMgrRole = await prisma.role.create({
            data: { name: 'ACC-MGR', description: 'Account Manager' }
        })
    }

    // 3. Create a dummy Project and Customer
    let customer = await prisma.customer.findFirst()
    if (!customer) {
        customer = await prisma.customer.create({
            data: { name: 'Verification Customer', email: 'verify@customer.com' }
        })
    }

    const project = await prisma.cRMProject.findFirst({ where: { isDeleted: false } })
    if (!project) {
        console.error("No active CRM Project found.")
        process.exit(1)
    }

    // 4. Create a dummy product for line items
    let product = await prisma.product.findFirst()
    if (!product) {
        product = await prisma.product.create({
            data: {
                name: 'Verification Product',
                sku: `VERIFY-SKU-${Date.now()}`,
                resellerPrice: 100,
                brand: 'TEST',
                model: 'VERIFY'
            }
        })
    }

    // 5. Create a DRAFT Quote
    const quote = await prisma.cRMQuote.create({
        data: {
            quoteNumber: `QT-VERIFY-${Date.now()}`,
            projectId: project.id,
            status: 'DRAFT',
            subTotal: 100,
            taxAmount: 0,
            totalAmount: 100,
            version: 1,
            createdById: user.id,
            items: {
                create: {
                    productId: product.id,
                    description: 'Verify item',
                    quantity: 1,
                    unitPrice: 100,
                    order: 1,
                    total: 100
                }
            }
        },
        include: { items: true }
    })

    console.log(`Created Test Quote: ${quote.quoteNumber}`)

    // 6. Simulate the Automated Workflow Logic (Copy-pasted from route.ts for verification)
    console.log("Simulating Automated Workflow Logic...")

    const body = {
        poNumber: 'PO-VERIFY-999',
        urgency: 'URGENT',
        expectedDeliveryDate: new Date()
    }

    const now = new Date()
    const year = now.getFullYear().toString().slice(-2)
    const month = (now.getMonth() + 1).toString().padStart(2, '0')
    const currentYearMonth = `${year}${month}`

    let sequence = await prisma.sequence.findUnique({ where: { id: 'DO' } })
    if (!sequence) {
        sequence = await prisma.sequence.create({
            data: { id: 'DO', prefix: 'DO-', nextNumber: 1, lastYearMonth: currentYearMonth }
        })
    }

    let nextNum = sequence.nextNumber
    let lastYM = sequence.lastYearMonth
    if (lastYM !== currentYearMonth) {
        nextNum = 1
        lastYM = currentYearMonth
    }
    const doNumber = `${sequence.prefix}${currentYearMonth}-${nextNum.toString().padStart(4, '0')}`

    const result = await prisma.$transaction(async (tx) => {
        await tx.sequence.update({
            where: { id: 'DO' },
            data: { nextNumber: nextNum + 1, lastYearMonth: lastYM }
        })

        const deliveryOrder = await (tx as any).deliveryOrder.create({
            data: {
                orderNumber: doNumber,
                customerId: project.customerId,
                customerName: customer?.name || 'Unknown',
                saleType: quote.saleType || 'DIRECT',
                invoiceValue: quote.totalAmount,
                notes: `Converted from Quote ${quote.quoteNumber}. PO: ${body.poNumber}.`,
                quoteReference: quote.id,
                status: 'DRAFT',
                items: {
                    create: quote.items.map((item: any) => ({
                        productId: item.productId,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        isBackorder: false
                    }))
                }
            }
        })

        const updatedQuote = await (tx as any).cRMQuote.update({
            where: { id: quote.id },
            data: {
                status: 'ACCEPTED',
                poNumber: body.poNumber,
                urgency: body.urgency,
                deliveryOrderId: deliveryOrder.id
            },
            include: { deliveryOrder: true }
        })

        await (tx as any).projectTask.create({
            data: {
                projectId: quote.projectId,
                title: `Finalize DO ${doNumber} (Quote ${quote.quoteNumber})`,
                description: 'Verifying automated task creation',
                priority: 'HIGH',
                status: 'TODO',
                assignedToRoleId: accMgrRole!.id,
                createdById: user.id
            }
        })

        return updatedQuote
    })

    console.log(`Success! Quote ${result.quoteNumber} accepted.`)
    console.log(`Linked DO: ${result.deliveryOrder.orderNumber}`)

    // 7. Cleanup
    console.log("Cleaning up...")
    const linkedDO = result.deliveryOrder
    await (prisma as any).deliveryOrderItem.deleteMany({ where: { deliveryOrderId: linkedDO.id } })
    await (prisma as any).deliveryOrder.delete({ where: { id: linkedDO.id } })
    await (prisma as any).projectTask.deleteMany({ where: { title: { contains: quote.quoteNumber } } })
    await (prisma as any).cRMQuoteItem.deleteMany({ where: { quoteId: quote.id } })
    await prisma.cRMQuote.delete({ where: { id: quote.id } })

    console.log("--- Verification Complete ---")
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
