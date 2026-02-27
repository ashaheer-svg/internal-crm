import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function POST(request: Request) {
    try {
        await requireAuth()
        const { skus } = await request.json()

        if (!skus || !Array.isArray(skus)) {
            return NextResponse.json({ error: 'SKUs array is required' }, { status: 400 })
        }

        // Remove duplicates and empty strings
        const uniqueSkus = [...new Set(skus.filter(sku => typeof sku === 'string' && sku.trim() !== ''))]

        // Find existing products for these SKUs
        const existingProducts = await prisma.product.findMany({
            where: {
                sku: { in: uniqueSkus }
            },
            include: {
                serviceDefinition: true
            }
        })

        const foundSkus = new Map(existingProducts.map(p => [p.sku, !!p.serviceDefinition]))
        const results = uniqueSkus.reduce((acc, sku) => {
            acc[sku] = foundSkus.has(sku) ? { valid: true, isService: foundSkus.get(sku) } : { valid: false, isService: false }
            return acc
        }, {} as Record<string, { valid: boolean, isService: boolean }>)

        return NextResponse.json({
            results,
            validCount: foundSkus.size,
            invalidCount: uniqueSkus.length - foundSkus.size,
            missingSkus: uniqueSkus.filter(sku => !foundSkus.has(sku))
        })
    } catch (error: any) {
        console.error('Error in POST /api/products/validate-skus:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to validate SKUs' },
            { status: 500 }
        )
    }
}
