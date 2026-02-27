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

    console.log('Checking ServiceContract table structure...');
    const tableInfo = db.prepare("PRAGMA table_info(ServiceContract)").all();

    if (tableInfo.length === 0) {
        console.error('❌ Error: ServiceContract table DOES NOT EXIST in the database!');
    } else {
        console.log('\nServiceContract table columns:');
        tableInfo.forEach(col => {
            const isMatch = col.name === 'unitCost';
            console.log(`  - ${col.name} (${col.type}) ${isMatch ? '✅ MATCH' : ''}`);
        });

        const hasUnitCost = tableInfo.some(col => col.name === 'unitCost');
        if (hasUnitCost) {
            console.log('\n✅ SUCCESS: ServiceContract.unitCost exists in the database.');
        } else {
            console.log('\n❌ FAILURE: ServiceContract.unitCost is MISSING from the database.');
        }
    }

    db.close();
} catch (error) {
    console.error('❌ ERROR:', error.message);
}
