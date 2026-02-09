import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { logUpdate, logDelete } from '@/lib/audit'

interface RouteParams {
    params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteParams) {
    try {
        await requireAuth()
        const { id } = await params
        const product = await prisma.product.findUnique({
            where: { id }
        })

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }

        return NextResponse.json(product)
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to fetch product' },
            { status: error.message === 'Unauthorized' ? 401 : 500 }
        )
    }
}

export async function PATCH(request: Request, { params }: RouteParams) {
    try {
        const user = await requireAuth()
        const { id } = await params
        const body = await request.json()
        const { sku, name, brand, category, model, description, minStock, warrantyMonths, lowResellerPrice, resellerPrice } = body

        // Get existing for audit
        const existing = await prisma.product.findUnique({ where: { id } })
        if (!existing) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }

        const product = await prisma.product.update({
            where: { id },
            data: {
                sku,
                name,
                brand,
                category,
                model,
                description,
                minStock: Number(minStock) || 0,
                warrantyMonths: Number(warrantyMonths) || 0,
                lowResellerPrice: Number(lowResellerPrice) || 0,
                resellerPrice: Number(resellerPrice) || 0
            }
        })

        // Log update
        await logUpdate('PRODUCT', id, user.id, user.name,
            { name: existing.name, brand: existing.brand },
            { name: product.name, brand: product.brand }
        )

        return NextResponse.json(product)
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to update product' },
            { status: error.message === 'Unauthorized' ? 401 : 500 }
        )
    }
}
