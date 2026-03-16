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
                    deliveryOrder: {
                        status: 'CONFIRMED', // "approved DO"
                    },
                    ...(productId ? { productId } : {})
                },
                include: {
                    product: true,
                    deliveryOrder: true,
                    reservedItems: true
                }
            })

            const shortfallItems = doItems.filter((item: any) => {
                const fulfilled = item.quantityFulfilled ?? item.reservedItems.length
                return fulfilled < item.quantity // Shortfall!
            })

            doBackorders = shortfallItems.map((item: any) => {
                const fulfilled = item.quantityFulfilled ?? item.reservedItems.length

                return {
                    id: item.id,
                    productId: item.productId,
                    quantityOrdered: item.quantity,
                    quantityFulfilled: fulfilled,
                    status: fulfilled === 0 ? 'PENDING' : 'PARTIAL',
                    createdAt: item.createdAt,
                    product: item.product,
                    invoice: { // Map DO details to "invoice" shape for UI compatibility
                        id: item.deliveryOrder.id, 
                        invoiceNumber: item.deliveryOrder.orderNumber,
                        customerName: item.deliveryOrder.customerName,
                        customerId: item.deliveryOrder.customerId, 
                        createdAt: item.deliveryOrder.createdAt
                    },
                    type: 'DELIVERY_ORDER'
                }
            })
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
