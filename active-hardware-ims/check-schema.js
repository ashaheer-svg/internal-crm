// Check if dev.db schema matches Prisma schema (dev.db was restored from prod.db)
const { PrismaClient } = require('@prisma/client');

async function checkSchema() {
    // Check dev.db (which was restored from prod.db)
    process.env.DATABASE_URL = 'file:./prisma/dev.db';

    const prisma = new PrismaClient();

    try {
        console.log('Checking prod.db schema...\n');

        // Try to query Product table with accessCount
        const product = await prisma.product.findFirst({
            select: {
                id: true,
                sku: true,
                name: true,
                accessCount: true  // This will fail if column doesn't exist
            }
        });

        console.log('✅ SUCCESS: prod.db has accessCount column');
        console.log('Sample product:', product ? {
            sku: product.sku,
            name: product.name,
            accessCount: product.accessCount
        } : 'No products found');

        // Get counts
        const counts = await Promise.all([
            prisma.user.count(),
            prisma.product.count(),
            prisma.inventoryItem.count(),
            prisma.customer.count()
        ]);

        console.log('\nDatabase Statistics:');
        console.log(`- Users: ${counts[0]}`);
        console.log(`- Products: ${counts[1]}`);
        console.log(`- Inventory Items: ${counts[2]}`);
        console.log(`- Customers: ${counts[3]}`);

        // Check inventory statuses
        const statuses = await prisma.$queryRaw`
            SELECT status, COUNT(*) as count 
            FROM InventoryItem 
            GROUP BY status
        `;
        console.log('\nInventory by Status:');
        statuses.forEach(s => console.log(`- ${s.status}: ${s.count}`));

    } catch (error) {
        console.error('❌ ERROR:', error.message);

        if (error.message.includes('accessCount')) {
            console.log('\n⚠️  prod.db is MISSING the accessCount column');
            console.log('You need to run the update script on production server');
        }
    } finally {
        await prisma.$disconnect();
    }
}

checkSchema();
