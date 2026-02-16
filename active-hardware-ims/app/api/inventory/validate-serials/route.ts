import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { serials } = body

        if (!serials || !Array.isArray(serials)) {
            return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
        }

        // Find items in inventory
        const foundItems = await prisma.inventoryItem.findMany({
            where: {
                serialNumber: { in: serials }
            },
            include: {
                product: {
                    select: {
                        id: true,
                        name: true,
                        brand: true,
                        model: true,
                        resellerPrice: true
                    }
                },
                location: {
                    select: { name: true }
                }
            }
        })

        const valid: any[] = []
        const invalid: string[] = []
        const notFound: string[] = []

        // Process results
        serials.forEach(serial => {
            const item = foundItems.find(i => i.serialNumber === serial)
            if (!item) {
                notFound.push(serial)
            } else if (item.status !== 'AVAILABLE') {
                invalid.push(serial) // Exists but not available
            } else {
                valid.push(item)
            }
        })

        return NextResponse.json({
            valid,
            invalid,
            notFound
        })

    } catch (error) {
        console.error('Validation error:', error)
        return NextResponse.json({ error: 'Validation failed' }, { status: 500 })
    }
}
