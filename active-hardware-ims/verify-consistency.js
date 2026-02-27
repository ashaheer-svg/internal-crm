const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function run() {
    console.log("=== Comprehensive Database Consistency Check ===\n");

    // 1. Identify Database
    // We'll check the typical locations
    const possiblePaths = [
        path.join(process.cwd(), 'prisma', 'prod.db'),
        path.join(process.cwd(), 'prod.db'),
        path.join(process.cwd(), 'prisma', 'dev.db')
    ];

    let dbPath = null;
    for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
            dbPath = p;
            break;
        }
    }

    if (!dbPath) {
        console.error("❌ Error: Could not find a database file (prod.db or dev.db).");
        console.log("Please run this script from the project root.");
        process.exit(1);
    }

    console.log(`Target Database: ${dbPath}`);
    console.log(`Schema File: prisma/schema.prisma\n`);

    console.log("Analyzing schema differences... (this may take a few seconds)");

    try {
        // We use prisma migrate diff to compare the actual DB with the schema.prisma
        // Output in SQL script format
        const cmd = `npx prisma migrate diff --from-url file:${dbPath} --to-schema-datamodel prisma/schema.prisma --script`;

        const diffSql = execSync(cmd, { stdio: ['ignore', 'pipe', 'inherit'] }).toString();

        // Check if the diff is empty (Prisma usually returns a comment if empty)
        const isEmpty = diffSql.trim().split('\n').every(line => line.trim().startsWith('--') || line.trim() === '');

        if (isEmpty) {
            console.log("✅ SUCCESS: The database is perfectly consistent with the Prisma schema.");
        } else {
            console.log("⚠️  INCONSISTENT: Differences found between database and schema.");
            console.log("------------------------------------------------------------");

            // Extract some human-readable info from the SQL
            const tablesCreated = (diffSql.match(/CREATE TABLE "([^"]+)"/g) || []).map(m => m.match(/"([^"]+)"/)[1]);
            const columnsAdded = (diffSql.match(/ALTER TABLE "([^"]+)" ADD COLUMN/g) || []).map(m => m.match(/"([^"]+)"/)[1]);

            if (tablesCreated.length > 0) {
                console.log(`Missing Tables: ${[...new Set(tablesCreated)].join(', ')}`);
            }
            if (columnsAdded.length > 0) {
                console.log(`Missing Columns in: ${[...new Set(columnsAdded)].join(', ')}`);
            }

            const fixFileName = 'fix-database-schema.sql';
            fs.writeFileSync(fixFileName, diffSql);

            console.log("------------------------------------------------------------");
            console.log(`\nGenerated repair script: ${fixFileName}`);
            console.log(`\nTo fix these issues, you can run:`);
            console.log(`npx prisma db push`);
            console.log(`\nOR if db push fails, run the generated SQL manually against your database.`);
        }

    } catch (e) {
        console.error("\n❌ Error running consistency check:");
        console.error(e.message);
    }
}

run();
