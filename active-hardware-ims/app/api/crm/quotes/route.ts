import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function POST(request: Request) {
    try {
        const user = await requireAuth()
        const body = await request.json()
        const { projectId, validUntil, items, terms, saleType, billToId, shipToId } = body

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
            const lineTotal = item.quantity * item.unitPrice
            subTotal += lineTotal
            return {
                order: index,
                productId: item.productId || null,
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                total: lineTotal
            }
        })

        // Simple Tax Logic (Can be enhanced later)
        const taxRate = 0.18 // Example 18% GST
        const taxAmount = subTotal * taxRate
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

        return NextResponse.json(quote)

    } catch (error: any) {
        console.error('Failed to create quote:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to create quote' },
            { status: 500 }
        )
    }
}
