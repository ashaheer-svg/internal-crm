import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('--- DIAGNOSTIC: MESSAGING MODELS ---')
    try {
        const messageCount = await prisma.message.count()
        console.log('Message count:', messageCount)

        const receiptCount = await prisma.messageReceipt.count()
        console.log('Receipt count:', receiptCount)

        const attachmentCount = await prisma.messageAttachment.count()
        console.log('Attachment count:', attachmentCount)

        console.log('SUCCESS: All messaging models are accessible.')
    } catch (err: any) {
        console.error('FAILURE: Error accessing messaging models:', err.message)
        if (err.message.includes('not exist')) {
            console.log('TIP: Try running prisma generate again or check if the client is updated.')
        }
    } finally {
        await prisma.$disconnect()
    }
}

main()
