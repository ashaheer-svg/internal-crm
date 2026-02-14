import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger'; // Added logger import

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const serial = searchParams.get('serial');

    // Log lookup attempt before validation
    logger.info(`Attempting warranty lookup for serial: ${serial || 'N/A'}`);

    if (!serial) {
        logger.warn('Warranty lookup failed: Serial number is required'); // Log warning for missing serial
        return NextResponse.json({ error: 'Serial number is required' }, { status: 400 });
    }

    try {
        // 1. Find the Inventory Item
        const item = await prisma.inventoryItem.findUnique({
            where: { serialNumber: serial },
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
            }
        });

        if (!item) {
            return NextResponse.json({ error: 'Serial number not found' }, { status: 404 });
        }

        // 2. Find associated Transaction Logs
        // We look for logs that reference this serial number OR the specific item ID
        const logs = await prisma.transactionLog.findMany({
            where: {
                OR: [
                    { serialNumber: serial },
                    { referenceId: item.id } // Sometimes we might link by Item ID
                ]
            },
            orderBy: { createdAt: 'desc' }
        });

        // 3. Construct the response
        const history = logs.map(log => ({
            id: log.id,
            type: log.type,
            date: log.createdAt,
            notes: log.notes,
            performedBy: log.performedBy
        }));

        // If it's a Delivery Order sale, ensure we have a "SOLD" event represented even if logs are missing (for older data)
        const deliveryOrder = item.deliveryOrderItem?.deliveryOrder;

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
            saleParams: deliveryOrder ? {
                date: deliveryOrder.createdAt,
                orderNumber: deliveryOrder.orderNumber,
                customer: deliveryOrder.customerName,
                endCustomer: deliveryOrder.endCustomerName,
                type: deliveryOrder.saleType
            } : null,
            history: history
        };

        return NextResponse.json(result);

    } catch (error: any) {
        console.error("Warranty lookup error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
