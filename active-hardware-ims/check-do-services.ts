import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    try {
        const orders = await prisma.deliveryOrder.findMany({
            include: {
                items: {
                    include: {
                        product: { include: { serviceDefinition: true } }
                    }
                }
            }
        });

        console.log(`Summary of Delivery Orders (${orders.length}):`);
        orders.forEach(o => {
            const serviceItems = o.items.filter(i => !!i.product?.serviceDefinition);
            const hardwareItems = o.items.filter(i => !i.product?.serviceDefinition);
            console.log(`- ${o.orderNumber}: [${o.status}] Services: ${serviceItems.length}, Hardware: ${hardwareItems.length}`);

            if (serviceItems.length > 0) {
                serviceItems.forEach(si => {
                    console.log(`    * Service: ${si.product.name}, Fulfilled: ${!!(si as any).serviceStartDate}`);
                });
            }
        });

        const contracts = await prisma.serviceContract.count();
        console.log(`\nExisting Service Contracts: ${contracts}`);

    } catch (e) {
        console.error('❌ ERROR:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
