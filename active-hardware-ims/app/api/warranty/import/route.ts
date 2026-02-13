import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const text = await file.text();
        const rows = text.split('\n').filter(row => row.trim() !== '');
        const headers = rows[0].split(',').map(h => h.trim().toLowerCase());

        // Validate headers
        const required = ['serialnumber', 'sku', 'solddate', 'customername'];
        const missing = required.filter(r => !headers.includes(r));
        if (missing.length > 0) {
            return NextResponse.json({ error: `Missing columns: ${missing.join(', ')}` }, { status: 400 });
        }

        const results = {
            success: 0,
            failed: 0,
            errors: [] as string[]
        };

        // Get a default location for these items (e.g. first available)
        const defaultLocation = await prisma.location.findFirst();
        if (!defaultLocation) {
            return NextResponse.json({ error: 'System has no locations configured. Please create a location first.' }, { status: 500 });
        }

        // Process rows (skip header)
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i].split(',').map(c => c.trim());
            if (row.length < required.length) continue;

            const data: any = {};
            headers.forEach((h, index) => data[h] = row[index]);

            try {
                const { serialnumber, sku, solddate, customername, expirydate, invoicenumber, notes } = data;

                if (!serialnumber || !sku || !solddate) {
                    throw new Error('Missing required fields');
                }

                // 1. Find Product
                const product = await prisma.product.findUnique({
                    where: { sku: sku }
                });

                if (!product) {
                    throw new Error(`Product SKU '${sku}' not found`);
                }

                // 2. Check duplicate serial
                const existing = await prisma.inventoryItem.findUnique({
                    where: { serialNumber: serialnumber }
                });

                if (existing) {
                    throw new Error(`Serial '${serialnumber}' already exists`);
                }

                // 3. Calculate Expiry
                let warrantyExpiry: Date;
                const saleDate = new Date(solddate);

                if (expirydate) {
                    warrantyExpiry = new Date(expirydate);
                } else {
                    // Calc based on product default
                    const months = product.warrantyMonths || 12; // Default 1 year if 0
                    warrantyExpiry = new Date(saleDate);
                    warrantyExpiry.setMonth(warrantyExpiry.getMonth() + months);
                }

                // Format notes for the log
                const logNotes = `Historical Import. Customer: ${customername}. Sold on: ${solddate}. Invoice: ${invoicenumber || 'N/A'}. ${notes ? `Notes: ${notes}` : ''}`;

                // 4. Create Transaction
                await prisma.$transaction(async (tx) => {
                    // Create Item
                    const newItem = await tx.inventoryItem.create({
                        data: {
                            serialNumber: serialnumber,
                            productId: product.id,
                            locationId: defaultLocation.id,
                            status: 'SOLD',
                            warrantyExpiry: warrantyExpiry,
                            createdAt: saleDate, // Backdate creation to sold date
                            unitCost: product.resellerPrice * 0.7 // Approximate cost if unknown
                        }
                    });

                    // Create History Log
                    await tx.transactionLog.create({
                        data: {
                            type: 'IMPORT_HISTORY',
                            referenceType: 'LEGACY_IMPORT',
                            referenceId: newItem.id,
                            productId: product.id,
                            serialNumber: serialnumber,
                            quantity: 1,
                            fromLocation: defaultLocation.name,
                            toLocation: 'CUSTOMER',
                            performedBy: 'SYSTEM_IMPORT',
                            notes: logNotes,
                            createdAt: saleDate // Backdate log
                        }
                    });
                });

                results.success++;

            } catch (err: any) {
                results.failed++;
                results.errors.push(`Row ${i + 1} (${data.serialnumber || 'Unknown'}): ${err.message}`);
            }
        }

        return NextResponse.json(results);

    } catch (error: any) {
        console.error("Import error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
