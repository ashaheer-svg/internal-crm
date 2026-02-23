import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log("--- Quote to DO Workflow Test ---")

    // 1. Get an existing user
    const user = await prisma.user.findFirst({ where: { isActive: true } })
    if (!user) {
        console.error("No active user found.")
        return
    }

    // 2. Ensure an ACC-MGR role exists
    let accMgrRole = await prisma.role.findFirst({ where: { name: 'ACC-MGR' } })
    if (!accMgrRole) {
        console.log("Creating ACC-MGR role...")
        accMgrRole = await prisma.role.create({
            data: {
                name: 'ACC-MGR',
                description: 'Account Manager',
                // isActive: true // not in schema
            }
        })
    }

    // Ensure at least one user has this role
    let accMgrUser = await prisma.user.findFirst({ where: { roleId: accMgrRole.id, isActive: true } })
    if (!accMgrUser) {
        console.log("Creating dummy ACC-MGR user...")
        accMgrUser = await prisma.user.create({
            data: {
                email: 'accmgr_test@example.com',
                name: 'Test Account Manager',
                password: 'dummy',
                roleId: accMgrRole.id,
                isActive: true
            }
        })
    }

    // 3. Create a dummy Project and Customer
    let customer = await prisma.customer.findFirst()
    if (!customer) {
        customer = await prisma.customer.create({
            data: { name: 'Test Customer for Quote-DO', email: 'test@customer.com' }
        })
    }

    const project = await prisma.cRMProject.findFirst()
    if (!project) {
        console.error("No active CRM Project found in the database. Please create one manually first or adjust test script.")
        process.exit(1)
    }

    // 4. Create a Pending Quote
    const quote = await prisma.cRMQuote.create({
        data: {
            quoteNumber: `QT-TEST-${Date.now()}`,
            projectId: project.id,
            status: 'DRAFT',
            subTotal: 1000,
            taxAmount: 0,
            totalAmount: 1000,
            version: 1,
            createdById: user.id
        }
    })

    console.log(`Created Quote: ${quote.quoteNumber}`)

    // 5. Simulate API approval logic directly
    console.log("Simulating Approval (Updating Quote)...")
    const updatedQuote = await (prisma as any).cRMQuote.update({
        where: { id: quote.id },
        data: {
            status: 'ACCEPTED',
            poNumber: 'PO-TEST-1234',
            urgency: 'URGENT',
            expectedDeliveryDate: new Date()
        }
    })
    console.log(`Quote Status: ${updatedQuote.status} | PO: ${updatedQuote.poNumber} | Urgency: ${updatedQuote.urgency}`)

    // 6. Simulate Task Creation Logic
    console.log("Simulating Task creation for ACC-MGR...")
    let description = `Quote ${quote.quoteNumber} has been approved.\n\n`
    description += `PO Number: PO-TEST-1234\n`
    description += `Requested Delivery: ${new Date().toISOString()}\n`
    description += `\nPlease process this into a Delivery Order.`

    const task = await (prisma as any).projectTask.create({
        data: {
            projectId: quote.projectId,
            title: `Process DO for Quote ${quote.quoteNumber}`,
            description,
            priority: 'URGENT',
            status: 'TODO',
            assignedToRoleId: accMgrRole.id,
            createdById: user.id
        }
    })

    console.log(`Successfully created Task: ${task.title} assigned to role ID: ${task.assignedToRoleId}`)

    // 7. Test Message Creation Logic (Bonus)
    const usersInRole = await prisma.user.findMany({ where: { roleId: accMgrRole.id, isActive: true } })
    if (usersInRole.length > 0) {
        const message = await (prisma as any).message.create({
            data: {
                subject: `DO Required: Quote ${quote.quoteNumber} Approved`,
                content: description,
                category: 'TASK',
                priority: 'URGENT',
                senderId: user.id,
                recipientRoleId: accMgrRole.id,
                receipts: {
                    createMany: {
                        data: usersInRole.map(u => ({ userId: u.id }))
                    }
                }
            }
        })
        console.log(`Successfully created Message ID: ${message.id} for ${usersInRole.length} ACC-MGR users.`)
    }

    console.log("--- Test Complete ---")

    // Cleanup test data
    await (prisma as any).message.deleteMany({ where: { subject: { startsWith: 'DO Required: Quote QT-TEST-' } } })
    await (prisma as any).projectTask.delete({ where: { id: task.id } })
    await prisma.cRMQuote.delete({ where: { id: quote.id } })
    if (accMgrUser.email === 'accmgr_test@example.com') {
        await prisma.user.delete({ where: { id: accMgrUser.id } })
    }
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
