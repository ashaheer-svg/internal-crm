import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { logCreate } from '@/lib/audit'
import { getNextSequence } from '@/lib/sequences'

export async function GET(request: Request) {
    try {
        await requireAuth() // Require authentication
        const { searchParams } = new URL(request.url)
        const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : null
        const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : null
        const search = searchParams.get('search')
        const sortKey = searchParams.get('sortKey') || 'createdAt'
        const sortDir = (searchParams.get('sortDir') as 'asc' | 'desc') || 'desc'

        const where: any = {}
        if (search) {
            where.OR = [
                { invoiceNumber: { contains: search, mode: 'insensitive' } },
                { customerName: { contains: search, mode: 'insensitive' } },
                { customerEmail: { contains: search, mode: 'insensitive' } },
                { notes: { contains: search, mode: 'insensitive' } },
            ]
        }

        const orderBy: any = {}
        if (sortKey === 'date') orderBy.createdAt = sortDir
        else if (sortKey === 'amount') orderBy.totalAmount = sortDir
        else orderBy[sortKey] = sortDir

        const include = {
            items: true,
            salesRep: true
        }

        if (page && limit) {
            const skip = (page - 1) * limit
            const [invoices, total] = await Promise.all([
                prisma.invoice.findMany({
                    where,
                    orderBy,
                    skip,
                    take: limit,
                    include
                }),
                prisma.invoice.count({ where })
            ])
            return NextResponse.json({
                invoices,
                meta: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit)
                }
            })
        }

        const invoices = await prisma.invoice.findMany({
            where,
            orderBy,
            include
        })
        return NextResponse.json(invoices)
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to fetch invoices' },
            { status: error.message === 'Unauthorized' ? 401 : 500 }
        )
    }
}

export async function POST(request: Request) {
    try {
        const user = await requireAuth() // Require authentication
        const body = await request.json()
        const { invoiceNumber, customerInvoiceRef, customerId, customerName, customerEmail, customerPhone, items, notes, salesRepId } = body

        if (!customerName || !items || items.length === 0) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const finalInvoiceNumber = invoiceNumber || await getNextSequence('INV', true)

        // Calculate total
        const totalAmount = items.reduce((sum: number, item: any) => sum + (item.unitPrice * (item.quantity || 1)), 0)

        // Check if any items are backorders
        const hasBackorders = items.some((item: any) => !item.inventoryItemId)

        // Start transaction to update inventory status and create invoice
        const invoice = await prisma.$transaction(async (tx) => {
            // Create invoice
            const newInvoice = await tx.invoice.create({
                data: {
                    invoiceNumber: finalInvoiceNumber,
                    customerInvoiceRef,
                    customerId,
                    customerName,
                    customerEmail,
                    customerPhone,
                    totalAmount,
                    status: 'ISSUED',
                    hasBackorders,
                    notes,
                    salesRepId: salesRepId || null,
                    items: {
                        create: items.map((item: any) => ({
                            inventoryItemId: item.inventoryItemId || null,
                            productId: item.productId,
                            productName: item.productName,
                            serialNumber: item.serialNumber || null,
                            unitPrice: item.unitPrice,
                            quantity: item.quantity || 1,
                            isFulfilled: !!item.inventoryItemId, // True if has inventory, false if backorder
                            fulfilledAt: item.inventoryItemId ? new Date() : null
                        }))
                    }
                },
                include: {
                    items: true
                }
            })

            // Process each item
            for (const item of items) {
                if (item.inventoryItemId) {
                    // Find or create 'Sold' location
                    let soldLocation = await tx.location.findFirst({ where: { name: 'Sold' } })
                    if (!soldLocation) {
                        soldLocation = await tx.location.create({
                            data: {
                                name: 'Sold',
                                address: 'Virtual',
                                type: 'VIRTUAL'
                            }
                        })
                    }

                    // Update inventory item to SOLD status and move to Sold location
                    await tx.inventoryItem.update({
                        where: { id: item.inventoryItemId },
                        data: {
                            status: 'SOLD',
                            locationId: soldLocation.id
                        }
                    })

                    // Create transaction log
                    await tx.transactionLog.create({
                        data: {
                            type: 'ISSUE',
                            referenceType: 'INVOICE',
                            referenceId: newInvoice.id,
                            productId: item.productId,
                            serialNumber: item.serialNumber,
                            quantity: 1,
                            unitCost: item.unitPrice,
                            notes: `Sold to ${customerName} - Invoice ${invoiceNumber}`
                        }
                    })
                } else {
                    // Create backorder item
                    const invoiceItem = newInvoice.items.find(
                        (i: any) => i.productId === item.productId && !i.inventoryItemId
                    )

                    if (invoiceItem) {
                        await tx.backorderItem.create({
                            data: {
                                invoiceId: newInvoice.id,
                                invoiceItemId: invoiceItem.id,
                                productId: item.productId,
                                quantityOrdered: item.quantity || 1,
                                quantityFulfilled: 0,
                                status: 'PENDING'
                            }
                        })

                        // Create transaction log for backorder
                        await tx.transactionLog.create({
                            data: {
                                type: 'ISSUE',
                                referenceType: 'INVOICE',
                                referenceId: newInvoice.id,
                                productId: item.productId,
                                quantity: item.quantity || 1,
                                notes: `Backorder for ${customerName} - Invoice ${invoiceNumber}`
                            }
                        })
                    }
                }
            }

            return newInvoice
        })

        // Log invoice creation
        await logCreate('INVOICE', invoice.id, user.id, user.name, {
            invoiceNumber: invoice.invoiceNumber,
            customerName: invoice.customerName,
            totalAmount: invoice.totalAmount,
            itemCount: invoice.items.length,
            hasBackorders: invoice.hasBackorders
        })

        return NextResponse.json(invoice)
    } catch (error: any) {
        console.error(error)
        return NextResponse.json(
            { error: error.message || 'Failed to create invoice' },
            { status: error.message === 'Unauthorized' ? 401 : 500 }
        )
    }
}
