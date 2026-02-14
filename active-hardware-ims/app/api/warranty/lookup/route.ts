import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const serial = searchParams.get('serial');

    // Log lookup attempt before validation
    logger.info(`Attempting warranty lookup for serial: ${serial || 'N/A'}`);

    if (!serial) {
        logger.warn('Warranty lookup failed: Serial number is required');
        return NextResponse.json({ error: 'Serial number is required' }, { status: 400 });
    }

    try {
        // 1. Find the Inventory Item
        const item = await prisma.inventoryItem.findUnique({
            where: { serialNumber: serial },
            include: {
                product: true,
                location: true
            }
        });

        if (!item) {
            return NextResponse.json({ error: 'Serial number not found' }, { status: 404 });
        }

        console.log("Found item:", item.id);

        // 2. Find associated Transaction Logs
        const transactionLogs = await prisma.transactionLog.findMany({
            where: {
                OR: [
                    { serialNumber: serial },
                    { referenceId: item.id }
                ]
            },
            orderBy: { createdAt: 'desc' }
        });

        // 3. Find associated Audit Logs (WARRANTY and INVENTORY events)
        const auditLogs = await prisma.auditLog.findMany({
            where: {
                OR: [
                    // Warranty claims for this item
                    {
                        entityType: 'WARRANTY',
                        metadata: { contains: serial }
                    },
                    // Inventory changes for this specific item
                    {
                        entityType: 'INVENTORY',
                        entityId: item.id
                    }
                ]
            },
            orderBy: { createdAt: 'desc' }
        });

        // 4. Combine and format all events
        const transactionHistory = transactionLogs.map(log => ({
            id: log.id,
            type: log.type,
            date: log.createdAt,
            notes: log.notes,
            performedBy: log.performedBy,
            source: 'transaction'
        }));

        const auditHistory = auditLogs.map(log => {
            // Parse metadata if it exists
            let metadata: any = {};
            try {
                if (log.metadata) {
                    metadata = JSON.parse(log.metadata);
                }
            } catch (e) {
                console.error('Failed to parse audit log metadata:', e);
            }

            // Parse changes if they exist
            let changes: any = {};
            try {
                if (log.changes) {
                    changes = JSON.parse(log.changes);
                }
            } catch (e) {
                console.error('Failed to parse audit log changes:', e);
            }

            // Format the event description based on entity type and action
            let description = '';
            if (log.entityType === 'WARRANTY') {
                if (log.action === 'CREATE') {
                    description = `Warranty claim created: ${metadata.description || 'No description'}`;
                } else if (log.action === 'UPDATE') {
                    description = `Warranty claim updated`;
                }
            } else if (log.entityType === 'INVENTORY') {
                if (log.action === 'UPDATE' && changes.after?.status) {
                    description = `Status changed from ${changes.before?.status || 'N/A'} to ${changes.after?.status}`;
                    if (changes.after?.reason) {
                        description += ` - ${changes.after.reason}`;
                    }
                }
            }

            return {
                id: log.id,
                type: `${log.entityType}_${log.action}`,
                date: log.createdAt,
                notes: description || `${log.entityType} ${log.action}`,
                performedBy: log.userName,
                source: 'audit',
                metadata,
                changes
            };
        });

        // Combine and sort all events by date (newest first)
        const allHistory = [...transactionHistory, ...auditHistory]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        console.log("Total history events:", allHistory.length);

        const result = {
            item: {
                id: item.id,
                serialNumber: item.serialNumber,
                status: item.status,
                warrantyExpiry: item.warrantyExpiry,
                product: {
                    sku: item.product.sku,
                    name: item.product.name,
                    brand: item.product.brand,
                    model: item.product.model,
                    warrantyMonths: item.product.warrantyMonths
                }
            },
            history: allHistory
        };

        return NextResponse.json(result);

    } catch (error: any) {
        console.error("Warranty lookup error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
