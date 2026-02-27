import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';

/**
 * PRODUCTION SYSTEM REPAIR & SYNC UTILITY (EVOLVED)
 * 
 * 1. Schema Sync: Adds missing columns that Prisma might have missed in production.
 * 2. Service Definition Fix: Ensures products in service categories have the correct definition records.
 * 3. Retroactive Contract Activation: Creates missing contracts for COMPLETED delivery orders.
 */

async function main() {
    const isDryRun = process.argv.includes('--dry-run');
    console.log(`\n🚀 Starting ${isDryRun ? '[DRY RUN] ' : ''}System Repair Utility...`);

    const prisma = new PrismaClient();

    try {
        // --- PHASE 1: SCHEMA REPAIR ---
        console.log("\n📦 Phase 1: Schema Integrity Check...");

        const tables = await prisma.$queryRawUnsafe<{ name: string }[]>(`SELECT name FROM sqlite_master WHERE type='table';`);
        const tableNames = tables.map(t => t.name);

        // Check DeliveryOrder table
        if (tableNames.includes('DeliveryOrder')) {
            const columns = await prisma.$queryRawUnsafe<{ name: string }[]>(`PRAGMA table_info(DeliveryOrder);`);
            const columnNames = columns.map(c => c.name);
            if (!columnNames.includes('invoiceNumber')) {
                console.log("  ⚠️  Adding 'invoiceNumber' to DeliveryOrder...");
                if (!isDryRun) await prisma.$executeRawUnsafe(`ALTER TABLE DeliveryOrder ADD COLUMN invoiceNumber TEXT;`);
            } else {
                console.log("  ✅ DeliveryOrder.invoiceNumber exists.");
            }
        }

        // Check ServiceContract table
        if (tableNames.includes('ServiceContract')) {
            const columns = await prisma.$queryRawUnsafe<{ name: string }[]>(`PRAGMA table_info(ServiceContract);`);
            const columnNames = columns.map(c => c.name);

            const checks = [
                { name: 'unitCost', type: 'REAL DEFAULT 0' },
                { name: 'isDeleted', type: 'INTEGER DEFAULT 0' },
                { name: 'durationValue', type: 'INTEGER DEFAULT 1' },
                { name: 'durationUnit', type: "TEXT DEFAULT 'YEAR'" }
            ];

            for (const check of checks) {
                if (!columnNames.includes(check.name)) {
                    console.log(`  ⚠️  Adding '${check.name}' to ServiceContract...`);
                    if (!isDryRun) await prisma.$executeRawUnsafe(`ALTER TABLE ServiceContract ADD COLUMN ${check.name} ${check.type};`);
                } else {
                    console.log(`  ✅ ServiceContract.${check.name} exists.`);
                }
            }
        }

        // --- PHASE 2: PRODUCT DEFINITION FIX ---
        console.log("\n🏷️  Phase 2: Service Definition Sync...");

        // Diagnostic: List all categories and count products
        const stats = await prisma.product.groupBy({
            by: ['category'],
            _count: { _all: true }
        });
        console.log("  Database stats (Categories):", stats.map(s => `${s.category || 'No Category'} (${s._count._all})`).join(', '));

        // Find products that are likely services but missing definitions
        const candidateProducts = await prisma.product.findMany({
            where: {
                OR: [
                    { category: { contains: 'Service' } },
                    { category: { contains: 'Rental' } },
                    { category: { contains: 'Support' } },
                    { category: { contains: 'Maintenance' } },
                    { category: { contains: 'AMC' } },
                    { name: { contains: 'AMC' } },
                    { name: { contains: 'Service' } },
                    { name: { contains: 'Rental' } },
                    { sku: { contains: 'AMC' } },
                    { sku: { contains: 'SRV' } },
                    { description: { contains: 'AMC' } },
                    { description: { contains: 'Service' } }
                ],
                serviceDefinition: null
            },
            select: { id: true, sku: true, name: true, category: true }
        });

        console.log(`  Found ${candidateProducts.length} candidate service products missing definitions.`);
        for (const p of candidateProducts) {
            const isRental = (p.category || '').toLowerCase().includes('rental') || p.name.toLowerCase().includes('rental');
            const type = isRental ? 'RENTAL' : 'AMC';
            console.log(`  ⚠️  Creating ${type} definition for: ${p.sku} (${p.name}) [Cat: ${p.category}]`);
            if (!isDryRun) {
                await prisma.serviceDefinition.create({
                    data: {
                        productId: p.id,
                        type: type
                    }
                });
            }
        }

        // --- PHASE 3: RETROACTIVE ACTIVATION ---
        console.log("\n📜 Phase 3: Retroactive Contract Activation...");

        // Diagnostic: Count orders by status
        const orderStats = await prisma.deliveryOrder.groupBy({
            by: ['status'],
            _count: { _all: true }
        });
        console.log("  Delivery Order Stats:", orderStats.map(s => `${s.status} (${s._count._all})`).join(', '));

        // 1. Get all completed orders with service items
        const orders = await prisma.deliveryOrder.findMany({
            where: { status: 'COMPLETED' },
            include: {
                items: {
                    include: {
                        product: { include: { serviceDefinition: true } }
                    }
                }
            }
        });

        console.log(`  Checking ${orders.length} COMPLETED orders for missing service contracts...`);

        let activatedCount = 0;
        for (const order of orders) {
            for (const item of order.items) {
                // We check AGAINST the broad criteria OR if it already has a definition
                const isServiceProduct = !!item.product?.serviceDefinition ||
                    (item.product?.category || '').toLowerCase().includes('service') ||
                    (item.product?.category || '').toLowerCase().includes('amc') ||
                    item.product?.name.toLowerCase().includes('amc');

                if (isServiceProduct) {
                    // Check if a contract already exists for this order item
                    const existing = await prisma.serviceContract.findFirst({
                        where: {
                            customerId: order.customerId!,
                            productId: item.productId,
                            startDate: item.serviceStartDate,
                            endDate: item.serviceEndDate
                        }
                    });

                    if (!existing) {
                        console.log(`  🚀  Activating missing contract for DO ${order.orderNumber}: ${item.product.sku}`);
                        activatedCount++;
                        if (!isDryRun) {
                            // Ensure the product has a definition first if it was missing
                            if (!item.product.serviceDefinition) {
                                await prisma.serviceDefinition.create({
                                    data: {
                                        productId: item.productId,
                                        type: (item.product.category || '').toLowerCase().includes('rental') ? 'RENTAL' : 'AMC'
                                    }
                                });
                            }

                            const { activateServiceContract } = await import('./lib/service-manager');
                            await activateServiceContract({
                                customerId: order.customerId!,
                                productId: item.productId,
                                startDate: item.serviceStartDate || order.updatedAt,
                                description: `Retroactively fulfilled via system repair (DO ${order.orderNumber})`,
                                contractValue: item.unitPrice,
                                invoiceReference: (order as any).invoiceNumber || order.orderNumber,
                                salesRepId: order.salesRepId || undefined
                            });
                        }
                    }
                }
            }
        }
        console.log(`  Finished. Activated ${activatedCount} skipped contracts.`);

    } catch (error: any) {
        console.error("\n❌ ERROR DURING REPAIR:", error.message);
        if (error.stack) console.error(error.stack);
    } finally {
        await prisma.$disconnect();
        console.log("\nCleanup complete.");
    }
}

main();
