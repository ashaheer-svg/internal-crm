import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(request: Request) {
    try {
        await requireAuth()
        const { searchParams } = new URL(request.url)
        const number = searchParams.get('number')?.trim()
        
        if (!number) {
            return NextResponse.json({ error: 'Invoice number required' }, { status: 400 })
        }

        // We will collect items from multiple possible sources (Invoice table + DeliveryOrder table)
        // since one invoice number might span multiple partial orders.
        
        // 1. Fetch from Invoice Table
        const invoices = await prisma.invoice.findMany({
            where: {
                OR: [
                    { invoiceNumber: number },
                    { customerInvoiceRef: number }
                ]
            },
            include: {
                items: { include: { product: true } },
                salesRep: true
            }
        })

        // 2. Fetch from DeliveryOrder Table (matching against invoiceNumber field)
        const deliveryOrders = await prisma.deliveryOrder.findMany({
            where: {
                OR: [
                    { invoiceNumber: number },
                    { orderNumber: number },
                    { invoiceNumber: { contains: number.replace(/\s/g, '') } }
                ]
            },
            include: {
                items: { 
                    include: { 
                        product: true,
                        reservedItems: true,
                        details: true
                    } 
                },
                salesRep: true,
                customer: true
            }
        })

        if (invoices.length === 0 && deliveryOrders.length === 0) {
            return NextResponse.json({ error: 'No records found for this invoice number' }, { status: 404 })
        }

        // Aggregate Data
        // Use properties from the first found record as "Header" info
        const mainSource = invoices[0] || deliveryOrders[0]
        
        // Use a Set or Map to prevent duplicate items if they appear in both tables
        // (though in this schema they shouldn't usually duplicate items)
        const allItems: any[] = []
        const seenItemIds = new Set<string>()

        // Add items from Invoice records
        invoices.forEach(inv => {
            inv.items.forEach(item => {
                allItems.push({
                    id: item.id,
                    productName: item.productName,
                    product: item.product,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    serialNumber: item.serialNumber,
                    isFulfilled: item.isFulfilled,
                    source: `INV ${inv.invoiceNumber}`
                })
            })
        })

        // Add items from DeliveryOrder records
        deliveryOrders.forEach(do_rec => {
            do_rec.items.forEach(item => {
                // To avoid duplication if the DO was actually converted to an INV record,
                // we'd ideally check IDs, but since they are different tables, we'll just check
                // if we already have this product/qty combo from a similar source.
                // For simplicity, we'll list them all but label them.
                
                // Aggregate serial numbers from reservedItems or details
                let serials = null;
                if ((item as any).reservedItems && (item as any).reservedItems.length > 0) {
                    serials = (item as any).reservedItems.map((ri: any) => ri.serialNumber).join(', ');
                } else if ((item as any).details && (item as any).details.length > 0) {
                    serials = (item as any).details.map((d: any) => d.serialNumbers).join(', ');
                }

                allItems.push({
                    id: item.id,
                    productName: item.product.name,
                    product: item.product,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    serialNumber: serials, 
                    isFulfilled: true,
                    source: `${do_rec.orderNumber}`
                })
            })
        })

        const invoiceTotal = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0)
        const orderTotal = deliveryOrders.reduce((sum, d) => sum + d.totalAmount, 0)

        const aggregatedResult = {
            invoiceNumber: number,
            customerName: (mainSource as any).customerName || (mainSource as any).customer?.name || 'N/A',
            totalAmount: invoiceTotal > 0 ? invoiceTotal : orderTotal,
            status: mainSource.status,
            createdAt: mainSource.createdAt,
            salesRep: mainSource.salesRep,
            customerInvoiceRef: (mainSource as any).customerInvoiceRef || (mainSource as any).invoiceNumber,
            items: allItems,
            meta: {
                invoiceCount: invoices.length,
                orderCount: deliveryOrders.length,
                invoiceTotal,
                orderTotal
            }
        }

        return NextResponse.json(aggregatedResult)
    } catch (error) {
        console.error('Invoice aggregation error:', error)
        return NextResponse.json({ 
            error: 'Failed to aggregate invoice details',
            details: error instanceof Error ? error.message : 'Unknown'
        }, { status: 500 })
    }
}