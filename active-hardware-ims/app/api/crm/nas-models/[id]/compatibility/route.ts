import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/crm/nas-models/[id]/compatibility
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const compatibility = await prisma.nasCompatibility.findMany({
            where: { nasModelId: id },
            include: {
                product: {
                    select: {
                        id: true,
                        name: true,
                        sku: true,
                        brand: true,
                        category: true,
                        model: true
                    }
                }
            },
            orderBy: { category: 'asc' }
        })
        return NextResponse.json(compatibility)
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch compatibility' }, { status: 500 })
    }
}

// POST /api/crm/nas-models/[id]/compatibility
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const body = await request.json()
        const { productId, category, notes } = body

        if (!productId || !category) {
            return NextResponse.json({ error: 'Product and Category are required' }, { status: 400 })
        }

        const item = await prisma.nasCompatibility.upsert({
            where: {
                nasModelId_productId: {
                    nasModelId: id,
                    productId: productId
                }
            },
            update: {
                category,
                notes
            },
            create: {
                nasModelId: id,
                productId,
                category,
                notes
            }
        })

        return NextResponse.json(item)
    } catch (error) {
        console.error("Compatibility Save Error:", error)
        return NextResponse.json({ error: 'Failed to save compatibility' }, { status: 500 })
    }
}

// DELETE /api/crm/nas-models/[id]/compatibility
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')

    if (!productId) {
        return NextResponse.json({ error: 'Product ID required' }, { status: 400 })
    }

    try {
        await prisma.nasCompatibility.delete({
            where: {
                nasModelId_productId: {
                    nasModelId: id,
                    productId: productId
                }
            }
        })
        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete compatibility' }, { status: 500 })
    }
}
