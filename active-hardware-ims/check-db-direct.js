// Simple direct check without Prisma
const sqlite3 = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'prisma', 'dev.db');
console.log('Checking database at:', dbPath);
console.log('File exists:', require('fs').existsSync(dbPath));

try {
    const db = sqlite3(dbPath, { readonly: true });

    // Check if accessCount column exists
    const tableInfo = db.prepare("PRAGMA table_info(Product)").all();
    const hasAccessCount = tableInfo.some(col => col.name === 'accessCount');

    console.log('\n✅ Database opened successfully!');
    console.log(`\naccessCount column exists: ${hasAccessCount ? '✅ YES' : '❌ NO'}`);

    if (hasAccessCount) {
        console.log('\n✅ prod.db schema is CONSISTENT with Prisma schema');
    } else {
        console.log('\n❌ prod.db schema is MISSING accessCount column');
    }

    // Show all Product columns
    console.log('\nProduct table columns:');
    tableInfo.forEach(col => console.log(`  - ${col.name} (${col.type})`));

    // Get counts
    const userCount = db.prepare("SELECT COUNT(*) as count FROM User").get();
    const productCount = db.prepare("SELECT COUNT(*) as count FROM Product").get();
    const inventoryCount = db.prepare("SELECT COUNT(*) as count FROM InventoryItem").get();

    console.log('\nDatabase Statistics:');
    console.log(`  - Users: ${userCount.count}`);
    console.log(`  - Products: ${productCount.count}`);
    console.log(`  - Inventory Items: ${inventoryCount.count}`);

    db.close();
} catch (error) {
    console.error('❌ ERROR:', error.message);
}
