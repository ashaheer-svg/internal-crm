import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hash } from 'bcryptjs'

export async function POST() {
    try {
        console.log('Starting comprehensive demo seeding...')

        // 1. Core Metadata: Categories
        const categories = [
            { name: 'Servers', type: 'HARDWARE', prefix: 'SRV' },
            { name: 'Networking', type: 'HARDWARE', prefix: 'NET' },
            { name: 'Laptops', type: 'HARDWARE', prefix: 'LAP' },
            { name: 'Components', type: 'COMPONENT', prefix: 'CMP' },
            { name: 'Software', type: 'LICENSE', prefix: 'SW' },
        ]

        for (const cat of categories) {
            await prisma.category.upsert({
                where: { name: cat.name },
                update: {},
                create: cat
            })
        }
        console.log('Categories seeded')

        // 2. Locations
        const locations = [
            { name: 'Main Warehouse', type: 'WAREHOUSE', address: '123 Tech Park' },
            { name: 'Downtown Showroom', type: 'SHOWROOM', address: '456 Market St' },
            { name: 'Repair Center', type: 'REPAIR_CENTER', address: '789 Industrial Blvd' },
        ]

        for (const loc of locations) {
            await prisma.location.upsert({
                where: { name: loc.name },
                update: {},
                create: loc
            })
        }
        console.log('Locations seeded')

        // 3. Sales Reps
        const salesRepName = 'John Doe' // Simple check to avoid duplicates if needed
        const existingRep = await prisma.salesRep.findFirst({ where: { name: salesRepName } })
        if (!existingRep) {
            await prisma.salesRep.create({
                data: {
                    name: salesRepName,
                    email: 'john.doe@activehardware.com',
                    phone: '555-0123',
                    quota: 500000,
                }
            })
        }

        // 4. Products
        const srvCat = await prisma.category.findUnique({ where: { name: 'Servers' } })
        const lapCat = await prisma.category.findUnique({ where: { name: 'Laptops' } })
        const compCat = await prisma.category.findUnique({ where: { name: 'Components' } })

        // Helper to get Category ID safely
        const getCatId = (name: string) => categories.find(c => c.name === name) ? undefined : undefined // placeholder logic, actual DB fetch above

        if (srvCat && lapCat && compCat) {
            const products = [
                {
                    name: 'Dell PowerEdge R740',
                    sku: 'DEL-R740-001',
                    categoryId: srvCat.id,
                    description: '2U Rack Server, Intel Xeon Gold',
                    price: 250000,
                    cost: 200000,
                    minStockLevel: 5
                },
                {
                    name: 'HP EliteBook 840 G8',
                    sku: 'HP-840G8-001',
                    categoryId: lapCat.id,
                    description: 'Business Laptop, i7, 16GB RAM',
                    price: 85000,
                    cost: 70000,
                    minStockLevel: 10
                },
                {
                    name: 'Samsung 32GB DDR4 Server RAM',
                    sku: 'MEM-DDR4-32G',
                    categoryId: compCat.id,
                    description: 'ECC Registered Memory',
                    price: 12000,
                    cost: 8000,
                    minStockLevel: 20
                },
                {
                    name: '1TB NVMe SSD',
                    sku: 'STR-NVME-1TB',
                    categoryId: compCat.id,
                    description: 'High performance storage',
                    price: 15000,
                    cost: 10000,
                    minStockLevel: 15
                }
            ]

            for (const prod of products) {
                await prisma.product.upsert({
                    where: { sku: prod.sku },
                    update: {},
                    create: prod
                })
            }
        }
        console.log('Products seeded')

        // 5. Customers
        const customers = [
            { name: 'Acme Corp', email: 'contact@acme.com', isPartner: false, phone: '555-1001' },
            { name: 'TechSolutions Ltd', email: 'procurement@techsol.com', isPartner: true, phone: '555-2002' }, // Partner
            { name: 'Global Industries', email: 'info@globalind.com', isPartner: false, phone: '555-3003' },
            { name: 'StartUp Inc', email: 'hello@startup.io', isPartner: false, phone: '555-4004' },
        ]

        for (const cust of customers) {
            // Check by email to avoid dupes (email is optional in schema but good for check)
            const existing = await prisma.customer.findFirst({ where: { name: cust.name } })
            if (!existing) {
                await prisma.customer.create({ data: cust })
            }
        }
        console.log('Customers seeded')

        // 6. Inventory
        const mainWarehouse = await prisma.location.findFirst({ where: { name: 'Main Warehouse' } })
        const dellServer = await prisma.product.findUnique({ where: { sku: 'DEL-R740-001' } })
        const ram = await prisma.product.findUnique({ where: { sku: 'MEM-DDR4-32G' } })

        if (mainWarehouse && dellServer && ram) {
            // Add Inventory Items
            // Server (Asset Tracked often, but for now simple Quantity or Serialized)
            // Let's create some 'Standard' inventory first
            await prisma.inventoryItem.create({
                data: {
                    productId: dellServer.id,
                    locationId: mainWarehouse.id,
                    quantity: 5,
                    status: 'AVAILABLE',
                    type: 'STANDARD'
                }
            })
            await prisma.inventoryItem.create({
                data: {
                    productId: ram.id,
                    locationId: mainWarehouse.id,
                    quantity: 50,
                    status: 'AVAILABLE',
                    type: 'STANDARD'
                }
            })
        }
        console.log('Inventory seeded')

        // 7. Services & Rentals
        // Create Service Definition
        const laptopRentalService = await prisma.serviceDefinition.create({
            data: {
                name: 'Standard Laptop Rental',
                description: 'Monthly rental of business laptop',
                category: 'RENTAL',
                defaultPrice: 3000,
                durationValue: 1,
                durationUnit: 'MONTHS'
            }
        })

        // Create Rental Assets
        const rentalAssets = []
        for (let i = 1; i <= 5; i++) {
            rentalAssets.push({
                name: `Rental Laptop #${i}`,
                serialNumber: `RNT-LAP-${1000 + i}`,
                model: 'Lenovo ThinkPad',
                status: 'AVAILABLE',
                purchaseDate: new Date(),
                cost: 60000
            })
        }

        for (const asset of rentalAssets) {
            // Basic check to avoid crashing on duplicate serial if ran twice
            const exists = await prisma.rentalAsset.findUnique({ where: { serialNumber: asset.serialNumber } })
            if (!exists) {
                await prisma.rentalAsset.create({ data: asset })
            }
        }
        console.log('Rental Assets seeded')

        // 8. CRM Pipeline & Projects
        // Ensure pipeline exists (using our API logic normally, but direct DB here)
        let pipeline = await prisma.cRMPipeline.findFirst({ where: { isDefault: true } })
        if (!pipeline) {
            pipeline = await prisma.cRMPipeline.create({
                data: {
                    name: 'Standard Sales Pipeline',
                    isDefault: true,
                    stages: {
                        create: [
                            { name: 'Lead', order: 1, color: '#64748b' },
                            { name: 'Qualified', order: 2, color: '#3b82f6' },
                            { name: 'Proposal', order: 3, color: '#8b5cf6' },
                            { name: 'Negotiation', order: 4, color: '#f59e0b' },
                            { name: 'Won', order: 5, color: '#22c55e' },
                            { name: 'Lost', order: 6, color: '#ef4444' }
                        ]
                    }
                },
                include: { stages: true }
            })
        }

        // Create sample Projects
        const partner = await prisma.customer.findFirst({ where: { isPartner: true } })
        const directCust = await prisma.customer.findFirst({ where: { isPartner: false } })
        const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } }) // Assuming seeded

        if (pipeline && partner && directCust && adminUser) {
            const stages = await prisma.cRMStage.findMany({ where: { pipelineId: pipeline.id } })
            const leadStage = stages.find(s => s.name === 'Lead')
            const wonStage = stages.find(s => s.name === 'Won')

            if (leadStage && wonStage) {
                // Project 1: Lead
                await prisma.cRMProject.create({
                    data: {
                        projectCode: `PRJ-${Date.now()}-001`,
                        title: 'New Office Setup',
                        customerId: directCust.id,
                        pipelineId: pipeline.id,
                        stageId: leadStage.id,
                        expectedValue: 500000,
                        currency: 'Rs.',
                        status: 'OPEN',
                        members: {
                            create: { userId: adminUser.id, role: 'OWNER' }
                        }
                    }
                })

                // Project 2: Won (Partner Sale)
                await prisma.cRMProject.create({
                    data: {
                        projectCode: `PRJ-${Date.now()}-002`,
                        title: 'Data Center Upgrade',
                        customerId: partner.id, // Partner as primary customer context
                        pipelineId: pipeline.id,
                        stageId: wonStage.id,
                        expectedValue: 1200000,
                        currency: 'Rs.',
                        status: 'WON',
                        members: {
                            create: { userId: adminUser.id, role: 'OWNER' }
                        }
                    }
                })
            }
        }
        console.log('CRM Projects seeded')

        return NextResponse.json({ success: true, message: "Comprehensive demo data seeded successfully!" })

    } catch (error: any) {
        console.error('Seeding failed:', error)
        return NextResponse.json({ error: error.message || 'Seeding failed' }, { status: 500 })
    }
}
