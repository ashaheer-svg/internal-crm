const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    console.log("Starting Messaging verification...")
    
    // 1. Fetch a user to act as sender
    const user = await prisma.user.findFirst({ where: { isActive: true } })
    if (!user) {
        console.error("No active user found to test with.")
        return
    }
    
    console.log(`Using sender: ${user.name} (${user.id})`)

    // 2. Create a test message with new fields
    const testMessage = await prisma.message.create({
        data: {
            subject: "Verification Test Subj",
            content: "Testing script creation",
            category: "TASK",
            priority: "HIGH",
            senderId: user.id,
            customerName: "Verify Corp",
            partnerName: "Verify Partner",
            invoiceNumber: "INV-VERIFY",
            deliveryOrderNumber: "DO-VERIFY"
        }
    })

    console.log("Successfully created message containing new fields. ID:", testMessage.id)

    // 3. Read it back
    const readBack = await prisma.message.findUnique({
        where: { id: testMessage.id }
    })

    console.log("\nRead Back Verification:")
    console.log(`- Customer: ${readBack.customerName}`)
    console.log(`- Partner: ${readBack.partnerName}`)
    console.log(`- Invoice: ${readBack.invoiceNumber}`)
    console.log(`- DO: ${readBack.deliveryOrderNumber}`)

    if (readBack.customerName === "Verify Corp" && readBack.invoiceNumber === "INV-VERIFY") {
        console.log("\n✅ Verification SUCCESS: Database I/O is perfectly sound.")
    } else {
        console.error("\n❌ Verification FAILED: Field mismatch.")
    }

    // 4. Cleanup
    await prisma.message.delete({ where: { id: testMessage.id } })
    console.log("Cleanup complete.")
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
