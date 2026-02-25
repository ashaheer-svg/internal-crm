import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(req: Request) {
    try {
        await requirePermission('settings:manage')

        const { data } = await req.json()

        if (!data || !Array.isArray(data)) {
            return NextResponse.json({ error: 'Invalid data format. Expected an array of customers.' }, { status: 400 })
        }

        const results = {
            created: 0,
            updated: 0,
            errors: 0
        }

        // Process in a transaction to ensure atomic import
        await prisma.$transaction(async (tx) => {
            for (const customerData of data) {
                try {
                    const { employees, deliveryAddresses, salesRep, ...customerFields } = customerData

                    // 1. Upsert Customer
                    const customer = await tx.customer.upsert({
                        where: { id: customerFields.id },
                        create: {
                            ...customerFields,
                            // Ensure dates are parsed correctly if they come in as strings
                            createdAt: customerFields.createdAt ? new Date(customerFields.createdAt) : undefined,
                            updatedAt: customerFields.updatedAt ? new Date(customerFields.updatedAt) : undefined,
                        },
                        update: {
                            ...customerFields,
                            updatedAt: new Date(),
                        }
                    })

                    // 2. Handle Employees
                    if (employees && Array.isArray(employees)) {
                        for (const emp of employees) {
                            await tx.partnerEmployee.upsert({
                                where: { id: emp.id },
                                create: { ...emp, customerId: customer.id },
                                update: { ...emp, customerId: customer.id }
                            })
                        }
                    }

                    // 3. Handle Delivery Addresses
                    if (deliveryAddresses && Array.isArray(deliveryAddresses)) {
                        for (const addr of deliveryAddresses) {
                            await tx.deliveryAddress.upsert({
                                where: { id: addr.id },
                                create: { ...addr, customerId: customer.id },
                                update: { ...addr, customerId: customer.id }
                            })
                        }
                    }

                    results.updated++
                } catch (err) {
                    console.error(`Failed to import customer ${customerData.name}:`, err)
                    results.errors++
                }
            }
        })

        return NextResponse.json({
            success: true,
            message: `Import complete. Processed ${data.length} customers.`,
            details: results
        })
    } catch (error: any) {
        console.error('Customer import error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to import customers' },
            { status: 500 }
        )
    }
}
