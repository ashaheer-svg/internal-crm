import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth';

export async function POST(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const isPreview = searchParams.get('preview') === 'true';

        const user = await requireRole(['ADMIN'])
        const contentType = request.headers.get('content-type') || ''

        // Handle JSON Batch Import (Chunked)
        if (contentType.includes('application/json')) {
            const body = await request.json()
            const { items } = body

            if (!Array.isArray(items)) {
                return NextResponse.json({ error: 'Invalid data format. Expected array of items.' }, { status: 400 })
            }

            // Fetch a default location for these items (required by schema)
            const defaultLocation = await prisma.location.findFirst();
            if (!defaultLocation) {
                return NextResponse.json({ error: 'System has no locations configured. Please create a location first.' }, { status: 500 });
            }

            let successCount = 0
            let errorCount = 0
            const errors: any[] = []

            for (const item of items) {
                try {
                    // Find product by SKU
                    const product = await prisma.product.findUnique({
                        where: { sku: item.sku }
                    });

                    if (!product) {
                        throw new Error(`Product with SKU '${item.sku}' not found`);
                    }

                    // Create Inventory Item (SOLD status)
                    const inventoryItem = await prisma.inventoryItem.create({
                        data: {
                            productId: product.id,
                            serialNumber: item.serialNumber,
                            status: 'SOLD',
                            locationId: defaultLocation.id, // Must be a valid location ID
                            createdAt: new Date(item.soldDate), // Use sold date as creation for age
                            warrantyExpiry: new Date(item.warrantyExpiry)
                        }
                    });

                    // Create Transaction Log
                    await prisma.transactionLog.create({
                        data: {
                            type: 'IMPORT_HISTORY',
                            // Schema does not have inventoryItemId relation, uses loose reference
                            productId: product.id,
                            serialNumber: item.serialNumber,
                            quantity: 1,
                            referenceId: `IMPORT-${new Date().getTime()}`,
                            fromLocation: 'SYSTEM',
                            toLocation: 'CUSTOMER',
                            notes: `Historical Import. Customer: ${item.customer || 'Unknown'}. Invoice: ${item.invoiceNumber || 'N/A'}. ${item.notes || ''}`,
                            performedBy: user.id
                        }
                    });

                    successCount++
                } catch (error: any) {
                    errorCount++
                    errors.push({ serial: item.serialNumber, error: error.message })
                }
            }

            return NextResponse.json({ success: true, successCount, errorCount, errors })
        }

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
            success: 0, // In preview, this counts valid rows
            failed: 0,
            errors: [] as string[],
            preview: [] as any[]
        };

        // Get a default location for these items (e.g. first available)
        // We need this even for preview to ensure configuration is correct
        const defaultLocation = await prisma.location.findFirst();
        if (!defaultLocation) {
            return NextResponse.json({ error: 'System has no locations configured. Please create a location first.' }, { status: 500 });
        }

        // Pre-fetch all products and existing serials to optimize validation
        const products = await prisma.product.findMany({ select: { id: true, sku: true, warrantyMonths: true, resellerPrice: true } });
        const productMap = new Map(products.map(p => [p.sku, p]));

        // For serial check, we can't easily fetch all if dataset is huge, but for import batch it's okay to check locally or one update query? 
        // Better to check individually or fetch match in batch key if possible. 
        // For simplicity and safety in import, checking individually or pre-fetching existing serials from the list is safer.
        // Let's get list of serials involved in this import to check DB once.
        const importSerials = rows.slice(1).map(r => {
            const row = r.split(',').map(c => c.trim());
            const data: any = {};
            headers.forEach((h, index) => data[h] = row[index]);
            return data.serialnumber;
        }).filter(s => s);

        const dbSerials = await prisma.inventoryItem.findMany({
            where: { serialNumber: { in: importSerials } },
            select: { serialNumber: true }
        });
        const existingSerialSet = new Set(dbSerials.map(i => i.serialNumber));


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
                const product = productMap.get(sku);
                if (!product) {
                    throw new Error(`Product SKU '${sku}' not found`);
                }

                // 2. Check duplicate serial
                if (existingSerialSet.has(serialnumber)) {
                    throw new Error(`Serial '${serialnumber}' already exists`);
                }

                // 3. Calculate Expiry
                let warrantyExpiry: Date;
                const saleDate = new Date(solddate);
                if (isNaN(saleDate.getTime())) {
                    throw new Error(`Invalid sold date '${solddate}'`);
                }

                if (expirydate) {
                    warrantyExpiry = new Date(expirydate);
                    if (isNaN(warrantyExpiry.getTime())) {
                        throw new Error(`Invalid expiry date '${expirydate}'`);
                    }
                } else {
                    // Calc based on product default
                    const months = product.warrantyMonths || 12; // Default 1 year if 0
                    warrantyExpiry = new Date(saleDate);
                    warrantyExpiry.setMonth(warrantyExpiry.getMonth() + months);
                }

                // Format notes for the log
                const logNotes = `Historical Import. Customer: ${customername}. Sold on: ${solddate}. Invoice: ${invoicenumber || 'N/A'}. ${notes ? `Notes: ${notes}` : ''}`;

                if (isPreview) {
                    results.preview.push({
                        serialNumber: serialnumber,
                        sku: sku,
                        productName: product.sku, // or fetch name if needed, but sku is enough for verification
                        soldDate: saleDate.toISOString().split('T')[0],
                        customer: customername,
                        warrantyExpiry: warrantyExpiry.toISOString().split('T')[0],
                        invoiceNumber: invoicenumber || '',
                        notes: notes || '',
                        status: 'Valid'
                    });
                    results.success++;
                } else {
                    // 4. Create Transaction (DB Write)
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
                }

            } catch (err: any) {
                results.failed++;
                results.errors.push(`Row ${i + 1} (${data.serialnumber || 'Unknown'}): ${err.message}`);
                // If preview, we want to know about failures too?
                // The errors array already captures it.
            }
        }

        return NextResponse.json(results);

    } catch (error: any) {
        console.error("Import error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
