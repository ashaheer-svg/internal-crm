// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const tables = await prisma.$queryRawUnsafe("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
    console.log("=== TABLES IN DB ===");
    tables.forEach(t => console.log(t.name));

    // Check if ServiceContract table exists
    const hasContract = tables.some(t => t.name === 'ServiceContract');
    console.log("\n=== ServiceContract exists:", hasContract);

    // Check migration table
    const migrations = await prisma.$queryRawUnsafe("SELECT migration_name FROM _prisma_migrations ORDER BY started_at");
    console.log("\n=== APPLIED MIGRATIONS ===");
    migrations.forEach(m => console.log(m.migration_name));
}

main().catch(console.error).finally(() => prisma.$disconnect());
