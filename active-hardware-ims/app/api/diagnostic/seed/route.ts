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
            const existing = await prisma.category.findFirst({ where: { name: cat.name } })
            if (!existing) {
                await prisma.category.create({ data: cat })
            }
        }
        console.log('Categories seeded')

        // 2. Locations
        const locations = [
            { name: 'Main Warehouse', type: 'WAREHOUSE', address: '123 Tech Park' },
            { name: 'Downtown Showroom', type: 'SHOWROOM', address: '456 Market St' },
            { name: 'Repair Center', type: 'REPAIR_CENTER', address: '789 Industrial Blvd' },
        ]

        for (const loc of locations) {
            const existing = await prisma.location.findFirst({ where: { name: loc.name } })
            if (!existing) {
                await prisma.location.create({ data: loc })
            }
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
                    phone: '555-0123'
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
                    brand: 'Dell',
                    model: 'PowerEdge R740',
                    price: 250000,
                    cost: 200000,
                    minStockLevel: 5
                },
                {
                    name: 'HP EliteBook 840 G8',
                    sku: 'HP-840G8-001',
                    categoryId: lapCat.id,
                    description: 'Business Laptop, i7, 16GB RAM',
                    brand: 'HP',
                    model: 'EliteBook 840 G8',
                    price: 85000,
                    cost: 70000,
                    minStockLevel: 10
                },
                {
                    name: 'Samsung 32GB DDR4 Server RAM',
                    sku: 'MEM-DDR4-32G',
                    categoryId: compCat.id,
                    description: 'ECC Registered Memory',
                    brand: 'Samsung',
                    model: 'DDR4 32GB',
                    price: 12000,
                    cost: 8000,
                    minStockLevel: 20
                },
                {
                    name: '1TB NVMe SSD',
                    sku: 'STR-NVME-1TB',
                    categoryId: compCat.id,
                    description: 'High performance storage',
                    brand: 'Samsung',
                    model: '980 Pro',
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
            // Add Inventory Items (Individual Serialized Items)
            // Create 3 Servers
            for (let i = 1; i <= 3; i++) {
                const serial = `SRV-TAG-${100 + i}`
                const exists = await prisma.inventoryItem.findUnique({ where: { serialNumber: serial } })
                if (!exists) {
                    await prisma.inventoryItem.create({
                        data: {
                            productId: dellServer.id,
                            locationId: mainWarehouse.id,
                            serialNumber: serial,
                            status: 'AVAILABLE',
                            unitCost: 200000
                        }
                    })
                }
            }

            // Create 10 RAM sticks
            for (let i = 1; i <= 10; i++) {
                const serial = `RAM-TAG-${100 + i}`
                const exists = await prisma.inventoryItem.findUnique({ where: { serialNumber: serial } })
                if (!exists) {
                    await prisma.inventoryItem.create({
                        data: {
                            productId: ram.id,
                            locationId: mainWarehouse.id,
                            serialNumber: serial,
                            status: 'AVAILABLE',
                            unitCost: 8000
                        }
                    })
                }
            }
        }
        console.log('Inventory seeded')

        // 7. Services & Rentals
        // Create Service Definition
        const laptopRentalService = await prisma.serviceDefinition.create({
            data: {
                name: 'Standard Laptop Rental',
                description: 'Monthly rental of business laptop',
                category: 'RENTAL', // Assuming category is valid, but schema said type. Let's check schema again. 
                // Schema: type String. 
                type: 'RENTAL',
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
                // model: 'Lenovo ThinkPad', // Removed, not in schema
                status: 'AVAILABLE',
                // purchaseDate: new Date(), // Removed
                // cost: 60000 // Removed
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
