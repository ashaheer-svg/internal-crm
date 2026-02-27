import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    try {
        console.log("--- Recent Delivery Orders ---");
        const orders = await prisma.deliveryOrder.findMany({
            orderBy: { updatedAt: 'desc' },
            take: 5,
            include: {
                items: {
                    include: {
                        product: {
                            include: { serviceDefinition: true }
                        }
                    }
                }
            }
        });

        orders.forEach(o => {
            console.log(`Order: ${o.orderNumber}, Status: ${o.status}, Updated: ${o.updatedAt}`);
            o.items.forEach(item => {
                const serviceInfo = item.product?.serviceDefinition ? `[SERVICE: ${item.product.serviceDefinition.type}]` : '[HARDWARE]';
                console.log(`  - ${item.product.sku}: ${item.product.name} ${serviceInfo}, Dates: ${item.serviceStartDate} - ${item.serviceEndDate}`);
            });
        });

        console.log("\n--- Service Products (ServiceDefinition) ---");
        const defs = await prisma.serviceDefinition.findMany({
            include: { product: true }
        });
        console.log(`Total Service Definitions: ${defs.length}`);
        defs.forEach(d => {
            console.log(`- Product: ${d.product.sku} (${d.product.name}), Type: ${d.type}`);
        });

        console.log("\n--- Service Contracts ---");
        const contracts = await prisma.serviceContract.count();
        console.log(`Total Service Contracts: ${contracts}`);

    } catch (e) {
        console.error('❌ ERROR:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
