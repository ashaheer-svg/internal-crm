import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePermission } from '@/lib/auth'
import { logCreate, logUpdate } from '@/lib/audit'

export async function GET(request: Request) {
    try {
        await requirePermission('warranty_rma:read')
        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status')

        const where = status ? { status } : {}

        const claims = await (prisma.warrantyClaim as any).findMany({
            where,
            include: {
                inventoryItem: {
                    include: {
                        product: true,
                        location: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json(claims)
    } catch (error: any) {
        console.error('Failed to fetch warranty claims:', error)
        return NextResponse.json({ error: error.message || 'Failed to fetch warranty claims' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const user = await requirePermission('warranty_rma:create')
        const body = await request.json()
        const { inventoryItemId: providedItemId, customerId, customerName, description, isLegacy, sku, name, brand, model, serialNumber } = body

        if (!customerName || !description) {
            return NextResponse.json({ error: 'Missing required fields: customerName and description' }, { status: 400 })
        }

        let inventoryItemId = providedItemId

        if (isLegacy) {
            if (!sku || !name || !brand || !model || !serialNumber) {
                return NextResponse.json({ error: 'Legacy items require SKU, Name, Brand, Model, and Serial Number' }, { status: 400 })
            }

            // 1. Find or create Product
            let product = await prisma.product.findUnique({ where: { sku: sku.trim() } })
            if (!product) {
                product = await prisma.product.create({
                    data: {
                        sku: sku.trim(),
                        name: name.trim(),
                        brand: brand.trim(),
                        model: model.trim(),
                        category: 'Legacy'
                    }
                })
            }

            // 2. Find location
            const location = await prisma.location.findFirst()
            if (!location) {
                return NextResponse.json({ error: 'No location found to create item' }, { status: 400 })
            }

            // 3. Create Inventory Item
            const newItem = await prisma.inventoryItem.create({
                data: {
                    productId: product.id,
                    serialNumber: serialNumber.trim(),
                    status: 'RMA_DEFECTIVE_RECEIVED',
                    locationId: location.id
                }
            })
            inventoryItemId = newItem.id
        }

        if (!inventoryItemId) {
            return NextResponse.json({ error: 'Missing required field: inventoryItemId' }, { status: 400 })
        }

        // Check if inventory item exists and get current status
        const inventoryItem = await prisma.inventoryItem.findUnique({
            where: { id: inventoryItemId },
            include: { product: true }
        })

        if (!inventoryItem) {
            return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 })
        }

        // Create warranty claim
        const claim = await prisma.warrantyClaim.create({
            data: {
                inventoryItemId,
                customerName,
                customerId: customerId || null,
                description,
                status: 'PENDING'
            },
            include: {
                inventoryItem: {
                    include: {
                        product: true,
                        location: true
                    }
                }
            }
        })

        // Log warranty claim creation
        await logCreate('WARRANTY', claim.id, user.id, user.name, {
            claimId: claim.id,
            serialNumber: inventoryItem.serialNumber,
            productName: inventoryItem.product.name,
            customerName,
            description,
            status: 'PENDING'
        })

        // Update inventory item status to RMA_DEFECTIVE_RECEIVED and link claim for traceability
        const previousStatus = inventoryItem.status
        await prisma.inventoryItem.update({
            where: { id: inventoryItemId },
            data: { 
                status: 'RMA_DEFECTIVE_RECEIVED',
                warrantyClaimId: claim.id
            }
        })

        // Log inventory status change
        await logUpdate('INVENTORY', inventoryItemId, user.id, user.name,
            { status: previousStatus, serialNumber: inventoryItem.serialNumber },
            { status: 'RMA_DEFECTIVE_RECEIVED', reason: 'Warranty claim created' }
        )

        return NextResponse.json(claim)
    } catch (error) {
        console.error('Failed to create warranty claim:', error)
        return NextResponse.json({ error: 'Failed to create warranty claim' }, { status: 500 })
    }
}
