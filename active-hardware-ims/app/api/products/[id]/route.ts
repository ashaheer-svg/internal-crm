import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

interface RouteParams {
    params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteParams) {
    try {
        const { id } = await params
        const product = await prisma.product.findUnique({
            where: { id }
        })

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }

        return NextResponse.json(product)
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 })
    }
}

export async function PATCH(request: Request, { params }: RouteParams) {
    try {
        const { id } = await params
        const body = await request.json()
        const { sku, name, brand, model, description, minStock, warrantyMonths, lowResellerPrice, resellerPrice } = body

        const product = await prisma.product.update({
            where: { id },
            data: {
                sku,
                name,
                brand,
                model,
                description,
                minStock: Number(minStock) || 0,
                warrantyMonths: Number(warrantyMonths) || 0,
                lowResellerPrice: Number(lowResellerPrice) || 0,
                resellerPrice: Number(resellerPrice) || 0
            }
        })

        return NextResponse.json(product)
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
    }
}
