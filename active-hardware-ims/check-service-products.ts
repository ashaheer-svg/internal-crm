import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    try {
        const serviceProducts = await prisma.product.findMany({
            where: {
                serviceDefinition: { isNot: null }
            },
            include: {
                serviceDefinition: true
            }
        });

        console.log(`Products with Service Definitions (${serviceProducts.length}):`);
        serviceProducts.forEach(p => {
            console.log(`- ${p.sku}: ${p.name} (Type: ${p.serviceDefinition?.type})`);
        });

    } catch (e) {
        console.error('❌ ERROR:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
