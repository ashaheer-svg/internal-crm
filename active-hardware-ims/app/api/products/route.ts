import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { logCreate } from '@/lib/audit'

export async function GET(request: Request) {
    try {
        await requireAuth()

        const { searchParams } = new URL(request.url)
        const includeInactive = searchParams.get('includeInactive') === 'true'

        const type = searchParams.get('type') || 'product' // product, service, or all

        const where: any = {}
        if (!includeInactive) {
            where.isActive = true
        }

        if (type === 'product') {
            where.serviceDefinition = null
        } else if (type === 'service') {
            where.serviceDefinition = { isNot: null }
        }

        const products = await prisma.product.findMany({
            where,
            orderBy: [
                { accessCount: 'desc' },
                { createdAt: 'desc' }
            ],
            include: {
                _count: {
                    select: {
                        inventory: {
                            where: { status: "AVAILABLE" }
                        }
                    }
                },
                inventory: {
                    where: { status: "AVAILABLE" },
                    select: {
                        id: true,
                        serialNumber: true,
                        status: true,
                        locationId: true
                    }
                }
            }
        })
        return NextResponse.json(products)
    } catch (error: any) {
        console.error('Error in GET /api/products:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to fetch products' },
            { status: error.message === 'Unauthorized' ? 401 : 500 }
        )
    }
}

export async function POST(request: Request) {
    try {
        const user = await requireAuth()
        const body = await request.json()
        const { sku, name, brand, category, model, description, minStock, warrantyMonths } = body

        // Basic validation
        if (!sku || !name || !brand) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const product = await prisma.product.create({
            data: {
                sku,
                name,
                brand,
                category: category || 'General',
                model: model || '',
                description,
                minStock: Number(minStock) || 0,
                warrantyMonths: Number(warrantyMonths) || 0,
                // Handle Service Definition
                serviceDefinition: body.isService ? {
                    create: {
                        type: body.serviceType || 'ONE_TIME',
                        durationValue: Number(body.durationValue) || 1,
                        durationUnit: body.durationUnit || 'YEAR',
                        isMetered: body.isMetered || false,
                        billingCycle: body.billingCycle
                    }
                } : undefined
            }
        })

        // Log product creation
        await logCreate('PRODUCT', product.id, user.id, user.name, {
            sku: product.sku,
            name: product.name,
            brand: product.brand
        })

        return NextResponse.json(product)
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to create product' },
            { status: error.message === 'Unauthorized' ? 401 : 500 }
        )
    }
}
