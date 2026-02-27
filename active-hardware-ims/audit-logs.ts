import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    try {
        const importLogs = await prisma.transactionLog.findMany({
            where: {
                type: { in: ['IMPORT_HISTORY', 'LEGACY_IMPORT'] }
            },
            take: 100,
            orderBy: { createdAt: 'desc' }
        });

        console.log(`Historical Import Logs Found: ${importLogs.length}`);

        if (importLogs.length > 0) {
            const notes = importLogs.map(l => l.notes || '').join('\n');
            const hasService = notes.toLowerCase().includes('service') || notes.toLowerCase().includes('amc') || notes.toLowerCase().includes('support');
            console.log(`Keywords "service/amc/support" found in notes: ${hasService}`);

            console.log('\nRecent Import Samples:');
            importLogs.slice(0, 5).forEach(log => {
                console.log(`- ${log.createdAt.toISOString()}: ${log.notes}`);
            });
        }

    } catch (e) {
        console.error('❌ ERROR:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
