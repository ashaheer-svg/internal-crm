import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    console.log('--- Verifying Recent Workflow Notifications ---');

    const messages = await prisma.message.findMany({
        where: { isSystemGenerated: true },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
            recipientRole: true,
            receipts: {
                include: { user: { select: { name: true } } }
            }
        }
    });

    if (messages.length === 0) {
        console.log('No system messages found. (This is expected if no status changes were triggered yet)');
    }

    messages.forEach(m => {
        console.log(`\n[${m.createdAt.toISOString()}] Subject: ${m.subject}`);
        console.log(`Role: ${m.recipientRole?.name || 'N/A'}`);
        console.log(`Content:\n${m.content}`);
        console.log(`Receipts created for: ${m.receipts.map(r => r.user.name).join(', ')}`);
    });
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
