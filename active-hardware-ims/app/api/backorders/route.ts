import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET - List all backorder items
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status')
        const productId = searchParams.get('productId')
        const invoiceId = searchParams.get('invoiceId')

        const where: any = {}
        if (status) where.status = status
        if (productId) where.productId = productId
        if (invoiceId) where.invoiceId = invoiceId

        const backorders = await prisma.backorderItem.findMany({
            where,
            include: {
                product: true,
                invoice: {
                    select: {
                        invoiceNumber: true,
                        customerName: true,
                        createdAt: true
                    }
                },
                invoiceItem: true
            },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json(backorders)
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: 'Failed to fetch backorders' }, { status: 500 })
    }
}
