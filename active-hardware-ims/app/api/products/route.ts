import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { logCreate } from '@/lib/audit'

export async function GET(request: Request) {
    try {
        await requireAuth()

        const { searchParams } = new URL(request.url)
        const includeInactive = searchParams.get('includeInactive') === 'true'

        const where: any = {}
        if (!includeInactive) {
            where.isActive = true
        }

        const products = await prisma.product.findMany({
            where,
            orderBy: { createdAt: 'desc' },
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
                warrantyMonths: Number(warrantyMonths) || 0
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
