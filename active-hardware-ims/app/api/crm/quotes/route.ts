import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { getNextSequence } from '@/lib/sequences'

export async function POST(request: Request) {
    try {
        const user = await requireAuth()
        const body = await request.json()
        const { projectId, validUntil, items, terms, saleType, billToId, shipToId, taxDetails, comment } = body

        if (!projectId) {
            return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
        }

        // 1. Get Project & Customer Logic
        const project = await prisma.cRMProject.findUnique({
            where: { id: projectId },
            include: { customer: true }
        })

        if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

        // 2. Determine Quote Number
        const finalQuoteNumber = body.quoteNumber || await getNextSequence('QUOTE', true)

        // Check for existing quote number to provide better error
        const existing = await prisma.cRMQuote.findUnique({
            where: { quoteNumber: finalQuoteNumber }
        })
        if (existing) {
            return NextResponse.json({ error: `Quotation number ${finalQuoteNumber} already exists. Please use a unique number.` }, { status: 400 })
        }

        // 3. Current Version Calculation
        // Find existing quotes for this project to determine version
        const existingQuotesCount = await prisma.cRMQuote.count({
            where: { projectId }
        })
        const version = existingQuotesCount + 1

        // 4. Calculate Totals
        let subTotal = 0
        const quoteItems = items.map((item: any, index: number) => {
            const quantity = Number(item.quantity)
            const unitPrice = Number(item.unitPrice)
            const discount = Number(item.discount || 0)

            const rawTotal = quantity * unitPrice
            const discountAmount = (rawTotal * (discount / 100))
            const lineTotal = rawTotal - discountAmount

            subTotal += lineTotal
            return {
                order: index,
                productId: item.productId || null,
                description: item.description,
                productModel: item.productModel || null,
                serialNumbers: item.serialNumbers || null,
                quantity,
                unitPrice,
                discount,
                total: lineTotal,
                details: {
                    create: item.details?.map((detail: any) => ({
                        modelName: detail.modelName,
                        serialNumbers: detail.serialNumbers
                    })) || []
                }
            }
        })

        // Tax Logic
        let taxAmount = 0
        let storedTaxDetails = null

        if (taxDetails) {
            try {
                const parsedTaxes = JSON.parse(taxDetails)
                if (Array.isArray(parsedTaxes)) {
                    taxAmount = parsedTaxes.reduce((sum: number, tax: any) => sum + (Number(tax.amount) || 0), 0)
                    storedTaxDetails = taxDetails
                }
            } catch (e) {
                console.error('Failed to parse tax details', e)
            }
        }

        const totalAmount = subTotal + taxAmount

        // 5. Create Quote
        const quote = await prisma.cRMQuote.create({
            data: {
                quoteNumber: finalQuoteNumber,
                projectId,
                version,
                status: 'DRAFT',
                saleType: saleType || 'DIRECT',
                billToId: billToId || null,
                shipToId: shipToId || null,
                comment: comment || null,
                subTotal,
                taxAmount,
                taxDetails: storedTaxDetails,
                totalAmount,
                validUntil: validUntil ? new Date(validUntil) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
                terms: terms || 'Standard Terms Apply',
                createdById: user.id,
                items: {
                    create: quoteItems.map((item: any) => ({
                        ...item,
                        details: item.details
                    }))
                } as any
            },
            include: {
                items: {
                    include: {
                        details: true,
                        product: {
                            include: { serviceDefinition: true }
                        }
                    }
                } as any
            }
        })

        // Audit Log
        const { logCreate } = await import('@/lib/audit')
        await logCreate('CRM_QUOTE', quote.id, user.id, user.name, {
            quoteNumber: quote.quoteNumber,
            projectId: quote.projectId,
            totalAmount: quote.totalAmount,
            version: quote.version
        })

        return NextResponse.json(quote)

    } catch (error: any) {
        console.error('Failed to create quote:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to create quote' },
            { status: 500 }
        )
    }
}
