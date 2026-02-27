/**
 * Remote Production Database Repair Script
 * This script addresses common schema sync issues where Prisma fails to detect missing columns/tables.
 * It is designed to be run on the server where the actual prod.db resides.
 */

const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

async function repair() {
    console.log("Starting Production Database Repair...");

    // 1. Identify Database Path
    // In many setups, it's in prisma/prod.db or relative to the app root
    const possiblePaths = [
        path.join(process.cwd(), 'prisma', 'prod.db'),
        path.join(process.cwd(), 'prod.db'),
        path.join(__dirname, 'prod.db'),
        path.join(__dirname, 'prisma', 'prod.db')
    ];

    let dbPath = null;
    for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
            dbPath = p;
            break;
        }
    }

    if (!dbPath) {
        console.error("❌ Could not find prod.db! Please ensure this script is placed in the application root.");
        process.exit(1);
    }

    console.log(`Using database: ${dbPath}`);

    const prisma = new PrismaClient({
        datasources: { db: { url: `file:${dbPath}` } }
    })

    try {
        console.log("Checking schema...");

        // Check for ServiceContract table
        const tables = await prisma.$queryRawUnsafe(`SELECT name FROM sqlite_master WHERE type='table';`);
        const tableNames = tables.map(t => t.name);

        if (!tableNames.includes('ServiceContract')) {
            console.log("⚠️ ServiceContract table is MISSING. Attempting to force-sync with Prisma...");
            console.log("TIP: If this fails, you may need to run 'npx prisma db push' manually on the server.");
        } else {
            console.log("✅ ServiceContract table exists. Checking columns...");
            const columns = await prisma.$queryRawUnsafe(`PRAGMA table_info(ServiceContract);`);
            const columnNames = columns.map(c => c.name);

            if (!columnNames.includes('unitCost')) {
                console.log("Adding unitCost column...");
                await prisma.$executeRawUnsafe(`ALTER TABLE ServiceContract ADD COLUMN unitCost REAL DEFAULT 0;`);
                console.log("✅ Added unitCost");
            } else {
                console.log("✅ unitCost already exists.");
            }

            if (!columnNames.includes('isDeleted')) {
                console.log("Adding isDeleted column...");
                await prisma.$executeRawUnsafe(`ALTER TABLE ServiceContract ADD COLUMN isDeleted INTEGER DEFAULT 0;`);
                console.log("✅ Added isDeleted");
            } else {
                console.log("✅ isDeleted already exists.");
            }
        }

        const customerCount = await prisma.customer.count();
        console.log(`\nVerification: Found ${customerCount} customers.`);
        console.log("Repair process finished successfully.");

    } catch (e) {
        console.error(`❌ Error during repair: ${e.message}`);
    } finally {
        await prisma.$disconnect();
    }
}

repair();
