import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { logCreate } from '@/lib/audit'
import { Prisma } from '@prisma/client'

export async function GET(request: Request) {
    try {
        await requireAuth()

        const { searchParams } = new URL(request.url)
        const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
        const skip = (page - 1) * limit
        const search = searchParams.get('search') || ''
        const sortKey = searchParams.get('sortKey') || 'createdAt'
        const sortDir = (searchParams.get('sortDir') || 'desc') as 'asc' | 'desc'
        const includeInactive = searchParams.get('includeInactive') === 'true'
        const type = searchParams.get('type') || 'product'
        const categoryFilter = searchParams.get('category') || ''

        const where: any = {
            AND: [
                !includeInactive ? { isActive: true } : {},
                type === 'product' ? { serviceDefinition: null } : (type === 'service' ? { serviceDefinition: { isNot: null } } : {}),
                categoryFilter ? { category: categoryFilter } : {},
                search ? {
                    OR: [
                        { sku: { contains: search } },
                        { name: { contains: search } },
                        { brand: { contains: search } },
                        { category: { contains: search } },
                        { model: { contains: search } }
                    ]
                } : {}
            ]
        }

        // Handle nested sorting for stock
        let orderBy: any = []
        if (sortKey === 'stock') {
            orderBy = [{ inventory: { _count: sortDir } }]
        } else if (sortKey === 'status') {
            orderBy = [{ isActive: sortDir }]
        } else {
            orderBy = [{ [sortKey]: sortDir }]
        }

        const [products, total] = await Promise.all([
            prisma.product.findMany({
                where,
                skip,
                take: limit,
                orderBy,
                include: {
                    serviceDefinition: true,
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
                            locationId: true,
                            location: {
                                select: {
                                    name: true
                                }
                            }
                        }
                    }
                }
            }),
            prisma.product.count({ where })
        ])

        return NextResponse.json({
            products,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        })
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

        // Check for existing SKU
        const existing = await prisma.product.findUnique({ where: { sku } })
        if (existing) {
            return NextResponse.json(
                { error: `A product or service with SKU "${sku}" already exists.` },
                { status: 409 }
            )
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
        console.error('Error in POST /api/products:', error)
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return NextResponse.json(
                { error: `A product or service with this SKU already exists.` },
                { status: 409 }
            )
        }
        return NextResponse.json(
            { error: error.message || 'Failed to create product' },
            { status: error.message === 'Unauthorized' ? 401 : 500 }
        )
    }
}
