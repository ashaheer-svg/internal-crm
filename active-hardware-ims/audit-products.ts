import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    try {
        const products = await prisma.product.findMany({
            select: {
                sku: true,
                name: true,
                category: true,
                model: true
            }
        });

        console.log(`Product Audit List (${products.length} items):`);
        products.forEach(p => {
            console.log(`- [${p.category}] ${p.sku}: ${p.name} ${p.model}`);
        });

    } catch (e) {
        console.error('❌ ERROR:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
