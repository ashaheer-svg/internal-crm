import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    try {
        const contracts = await prisma.serviceContract.findMany();
        console.log(`Total ServiceContract records: ${contracts.length}`);

        if (contracts.length > 0) {
            console.log('\nSample Contract Statuses:');
            contracts.slice(0, 10).forEach((c) => {
                console.log(`  - ID: ${c.id}, Status: ${c.status}, isDeleted: ${c.isDeleted}`);
            });
        }

        const completedDOs = await prisma.deliveryOrder.count({ where: { status: 'COMPLETED' } });
        console.log(`\nCompleted Delivery Orders: ${completedDOs}`);

        const builtDOs = await prisma.deliveryOrder.count({ where: { status: 'BUILT' } });
        console.log(`Built Delivery Orders (Ready for Shipping): ${builtDOs}`);

    } catch (e) {
        console.error('❌ ERROR:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
