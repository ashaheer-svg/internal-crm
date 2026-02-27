const sqlite3 = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'prisma', 'prod.db');
console.log('Checking database at:', dbPath);

if (!fs.existsSync(dbPath)) {
    console.error('❌ Error: prod.db not found!');
    process.exit(1);
}

try {
    const db = sqlite3(dbPath, { readonly: true });

    console.log('Checking ServiceContract table...');
    const contracts = db.prepare("SELECT * FROM ServiceContract").all();
    console.log(`Total ServiceContract records: ${contracts.length}`);

    if (contracts.length > 0) {
        console.log('\nSample Contract Statuses:');
        contracts.forEach((c, i) => {
            if (i < 10) {
                console.log(`  - ID: ${c.id}, Customer: ${c.customerId}, Status: ${c.status}, isDeleted: ${c.isDeleted}`);
            }
        });

        const activeCount = contracts.filter(c => c.status === 'ACTIVE' && (c.isDeleted === 0 || c.isDeleted === false)).length;
        console.log(`\nActive Contracts (Status=ACTIVE, isDeleted=false): ${activeCount}`);
    }

    const completedDOs = db.prepare("SELECT COUNT(*) as count FROM DeliveryOrder WHERE status = 'COMPLETED'").get();
    console.log(`\nCompleted Delivery Orders: ${completedDOs.count}`);

    const builtDOs = db.prepare("SELECT COUNT(*) as count FROM DeliveryOrder WHERE status = 'BUILT'").get();
    console.log(`Built Delivery Orders (Ready for Shipping): ${builtDOs.count}`);

    db.close();
} catch (error) {
    console.error('❌ ERROR:', error.message);
}
