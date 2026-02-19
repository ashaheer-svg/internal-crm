import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await requireAuth()
        const { id } = await params

        const originalQuote = await prisma.cRMQuote.findUnique({
            where: { id },
            include: { items: true }
        })

        if (!originalQuote) {
            return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
        }

        // Generate New Quote Number
        const dateStr = new Date().toISOString().slice(2, 7).replace('-', '')
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
        const quoteNumber = `QT-${dateStr}-${random}`

        // Calculate Version (for the project)
        const existingQuotesCount = await prisma.cRMQuote.count({
            where: { projectId: originalQuote.projectId }
        })
        const version = existingQuotesCount + 1

        // Duplicate
        const newQuote = await prisma.cRMQuote.create({
            data: {
                quoteNumber,
                projectId: originalQuote.projectId,
                version,
                status: 'DRAFT',
                saleType: originalQuote.saleType,
                billToId: originalQuote.billToId,
                shipToId: originalQuote.shipToId,
                subTotal: originalQuote.subTotal,
                taxAmount: originalQuote.taxAmount,
                taxDetails: originalQuote.taxDetails,
                discount: originalQuote.discount,
                totalAmount: originalQuote.totalAmount,
                validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Reset validity
                terms: originalQuote.terms,
                createdById: user.id,
                items: {
                    create: originalQuote.items.map(item => ({
                        order: item.order,
                        productId: item.productId,
                        description: item.description,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        discount: item.discount,
                        taxRate: item.taxRate,
                        total: item.total
                    }))
                }
            }
        })

        return NextResponse.json(newQuote)

    } catch (error: any) {
        console.error('Failed to duplicate quote:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to duplicate quote' },
            { status: 500 }
        )
    }
}
