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
        const { sku, name, brand, category, model, description, minStock, warrantyMonths, lowResellerPrice, resellerPrice, isActive } = body

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
                resellerPrice: Number(resellerPrice) || 0,
                isActive: isActive !== undefined ? isActive : undefined
            }
        })

        // Log update
        await logUpdate('PRODUCT', id, user.id, user.name,
            { name: existing.name, brand: existing.brand, isActive: existing.isActive },
            { name: product.name, brand: product.brand, isActive: product.isActive }
        )

        return NextResponse.json(product)
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to update product' },
            { status: error.message === 'Unauthorized' ? 401 : 500 }
        )
    }
}

export async function DELETE(request: Request, { params }: RouteParams) {
    try {
        const user = await requireAuth()
        const { id } = await params
        const { searchParams } = new URL(request.url)
        const type = searchParams.get('type') || 'soft' // soft, hard, restore

        const product = await prisma.product.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { inventory: true }
                }
            }
        })

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }

        if (type === 'hard') {
            // Check for inventory
            if (product._count.inventory > 0) {
                return NextResponse.json({
                    error: 'Cannot delete product that has inventory items. Please remove inventory first.'
                }, { status: 400 })
            }

            await prisma.product.delete({
                where: { id }
            })

            await logDelete('PRODUCT', id, user.id, user.name, {
                sku: product.sku,
                name: product.name,
                type: 'HARD_DELETE'
            })
        } else if (type === 'restore') {
            await prisma.product.update({
                where: { id },
                data: { isActive: true }
            })

            await logUpdate('PRODUCT', id, user.id, user.name,
                { isActive: false },
                { isActive: true }
            )
        } else {
            // Soft delete (Deactivate)
            await prisma.product.update({
                where: { id },
                data: { isActive: false }
            })

            await logUpdate('PRODUCT', id, user.id, user.name,
                { isActive: true },
                { isActive: false }
            )
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to delete product' },
            { status: error.message === 'Unauthorized' ? 401 : 500 }
        )
    }
}
