import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePermission } from '@/lib/auth'

export async function GET() {
    try {
        await requirePermission('settings:manage')

        // Fetch products with brand 'SYNOLOGY' and category 'NAS'
        // We use Case-Insensitive search if possible, or just match exactly if that's the convention
        const products = await prisma.product.findMany({
            where: {
                brand: {
                    contains: 'SYNOLOGY',
                    // mode: 'insensitive' // SQLite doesn't support 'mode: insensitive' in many cases without extensions
                }
            },
            select: {
                id: true,
                model: true,
                name: true,
                sku: true,
                brand: true,
                category: true
            }
        })

        // Filter manually for NAS category to be safe with casing
        const nasProducts = products.filter(p =>
            p.brand?.toUpperCase() === 'SYNOLOGY' &&
            p.category?.toUpperCase() === 'NAS'
        )

        return NextResponse.json(nasProducts)
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
