import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const isPreview = searchParams.get('preview') === 'true';

        const user = await requireRole(['ADMIN', 'MANAGER'])
        const contentType = request.headers.get('content-type') || ''

        // Handle JSON Batch Import (Chunked)
        if (contentType.includes('application/json')) {
            const body = await request.json()
            const { customers } = body

            if (!Array.isArray(customers)) {
                return NextResponse.json({ error: 'Invalid data format. Expected array of customers.' }, { status: 400 })
            }

            let successCount = 0
            let errorCount = 0
            const errors: any[] = []

            logger.info(`Starting customer import batch of ${customers.length} items`, { userId: user.id })

            for (const item of customers) {
                try {
                    // 1. Upsert Customer
                    let dbCustomer = await prisma.customer.findFirst({
                        where: { name: item.name }
                    });

                    if (dbCustomer) {
                        // Update existing
                        dbCustomer = await prisma.customer.update({
                            where: { id: dbCustomer.id },
                            data: {
                                email: item.email || dbCustomer.email,
                                phone: item.phone || dbCustomer.phone,
                                address: item.address || dbCustomer.address,
                                taxId: item.taxId || dbCustomer.taxId,
                                salesRepLegacy: item.salesRep || (dbCustomer as any).salesRepLegacy,
                                notes: item.notes || dbCustomer.notes,
                                isPartner: item.roles?.isPartner ?? dbCustomer.isPartner,
                                isSupplier: item.roles?.isSupplier ?? dbCustomer.isSupplier,
                                isCustomer: item.roles?.isCustomer ?? dbCustomer.isCustomer
                            } as any
                        })
                    } else {
                        // Create new
                        dbCustomer = await prisma.customer.create({
                            data: {
                                name: item.name,
                                email: item.email,
                                phone: item.phone,
                                address: item.address,
                                taxId: item.taxId,
                                salesRepLegacy: item.salesRep,
                                notes: item.notes,
                                isPartner: item.roles?.isPartner || false,
                                isSupplier: item.roles?.isSupplier || false,
                                isCustomer: item.roles?.isCustomer || true, // Default
                                isActive: true
                            } as any
                        })
                    }

                    // 2. Process Locations
                    if (item.locations && Array.isArray(item.locations)) {
                        for (const loc of item.locations) {
                            if (!loc.label || !loc.address) continue;

                            const existingLoc = await prisma.deliveryAddress.findFirst({
                                where: {
                                    customerId: dbCustomer.id,
                                    label: loc.label
                                }
                            });

                            if (!existingLoc) {
                                await prisma.deliveryAddress.create({
                                    data: {
                                        customerId: dbCustomer.id,
                                        label: loc.label,
                                        address: loc.address,
                                        contactName: loc.contactName,
                                        phone: loc.phone
                                    }
                                })
                            }
                        }
                    }

                    // 3. Process Employees
                    if (item.employees && Array.isArray(item.employees)) {
                        for (const emp of item.employees) {
                            if (!emp.name) continue;

                            const existingEmp = await prisma.partnerEmployee.findFirst({
                                where: {
                                    customerId: dbCustomer.id,
                                    name: emp.name
                                }
                            });

                            if (!existingEmp) {
                                await prisma.partnerEmployee.create({
                                    data: {
                                        customerId: dbCustomer.id,
                                        name: emp.name,
                                        email: emp.email,
                                        phone: emp.phone,
                                        designation: emp.designation
                                    }
                                })
                            }
                        }
                    }

                    successCount++
                } catch (error: any) {
                    errorCount++
                    errors.push({ name: item.name, error: error.message })
                    logger.error(`Failed to import customer ${item.name}`, error)
                }
            }

            logger.info(`Customer import batch completed`, { successCount, errorCount })
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

        // Expected headers
        // name, type, email, phone, address, taxid, locationlabel, locationaddress, locationcontact, employeename, employeeemail, employeerole

        const results = {
            created: 0,
            updated: 0,
            errors: [] as string[],
            preview: [] as any[]
        };

        // Group rows by Customer Name
        const groups: { [key: string]: any[] } = {};

        for (let i = 1; i < rows.length; i++) {
            const row = rows[i].split(',').map(c => c.trim());
            if (row.length < 2) continue; // Skip empty/malformed rows

            const data: any = {};
            headers.forEach((h, index) => data[h] = row[index]);

            if (!data.name) continue;

            if (!groups[data.name]) {
                groups[data.name] = [];
            }
            groups[data.name].push(data);
        }

        // Process each group
        for (const name of Object.keys(groups)) {
            try {
                const groupRows = groups[name];
                const mainRow = groupRows[0]; // Use first row for main details

                // Determine roles
                const type = (mainRow.type || '').toLowerCase();
                const isPartner = type.includes('partner') || type.includes('reseller');
                const isSupplier = type.includes('supplier');
                const isCustomer = !isPartner && !isSupplier; // Default to Customer if not specified

                // Build the customer object structure
                const customerData = {
                    name: name,
                    email: mainRow.email,
                    phone: mainRow.phone,
                    address: mainRow.address,
                    taxId: mainRow.taxid,
                    roles: {
                        isPartner,
                        isSupplier,
                        isCustomer
                    },
                    locations: [] as any[],
                    employees: [] as any[]
                };


                // Process Locations (Deduplicate by label)
                const locationMap = new Map();
                for (const row of groupRows) {
                    if (row.locationlabel && row.locationaddress) {
                        const key = row.locationlabel;
                        if (!locationMap.has(key)) {
                            locationMap.set(key, {
                                label: row.locationlabel,
                                address: row.locationaddress,
                                contactName: row.locationcontact
                            });
                        }
                    }
                }
                customerData.locations = Array.from(locationMap.values());

                // Process Employees (Deduplicate by name)
                const employeeMap = new Map();
                for (const row of groupRows) {
                    if (row.employeename) {
                        const key = row.employeename;
                        if (!employeeMap.has(key)) {
                            employeeMap.set(key, {
                                name: row.employeename,
                                email: row.employeeemail,
                                designation: row.employeerole
                            });
                        }
                    }
                }
                customerData.employees = Array.from(employeeMap.values());

                if (isPreview) {
                    results.preview.push(customerData);
                    continue; // Skip DB operations in preview mode
                }

                // --- DB OPERATIONS (Only if not preview) ---

                // 1. Upsert Customer
                let dbCustomer = await prisma.customer.findFirst({
                    where: { name: name }
                });

                if (dbCustomer) {
                    // Update main details if provided
                    dbCustomer = await prisma.customer.update({
                        where: { id: dbCustomer.id },
                        data: {
                            email: mainRow.email || dbCustomer.email,
                            phone: mainRow.phone || dbCustomer.phone,
                            address: mainRow.address || dbCustomer.address,
                            taxId: mainRow.taxid || dbCustomer.taxId,
                            isPartner: isPartner || dbCustomer.isPartner,
                            isSupplier: isSupplier || dbCustomer.isSupplier,
                            isCustomer: isCustomer || dbCustomer.isCustomer
                        }
                    });
                    results.updated++;
                } else {
                    // Create new
                    dbCustomer = await prisma.customer.create({
                        data: {
                            name: name,
                            email: mainRow.email,
                            phone: mainRow.phone,
                            address: mainRow.address,
                            taxId: mainRow.taxid,
                            isPartner: isPartner,
                            isSupplier: isSupplier,
                            isCustomer: isCustomer
                        }
                    });
                    results.created++;
                }

                // 2. Process Locations (Delivery Addresses)
                for (const loc of customerData.locations) {
                    const existingLoc = await prisma.deliveryAddress.findFirst({
                        where: {
                            customerId: dbCustomer.id,
                            label: loc.label
                        }
                    });

                    if (!existingLoc) {
                        await prisma.deliveryAddress.create({
                            data: {
                                customerId: dbCustomer.id,
                                label: loc.label,
                                address: loc.address,
                                contactName: loc.contactName,
                                isDefault: false
                            }
                        });
                    }
                }

                // 3. Process Employees
                for (const emp of customerData.employees) {
                    const existingEmp = await prisma.partnerEmployee.findFirst({
                        where: {
                            customerId: dbCustomer.id,
                            name: emp.name
                        }
                    });

                    if (!existingEmp) {
                        await prisma.partnerEmployee.create({
                            data: {
                                customerId: dbCustomer.id,
                                name: emp.name,
                                email: emp.email,
                                designation: emp.designation
                            }
                        });
                    }
                }

            } catch (err: any) {
                results.errors.push(`Failed to process '${name}': ${err.message}`);
                logger.error(`Failed to process CSV row for ${name}`, err)
            }
        }

        return NextResponse.json(results);

    } catch (error: any) {
        logger.error("Partner import error", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
