import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

async function checkDb(dbPath) {
    const fullPath = path.resolve(dbPath);
    if (!fs.existsSync(fullPath)) return null;

    console.log(`\n--- Checking: ${fullPath} ---`);
    const prisma = new PrismaClient({
        datasources: { db: { url: `file:${fullPath}` } }
    });

    try {
        const contracts = await prisma.serviceContract.count();
        const orders = await prisma.deliveryOrder.findMany({
            orderBy: { updatedAt: 'desc' },
            take: 1
        });
        const productDefs = await prisma.serviceDefinition.count();

        console.log(`Contracts: ${contracts}`);
        console.log(`Service Definitions: ${productDefs}`);
        if (orders.length > 0) {
            console.log(`Latest DO: ${orders[0].orderNumber}, Status: ${orders[0].status}, Date: ${orders[0].updatedAt}`);
        } else {
            console.log("No Delivery Orders found.");
        }
        return { contracts, productDefs, latestOrder: orders[0] };
    } catch (e) {
        console.log(`Error reading DB: ${e.message}`);
        return null;
    } finally {
        await prisma.$disconnect();
    }
}

async function main() {
    const dbs = [
        'prisma/prod.db',
        'prisma/prisma/prod.db',
        'prisma/prisma/prisma/prod.db',
        'prisma/dev.db'
    ];

    for (const db of dbs) {
        await checkDb(db);
    }
}

main();
