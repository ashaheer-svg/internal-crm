import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(req: Request) {
    try {
        await requirePermission('settings:manage')

        const { data } = await req.json()

        if (!data || !Array.isArray(data)) {
            return NextResponse.json({ error: 'Invalid data format. Expected an array of orders.' }, { status: 400 })
        }

        // 1. Ensure "Sold" location exists
        let soldLocation = await prisma.location.findFirst({
            where: { name: 'Sold', type: 'VIRTUAL' }
        })

        if (!soldLocation) {
            soldLocation = await prisma.location.create({
                data: {
                    name: 'Sold',
                    address: 'Virtual Location',
                    type: 'VIRTUAL'
                }
            })
        }

        const results = {
            ordersCreated: 0,
            itemsCreated: 0,
            errors: 0
        }

        await prisma.$transaction(async (tx) => {
            for (const orderData of data) {
                try {
                    // Find or create customer
                    let customer = await tx.customer.findFirst({
                        where: { name: orderData.customerName }
                    })

                    if (!customer) {
                        customer = await tx.customer.create({
                            data: {
                                name: orderData.customerName,
                                isCustomer: true
                            }
                        })
                    }

                    // Find or create end customer
                    let endCustomer = null
                    if (orderData.endCustomerName) {
                        endCustomer = await tx.customer.findFirst({
                            where: { name: orderData.endCustomerName }
                        })
                        if (!endCustomer) {
                            endCustomer = await tx.customer.create({
                                data: {
                                    name: orderData.endCustomerName,
                                    isCustomer: true
                                }
                            })
                        }
                    }

                    // Find or create sales rep
                    let salesRep = null
                    if (orderData.salesRepName) {
                        salesRep = await tx.salesRep.findFirst({
                            where: { name: orderData.salesRepName }
                        })
                        if (!salesRep) {
                            salesRep = await tx.salesRep.create({
                                data: { name: orderData.salesRepName }
                            })
                        }
                    }

                    // Create Delivery Order
                    const deliveryOrder = await tx.deliveryOrder.create({
                        data: {
                            orderNumber: orderData.orderNumber,
                            customerId: customer.id,
                            customerName: customer.name,
                            endCustomerId: endCustomer?.id,
                            endCustomerName: endCustomer?.name,
                            salesRepId: salesRep?.id,
                            invoiceNumber: orderData.invoiceNumber,
                            invoiceValue: orderData.invoiceValue || 0,
                            status: 'COMPLETED',
                            createdAt: orderData.date ? new Date(orderData.date) : new Date(),
                            updatedAt: orderData.date ? new Date(orderData.date) : new Date(),
                        }
                    })

                    // Process items
                    if (orderData.items && Array.isArray(orderData.items)) {
                        for (const item of orderData.items) {
                            // Find product
                            const product = await tx.product.findUnique({
                                where: { sku: item.sku }
                            })

                            if (!product) {
                                throw new Error(`Product with SKU ${item.sku} not found. Please create the product first.`)
                            }

                            // Create Delivery Order Item
                            const doItem = await tx.deliveryOrderItem.create({
                                data: {
                                    deliveryOrderId: deliveryOrder.id,
                                    productId: product.id,
                                    quantity: item.quantity || 1,
                                    quantityFulfilled: item.quantity || 1,
                                    unitPrice: item.sellingPrice || 0,
                                    createdAt: deliveryOrder.createdAt
                                }
                            })

                            // Create Sold Inventory Item
                            if (item.serialNumber) {
                                await tx.inventoryItem.create({
                                    data: {
                                        serialNumber: item.serialNumber,
                                        productId: product.id,
                                        locationId: soldLocation!.id,
                                        status: 'SOLD',
                                        unitCost: item.unitCost || 0,
                                        deliveryOrderItemId: doItem.id,
                                        createdAt: deliveryOrder.createdAt
                                    }
                                })

                                // Create Transaction Log
                                await tx.transactionLog.create({
                                    data: {
                                        type: 'ISSUE',
                                        referenceType: 'DELIVERY_ORDER',
                                        referenceId: deliveryOrder.id,
                                        productId: product.id,
                                        serialNumber: item.serialNumber,
                                        quantity: 1,
                                        toLocation: 'Sold',
                                        unitCost: item.unitCost || 0,
                                        createdAt: deliveryOrder.createdAt
                                    }
                                })
                            }

                            results.itemsCreated++
                        }
                    }

                    results.ordersCreated++
                } catch (err: any) {
                    console.error(`Failed to import legacy order ${orderData.orderNumber}:`, err)
                    throw err // Rollback transaction on any error for data integrity
                }
            }
        })

        return NextResponse.json({
            success: true,
            message: `Legacy import complete. Created ${results.ordersCreated} orders and ${results.itemsCreated} items.`,
            details: results
        })
    } catch (error: any) {
        console.error('Legacy import error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to import legacy data' },
            { status: 500 }
        )
    }
}
