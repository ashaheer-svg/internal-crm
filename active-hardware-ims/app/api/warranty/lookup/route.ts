import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/auth';
import { logger } from '@/lib/logger';

export async function GET(request: Request) {
    try {
        await requirePermission('general_lookup:read');
        const { searchParams } = new URL(request.url);
        const serial = searchParams.get('serial');

        // Log lookup attempt before validation
        logger.info(`Attempting warranty lookup for serial: ${serial || 'N/A'}`);

        if (!serial) {
            logger.warn('Warranty lookup failed: Serial number is required');
            return NextResponse.json({ error: 'Serial number is required' }, { status: 400 });
        }

        // 1. Find the Inventory Item(s) using partial matching
        const items = await prisma.inventoryItem.findMany({
            where: {
                serialNumber: {
                    contains: serial
                }
            },
            include: {
                product: true,
                location: true,
                deliveryOrderItem: {
                    include: {
                        deliveryOrder: {
                            include: {
                                customer: true,
                                endCustomer: true
                            }
                        }
                    }
                }
            },
            take: 10 // Limit results for selection
        });

        // 1b. Find AMC Contracts that cover this serial (for goods not in our inventory item table)
        const amcContracts = await prisma.serviceContract.findMany({
            where: {
                coveredSerials: {
                    contains: serial
                }
            },
            include: {
                customer: true,
                product: true,
                partner: true
            },
            take: 5
        });

        if (items.length === 0 && amcContracts.length === 0) {
            return NextResponse.json({ error: 'Serial number not found in Inventory or AMC records' }, { status: 404 });
        }

        // Handle candidates if multiple matches (combining items and AMC)
        if (items.length + amcContracts.length > 1) {
            const exactItemMatch = items.find(i => i.serialNumber.toLowerCase() === serial.toLowerCase());
            const exactAmcMatch = amcContracts.find(c => c.coveredSerials?.toLowerCase().includes(serial.toLowerCase()));

            // If we don't have a singular exact match, show candidates
            if (!exactItemMatch && !exactAmcMatch) {
                const itemCandidates = items.map(i => {
                    const doInfo = i.deliveryOrderItem?.deliveryOrder;
                    return {
                        id: i.id,
                        serialNumber: i.serialNumber,
                        type: 'INVENTORY',
                        status: i.status,
                        location: i.location.name,
                        partner: doInfo?.customer?.name || doInfo?.customerName || 'N/A',
                        endCustomer: doInfo?.endCustomer?.name || doInfo?.endCustomerName || null,
                        deliveryOrder: {
                            number: doInfo?.orderNumber || null,
                            date: doInfo?.createdAt || null,
                            invoiceNumber: doInfo?.invoiceNumber || null
                        },
                        product: {
                            sku: i.product.sku,
                            name: i.product.name,
                            brand: i.product.brand,
                            model: i.product.model
                        }
                    };
                });

                const amcCandidates = amcContracts.map(c => ({
                    id: c.id,
                    serialNumber: c.coveredSerials || 'N/A',
                    type: 'AMC_ONLY',
                    status: c.status,
                    location: 'Client Site',
                    partner: c.partner?.name || 'N/A',
                    endCustomer: c.customer.name,
                    deliveryOrder: {
                        number: c.contractNumber,
                        date: c.createdAt,
                        invoiceNumber: c.invoiceReference
                    },
                    product: {
                        sku: c.product.sku,
                        name: c.product.name,
                        brand: c.product.brand,
                        model: c.productModel || c.product.model
                    }
                }));

                return NextResponse.json({ candidates: [...itemCandidates, ...amcCandidates] });
            }
        }

        let item = items[0];
        let amcRecord = amcContracts[0];
        const exactSerial = item?.serialNumber || serial; // Use the found serial or the provided one

        // 2. Find associated Transaction Logs
        const transactionLogs = item ? await prisma.transactionLog.findMany({
            where: {
                OR: [
                    { serialNumber: exactSerial },
                    { referenceId: item.id }
                ]
            },
            orderBy: { createdAt: 'desc' }
        }) : [];

        // 3. Find associated Audit Logs
        const auditLogs = await prisma.auditLog.findMany({
            where: {
                OR: [
                    { entityType: 'WARRANTY', metadata: { contains: exactSerial } },
                    item ? { entityType: 'INVENTORY', entityId: item.id } : {},
                    { entityType: 'SERVICE_CONTRACT', metadata: { contains: exactSerial } }
                ].filter(condition => Object.keys(condition).length > 0)
            },
            orderBy: { createdAt: 'desc' }
        });

        // 4. Find all AMC/Service Contracts for this serial
        const allRelatedAMCs = await prisma.serviceContract.findMany({
            where: {
                OR: [
                    item ? { rentalAssets: { some: { id: item.id } } } : {},
                    { coveredSerials: { contains: exactSerial } }
                ].filter(condition => Object.keys(condition).length > 0)
            },
            include: { product: true },
            orderBy: { startDate: 'desc' }
        });

        // 5. Find Replacement Context
        const warrantyClaims = item ? await (prisma.warrantyClaim as any).findMany({
            where: {
                OR: [
                    { inventoryItemId: item.id },
                    { replacementItemId: item.id }
                ]
            },
            include: {
                inventoryItem: { include: { product: true } }
            },
            orderBy: { createdAt: 'desc' }
        }) as any[] : [];

        // Manually fetch replacement items since the relation is missing in schema
        const replacementItemIds = warrantyClaims
            .map(c => c.replacementItemId)
            .filter((id): id is string => !!id);

        if (replacementItemIds.length > 0) {
            const replacementItems = await prisma.inventoryItem.findMany({
                where: { id: { in: replacementItemIds } },
                include: { product: true }
            });

            warrantyClaims.forEach(c => {
                if (c.replacementItemId) {
                    c.replacementItem = replacementItems.find(i => i.id === c.replacementItemId);
                }
            });
        }

        let replacementInfo = null;
        if (warrantyClaims.length > 0 && item) {
            const wasReplacedClaim = warrantyClaims.find(c => c.inventoryItemId === item.id && (c.replacementItemId || (c as any).replacementExternalInfo));
            const isReplacementClaim = warrantyClaims.find(c => c.replacementItemId === item.id);

            replacementInfo = {
                replacedBy: wasReplacedClaim ? {
                    serialNumber: wasReplacedClaim.replacementItem?.serialNumber || null,
                    externalInfo: (wasReplacedClaim as any).replacementExternalInfo || null,
                    date: wasReplacedClaim.replacementProvidedAt,
                    type: wasReplacedClaim.replacementType,
                    claimId: wasReplacedClaim.id
                } : null,
                replaces: isReplacementClaim ? {
                    serialNumber: isReplacementClaim.inventoryItem.serialNumber,
                    date: isReplacementClaim.replacementProvidedAt,
                    type: isReplacementClaim.replacementType,
                    claimId: isReplacementClaim.id
                } : null
            };
        }

        // 6. Combine and format all events
        const transactionHistory = transactionLogs.map(log => ({
            id: log.id,
            type: log.type,
            date: log.createdAt,
            notes: log.notes,
            performedBy: log.performedBy,
            source: 'transaction'
        }));

        const auditHistory = auditLogs.map(log => {
            let metadata: any = {};
            try { if (log.metadata) metadata = JSON.parse(log.metadata); } catch (e) { }
            let changes: any = {};
            try { if (log.changes) changes = JSON.parse(log.changes); } catch (e) { }

            let description = '';
            if (log.entityType === 'WARRANTY') {
                description = log.action === 'CREATE'
                    ? `Warranty claim created: ${metadata.description || 'No description'}`
                    : `Warranty claim updated: ${log.action}`;
            } else if (log.entityType === 'INVENTORY') {
                if (log.action === 'UPDATE' && changes.after?.status) {
                    description = `Status changed from ${changes.before?.status || 'N/A'} to ${changes.after?.status}`;
                }
            } else if (log.entityType === 'SERVICE_CONTRACT') {
                description = `AMC/Contract update: ${log.action}`;
            }

            return {
                id: log.id,
                type: `${log.entityType}_${log.action}`,
                date: log.createdAt,
                notes: description || `${log.entityType} ${log.action}`,
                performedBy: log.userName,
                source: 'audit'
            };
        });

        const amcHistory = allRelatedAMCs.map(amc => ({
            id: amc.id,
            type: 'AMC_COVERAGE',
            date: amc.startDate,
            notes: `Covered under AMC: ${amc.product.name} (Ref: ${amc.contractNumber || 'N/A'}) - Status: ${amc.status}`,
            performedBy: 'System',
            source: 'amc'
        }));

        const allHistory = [...transactionHistory, ...auditHistory, ...amcHistory]
            .sort((a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime());

        const doInfo = (item as any)?.deliveryOrderItem?.deliveryOrder;

        const finalResult = {
            item: item ? {
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
            } : {
                serialNumber: exactSerial,
                status: 'AMC_ONLY',
                product: {
                    name: amcRecord?.product.name || 'External Product',
                    brand: amcRecord?.product.brand || 'N/A',
                    model: amcRecord?.productModel || 'N/A',
                    sku: amcRecord?.product.sku || 'N/A'
                }
            },
            saleParams: doInfo ? {
                date: doInfo.createdAt,
                orderNumber: doInfo.orderNumber,
                status: doInfo.status,
                customer: doInfo.customer?.name || doInfo.customerName || 'N/A',
                endCustomer: doInfo.endCustomer?.name || doInfo.endCustomerName || null,
                invoiceNumber: doInfo.invoiceNumber
            } : null,
            amcs: allRelatedAMCs.map(amc => ({
                id: amc.id,
                contractNumber: amc.contractNumber,
                status: amc.status,
                startDate: amc.startDate,
                endDate: amc.endDate,
                productName: amc.product.name
            })),
            history: allHistory,
            replacementInfo
        };

        return NextResponse.json(finalResult);

    } catch (error: any) {
        console.error("Warranty lookup error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
