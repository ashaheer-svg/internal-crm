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
                        customerId: true, // Add customerId
                        createdAt: true
                    }
                },
                invoiceItem: true
            },
            orderBy: { createdAt: 'desc' }
        })

        // ALSO fetch DeliveryOrder items that are backorders
        // Only if we are looking for PENDING/PARTIAL status
        let doBackorders: any[] = []
        if (!status || status === 'PENDING' || status === 'PARTIAL') {
            const doItems = await prisma.deliveryOrderItem.findMany({
                where: {
                    isBackorder: true,
                    deliveryOrder: {
                        status: { in: ['DRAFT', 'CONFIRMED'] }, // Still active/pending
                        ...(invoiceId ? {} : {}) // DOs don't filter by invoiceId easily here unless we add logic, skipping for now
                    },
                    ...(productId ? { productId } : {})
                },
                include: {
                    product: true,
                    deliveryOrder: true,
                    reservedItems: true
                }
            })

            doBackorders = doItems.map(item => ({
                id: item.id,
                productId: item.productId,
                quantityOrdered: item.quantity,
                quantityFulfilled: item.reservedItems.length,
                status: item.reservedItems.length >= item.quantity ? 'FULFILLED' : 'PENDING',
                createdAt: item.createdAt,
                product: item.product,
                invoice: { // Map DO details to "invoice" shape for UI compatibility
                    id: item.deliveryOrder.id, // Link to DO details instead
                    invoiceNumber: item.deliveryOrder.orderNumber,
                    customerName: item.deliveryOrder.customerName,
                    customerId: item.deliveryOrder.customerId, // Add customerId
                    createdAt: item.deliveryOrder.createdAt
                },
                // Add a flag to distinguish type if needed, but UI uses invoice object
                type: 'DELIVERY_ORDER'
            }))
        }

        // Combine and sort
        const combined = [...backorders, ...doBackorders].sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )

        return NextResponse.json(combined)
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: 'Failed to fetch backorders' }, { status: 500 })
    }
}
