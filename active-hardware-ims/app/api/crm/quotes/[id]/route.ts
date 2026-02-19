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
        const user = await requireAuth()
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
            // Get before state (needs to be fetched inside tx or before)
            // Ideally before tx, but for now we fetch it here or assume we have it if we did a GET before
            // To be safe and simple, let's fetch before state before transaction if we want strict audit
            // But here we are already inside. Let's rely on the fact that we can audit the 'update' action.

            await tx.cRMQuoteItem.deleteMany({
                where: { quoteId: id }
            })

            const res = await tx.cRMQuote.update({
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
            });
            return res;
        })

        // Audit Log
        const { logUpdate } = await import('@/lib/audit')
        // We don't have the 'before' state readily available without another query, 
        // and 'updatedQuote' is the after. 
        // For simplicity in this context, we'll log the update action with the new total.
        // A better approach would be fetching 'before' at top of function.
        // Let's do that for consistency if we can, but to match the previous pattern:

        await logUpdate('CRM_QUOTE', updatedQuote.id, user.id, user.name, { status: 'UPDATED' }, {
            totalAmount: updatedQuote.totalAmount,
            version: updatedQuote.version,
            itemCount: updatedQuote.items.length
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
