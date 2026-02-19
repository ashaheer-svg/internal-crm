import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params;
    try {
        await requireAuth()

        const quote = await prisma.cRMQuote.findUnique({
            where: { id },
            include: {
                project: {
                    include: {
                        customer: true
                    }
                },
                items: {
                    include: {
                        product: true
                    }
                },
                createdBy: true
            }
        })

        if (!quote) {
            return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
        }

        return NextResponse.json(quote)

    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to fetch quote' },
            { status: 500 }
        )
    }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params;
    try {
        await requireAuth()
        const body = await request.json()
        const { validUntil, items, terms, saleType, billToId, shipToId, taxDetails } = body

        // Calculate Totals
        let subTotal = 0
        const quoteItems = items.map((item: any, index: number) => {
            const lineTotal = Number(item.quantity) * Number(item.unitPrice)
            subTotal += lineTotal
            return {
                order: index,
                productId: item.productId || null,
                description: item.description,
                quantity: Number(item.quantity),
                unitPrice: Number(item.unitPrice),
                total: lineTotal
            }
        })

        // Tax Logic
        let taxAmount = 0
        let storedTaxDetails = null

        if (taxDetails) {
            try {
                const parsedTaxes = typeof taxDetails === 'string' ? JSON.parse(taxDetails) : taxDetails
                if (Array.isArray(parsedTaxes)) {
                    taxAmount = parsedTaxes.reduce((sum: number, tax: any) => sum + (Number(tax.amount) || 0), 0)
                    storedTaxDetails = JSON.stringify(parsedTaxes)
                }
            } catch (e) {
                console.error('Failed to parse tax details', e)
            }
        }

        const totalAmount = subTotal + taxAmount

        // 5. Update Quote (Transaction)
        // We delete existing items and recreate them to handle additions/removals easily
        const updatedQuote = await prisma.$transaction(async (tx) => {
            await tx.cRMQuoteItem.deleteMany({
                where: { quoteId: id }
            })

            return await tx.cRMQuote.update({
                where: { id },
                data: {
                    saleType: saleType || 'DIRECT',
                    billToId: billToId || null,
                    shipToId: shipToId || null,
                    subTotal,
                    taxAmount,
                    taxDetails: storedTaxDetails,
                    totalAmount,
                    validUntil: validUntil ? new Date(validUntil) : undefined,
                    terms,
                    items: {
                        create: quoteItems
                    }
                },
                include: {
                    items: true
                }
            })
        })

        return NextResponse.json(updatedQuote)

    } catch (error: any) {
        console.error('Failed to update quote:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to update quote' },
            { status: 500 }
        )
    }
}
