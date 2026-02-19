import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function POST(request: Request) {
    try {
        const user = await requireAuth()
        const body = await request.json()
        const { projectId, validUntil, items, terms, saleType, billToId, shipToId, taxDetails } = body

        if (!projectId) {
            return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
        }

        // 1. Get Project & Customer Logic
        const project = await prisma.cRMProject.findUnique({
            where: { id: projectId },
            include: { customer: true }
        })

        if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

        // 2. Generate Quote Number (Simulated Sequence)
        const dateStr = new Date().toISOString().slice(2, 7).replace('-', '')
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
        const quoteNumber = `QT-${dateStr}-${random}`

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
                quantity,
                unitPrice,
                discount,
                total: lineTotal
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
                quoteNumber,
                projectId,
                version,
                status: 'DRAFT',
                saleType: saleType || 'DIRECT',
                billToId: billToId || null,
                shipToId: shipToId || null,
                subTotal,
                taxAmount,
                taxDetails: storedTaxDetails,
                totalAmount,
                validUntil: validUntil ? new Date(validUntil) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
                terms: terms || 'Standard Terms Apply',
                createdById: user.id,
                items: {
                    create: quoteItems
                }
            },
            include: {
                items: true
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
