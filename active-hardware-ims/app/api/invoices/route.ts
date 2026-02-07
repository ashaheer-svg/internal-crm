import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
    try {
        const invoices = await prisma.invoice.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                items: true
            }
        })
        return NextResponse.json(invoices)
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { invoiceNumber, customerName, customerEmail, customerPhone, items, notes } = body

        if (!invoiceNumber || !customerName || !items || items.length === 0) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Calculate total
        const totalAmount = items.reduce((sum: number, item: any) => sum + item.unitPrice, 0)

        // Start transaction to update inventory status and create invoice
        const invoice = await prisma.$transaction(async (tx) => {
            // Create invoice
            const newInvoice = await tx.invoice.create({
                data: {
                    invoiceNumber,
                    customerName,
                    customerEmail,
                    customerPhone,
                    totalAmount,
                    status: 'ISSUED',
                    notes,
                    items: {
                        create: items.map((item: any) => ({
                            inventoryItemId: item.inventoryItemId,
                            productName: item.productName,
                            serialNumber: item.serialNumber,
                            unitPrice: item.unitPrice
                        }))
                    }
                },
                include: {
                    items: true
                }
            })

            // Update inventory items to SOLD status
            for (const item of items) {
                await tx.inventoryItem.update({
                    where: { id: item.inventoryItemId },
                    data: { status: 'SOLD' }
                })
            }

            // Create transaction log
            for (const item of items) {
                await tx.transactionLog.create({
                    data: {
                        type: 'ISSUE',
                        referenceType: 'INVOICE',
                        referenceId: newInvoice.id,
                        serialNumber: item.serialNumber,
                        quantity: 1,
                        unitCost: item.unitPrice,
                        notes: `Sold to ${customerName} - Invoice ${invoiceNumber}`
                    }
                })
            }

            return newInvoice
        })

        return NextResponse.json(invoice)
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 })
    }
}
