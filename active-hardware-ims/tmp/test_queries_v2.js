const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testAPIs() {
    try {
        console.log('Testing Product.findMany with serviceDefinition filter...');
        const type = 'product';
        const includeInactive = false;
        const search = '';

        const where = {
            AND: [
                !includeInactive ? { isActive: true } : {},
                type === 'product' ? { serviceDefinition: null } : (type === 'service' ? { serviceDefinition: { isNot: null } } : {}),
                search ? {
                    OR: [
                        { sku: { contains: search } },
                        { name: { contains: search } }
                    ]
                } : {}
            ]
        };

        const products = await prisma.product.findMany({
            where,
            take: 20
        });
        console.log('Product Filter Success, count:', products.length);

    } catch (e) {
        console.error('Error during test:', e);
    } finally {
        await prisma.$disconnect();
    }
}

testAPIs();
