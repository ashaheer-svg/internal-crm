const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testAPIs() {
    try {
        console.log('Testing GoodsReceiptNote.findMany...');
        const grns = await prisma.goodsReceiptNote.findMany({
            include: { items: true },
            take: 5
        });
        console.log('GRN Success, count:', grns.length);

        console.log('Testing Product.findMany...');
        // Match the query in /api/products precisely
        const products = await prisma.product.findMany({
            where: { isActive: true },
            take: 20,
            skip: 0,
            orderBy: [{ createdAt: 'desc' }],
            include: {
                serviceDefinition: true,
                _count: {
                    select: {
                        inventory: {
                            where: { status: "AVAILABLE" }
                        }
                    }
                },
                inventory: {
                    where: { status: "AVAILABLE" },
                    select: {
                        id: true,
                        serialNumber: true,
                        status: true,
                        locationId: true
                    }
                }
            }
        });
        console.log('Product Success, count:', products.length);
        if (products.length > 0) {
            console.log('Sample Product _count:', JSON.stringify(products[0]._count));
        }
    } catch (e) {
        console.error('Error during test:', e);
    } finally {
        await prisma.$disconnect();
    }
}

testAPIs();
