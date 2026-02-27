import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    try {
        const customerCount = await prisma.customer.count();
        const productCount = await prisma.product.count();
        const inventoryCount = await prisma.inventoryItem.count();
        const doCount = await prisma.deliveryOrder.count();
        const contractCount = await prisma.serviceContract.count();

        console.log(`Database Statistics:`);
        console.log(`- Customers: ${customerCount}`);
        console.log(`- Products: ${productCount}`);
        console.log(`- Inventory Items: ${inventoryCount}`);
        console.log(`- Delivery Orders: ${doCount}`);
        console.log(`- Service Contracts: ${contractCount}`);

        if (customerCount > 0) {
            const sample = await prisma.customer.findFirst();
            console.log(`- Sample Customer: ${sample?.name}`);
        }

    } catch (e) {
        console.error('❌ ERROR:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
