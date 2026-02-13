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

        // Expected headers
        // name, type, email, phone, address, taxid, locationlabel, locationaddress, locationcontact, employeename, employeeemail, employeerole

        const results = {
            created: 0,
            updated: 0,
            errors: [] as string[]
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

                // 1. Upsert Customer
                const customer = await prisma.customer.upsert({
                    where: {
                        // We strictly don't have a unique name constraint in schema, but for import we treat name as key
                        // Realistically we should search first. Prisma upsert needs a unique constraint. 
                        // Since 'name' isn't @unique in schema (it's just String), we can't use upsert on name.
                        // We must findFirst then update or create.
                        id: "PLACEHOLDER_WILL_BE_REPLACED_BELOW"
                    },
                    update: {},
                    create: { id: "temp", name: "temp" } // Dummy
                }).catch(() => null); // Silent fail, we'll do manual find/create

                // Manual Find/Create Logic
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
                for (const row of groupRows) {
                    if (row.locationlabel && row.locationaddress) {
                        // Check if exists
                        const existingLoc = await prisma.deliveryAddress.findFirst({
                            where: {
                                customerId: dbCustomer.id,
                                label: row.locationlabel
                            }
                        });

                        if (!existingLoc) {
                            await prisma.deliveryAddress.create({
                                data: {
                                    customerId: dbCustomer.id,
                                    label: row.locationlabel,
                                    address: row.locationaddress,
                                    contactName: row.locationcontact,
                                    isDefault: false // Creating multiple, careful with default
                                }
                            });
                        }
                    }

                    // 3. Process Employees
                    if (row.employeename) {
                        const existingEmp = await prisma.partnerEmployee.findFirst({
                            where: {
                                customerId: dbCustomer.id,
                                name: row.employeename
                            }
                        });

                        if (!existingEmp) {
                            await prisma.partnerEmployee.create({
                                data: {
                                    customerId: dbCustomer.id,
                                    name: row.employeename,
                                    email: row.employeeemail,
                                    designation: row.employeerole
                                }
                            });
                        }
                    }
                }

            } catch (err: any) {
                results.errors.push(`Failed to process '${name}': ${err.message}`);
            }
        }

        return NextResponse.json(results);

    } catch (error: any) {
        console.error("Partner import error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
