import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    try {
        const amcProducts = await prisma.product.findMany({
            where: {
                OR: [
                    { name: { contains: 'AMC' } },
                    { sku: { contains: 'AMC' } },
                    { description: { contains: 'AMC' } }
                ]
            },
            include: {
                serviceDefinition: true
            }
        });

        console.log(`Products matching "AMC" (${amcProducts.length}):`);
        amcProducts.forEach(p => {
            console.log(`- ${p.sku}: ${p.name} (Service: ${!!p.serviceDefinition})`);
        });

    } catch (e) {
        console.error('❌ ERROR:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
