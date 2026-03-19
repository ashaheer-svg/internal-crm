import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET() {
    const diagnostic: any = {
        nodeEnv: process.env.NODE_ENV,
        cwd: process.cwd(),
        envUrl: process.env.DATABASE_URL,
        timestamp: new Date().toISOString()
    };

    try {
        await requireAuth()
        // 1. Check Tables
        const tables: any = await prisma.$queryRawUnsafe(`SELECT name FROM sqlite_master WHERE type='table';`);
        diagnostic.tables = tables.map((t: any) => t.name);

        // 2. Check ServiceContract Columns
        if (diagnostic.tables.includes('ServiceContract')) {
            const columns: any = await prisma.$queryRawUnsafe(`PRAGMA table_info(ServiceContract);`);
            const names = columns.map((c: any) => c.name);
            diagnostic.serviceContractColumns = names;
            diagnostic.hasUnitCost = names.includes('unitCost');
            diagnostic.hasIsDeleted = names.includes('isDeleted');
        } else {
            diagnostic.serviceContractColumns = "TABLE MISSING";
        }

        // 3. Check Record Counts
        try {
            diagnostic.counts = {
                customers: await prisma.customer.count(),
                products: await prisma.product.count(),
            };
            if (diagnostic.tables.includes('ServiceContract')) {
                diagnostic.counts.serviceContracts = await prisma.serviceContract.count();
            }
        } catch (e: any) {
            diagnostic.countsError = e.message;
        }

        diagnostic.status = "success";
    } catch (error: any) {
        diagnostic.status = "error";
        diagnostic.message = error.message;
    }

    return NextResponse.json(diagnostic);
}
