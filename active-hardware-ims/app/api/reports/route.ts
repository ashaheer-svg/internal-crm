import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const type = searchParams.get('type')
        const startDate = searchParams.get('startDate')
        const endDate = searchParams.get('endDate')
        const locationId = searchParams.get('locationId')

        const dateFilter = startDate && endDate ? {
            createdAt: {
                gte: new Date(startDate),
                lte: new Date(endDate)
            }
        } : {}

        switch (type) {
            case 'inventory-valuation':
                return await generateInventoryValuationReport(locationId)

            case 'stock-movement':
                return await generateStockMovementReport(dateFilter)

            case 'sales':
                return await generateSalesReport(dateFilter)

            case 'purchase':
                return await generatePurchaseReport(dateFilter)

            case 'warranty':
                return await generateWarrantyReport(dateFilter)

            case 'location':
                return await generateLocationReport()

            case 'backorder':
                return await generateBackorderReport()

            case 'profitability':
                return await generateProfitabilityReport(dateFilter)

            default:
                return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })
        }
    } catch (error) {
        console.error('Failed to generate report:', error)
        return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
    }
}

async function generateInventoryValuationReport(locationId: string | null) {
    const where = locationId ? { locationId } : {}

    // Get ALL inventory items (not just AVAILABLE) for complete valuation
    const inventory = await prisma.inventoryItem.findMany({
        where,
        include: {
            product: true,
            location: true
        }
    })

    const reportData = inventory.reduce((acc: any[], item) => {
        const existing = acc.find(r => r.productId === item.productId && r.status === item.status)
        if (existing) {
            existing.quantity += 1
            existing.totalValue += item.unitCost
        } else {
            acc.push({
                productId: item.productId,
                sku: item.product.sku,
                name: item.product.name,
                brand: item.product.brand,
                category: item.product.category,
                model: item.product.model,
                status: item.status,
                quantity: 1,
                unitCost: item.unitCost,
                totalValue: item.unitCost,
                location: item.location.name
            })
        }
        return acc
    }, [])

    const grandTotal = reportData.reduce((sum, item) => sum + item.totalValue, 0)

    // Calculate status breakdown
    const availableCount = inventory.filter(i => i.status === 'AVAILABLE').length
    const soldCount = inventory.filter(i => i.status === 'SOLD').length
    const rmaCount = inventory.filter(i => i.status === 'RMA').length
    const reservedCount = inventory.filter(i => i.status === 'RESERVED').length

    return NextResponse.json({
        type: 'inventory-valuation',
        data: reportData,
        summary: {
            totalProducts: reportData.length,
            totalQuantity: reportData.reduce((sum, item) => sum + item.quantity, 0),
            grandTotal,
            availableCount,
            soldCount,
            rmaCount,
            reservedCount
        }
    })
}

async function generateStockMovementReport(dateFilter: any) {
    const grns = await prisma.goodsReceiptNote.findMany({
        where: dateFilter,
        include: {
            items: {
                include: {
                    product: true
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    })

    const invoices = await prisma.invoice.findMany({
        where: dateFilter,
        include: {
            items: {
                include: {
                    product: true
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    })

    const inward = grns.map(grn => ({
        date: grn.createdAt,
        type: 'INWARD',
        reference: grn.grnNumber,
        supplier: grn.supplier,
        quantity: (grn as any).items.reduce((sum: number, item: any) => sum + item.quantity, 0)
    }))

    const outward = invoices.map(inv => ({
        date: inv.createdAt,
        type: 'OUTWARD',
        reference: inv.invoiceNumber,
        customer: inv.customerName,
        quantity: (inv as any).items.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0)
    }))

    return NextResponse.json({
        type: 'stock-movement',
        data: [...inward, ...outward].sort((a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
        ),
        summary: {
            totalInward: inward.reduce((sum, item) => sum + item.quantity, 0),
            totalOutward: outward.reduce((sum, item) => sum + item.quantity, 0),
            netChange: inward.reduce((sum, item) => sum + item.quantity, 0) - outward.reduce((sum, item) => sum + item.quantity, 0)
        }
    })
}

async function generateSalesReport(dateFilter: any) {
    const invoices = await prisma.invoice.findMany({
        where: dateFilter,
        include: {
            items: {
                include: {
                    product: true
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    })

    const reportData = invoices.map(inv => ({
        invoiceNumber: inv.invoiceNumber,
        date: inv.createdAt,
        customer: inv.customerName,
        items: (inv as any).items.length,
        totalAmount: inv.totalAmount,
        status: inv.status
    }))

    return NextResponse.json({
        type: 'sales',
        data: reportData,
        summary: {
            totalInvoices: invoices.length,
            totalItems: invoices.reduce((sum, inv) => sum + (inv as any).items.length, 0),
            totalRevenue: invoices.reduce((sum, inv) => sum + inv.totalAmount, 0)
        }
    })
}

async function generatePurchaseReport(dateFilter: any) {
    const purchaseOrders = await prisma.purchaseOrder.findMany({
        where: dateFilter,
        include: {
            items: true
        },
        orderBy: { createdAt: 'desc' }
    })

    const reportData = purchaseOrders.map(po => ({
        poNumber: po.poNumber,
        date: po.createdAt,
        supplier: po.supplier,
        items: po.items.length,
        totalAmount: po.totalAmount,
        status: po.status
    }))

    return NextResponse.json({
        type: 'purchase',
        data: reportData,
        summary: {
            totalPOs: purchaseOrders.length,
            totalItems: purchaseOrders.reduce((sum, po) => sum + po.items.length, 0),
            totalAmount: purchaseOrders.reduce((sum, po) => sum + po.totalAmount, 0)
        }
    })
}

async function generateWarrantyReport(dateFilter: any) {
    const claims = await prisma.warrantyClaim.findMany({
        where: dateFilter,
        include: {
            inventoryItem: {
                include: {
                    product: true
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    })

    const reportData = claims.map(claim => ({
        id: claim.id,
        date: claim.createdAt,
        customer: claim.customerName,
        product: `${claim.inventoryItem.product.brand} ${claim.inventoryItem.product.name} (${claim.inventoryItem.product.category})`,
        serialNumber: claim.inventoryItem.serialNumber,
        status: claim.status,
        description: claim.description
    }))

    const pendingCount = claims.filter(c => c.status === 'PENDING').length
    const sentToVendorCount = claims.filter(c => c.status === 'SENT_TO_VENDOR').length
    const repairedCount = claims.filter(c => c.status === 'REPAIRED').length
    const returnedCount = claims.filter(c => c.status === 'RETURNED').length

    return NextResponse.json({
        type: 'warranty',
        data: reportData,
        summary: {
            totalClaims: claims.length,
            pendingCount,
            sentToVendorCount,
            repairedCount,
            returnedCount
        }
    })
}

async function generateLocationReport() {
    const locations = await prisma.location.findMany({
        include: {
            inventory: {
                where: { status: 'AVAILABLE' },
                include: {
                    product: true
                }
            }
        }
    })

    const reportData = locations.map(loc => {
        const totalValue = loc.inventory.reduce((sum, item) => sum + item.unitCost, 0)
        const uniqueProducts = new Set(loc.inventory.map(item => item.productId)).size

        return {
            locationId: loc.id,
            locationName: loc.name,
            itemCount: loc.inventory.length,
            uniqueProducts,
            totalValue
        }
    })

    return NextResponse.json({
        type: 'location',
        data: reportData,
        summary: {
            totalLocations: locations.length,
            totalItems: reportData.reduce((sum, loc) => sum + loc.itemCount, 0),
            totalValue: reportData.reduce((sum, loc) => sum + loc.totalValue, 0)
        }
    })
}

async function generateBackorderReport() {
    const backorders = await prisma.backorderItem.findMany({
        where: {
            status: { in: ['PENDING', 'PARTIAL'] }
        },
        include: {
            product: true,
            invoice: {
                select: {
                    invoiceNumber: true,
                    customerName: true,
                    createdAt: true
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    })

    const reportData = backorders.map(backorder => ({
        id: backorder.id,
        invoiceNumber: backorder.invoice.invoiceNumber,
        customer: backorder.invoice.customerName,
        orderDate: backorder.invoice.createdAt,
        productSKU: backorder.product.sku,
        productName: `${backorder.product.brand} ${backorder.product.name} (${backorder.product.category})`,
        quantityOrdered: backorder.quantityOrdered,
        quantityFulfilled: backorder.quantityFulfilled,
        quantityPending: backorder.quantityOrdered - backorder.quantityFulfilled,
        status: backorder.status
    }))

    const totalPending = reportData.reduce((sum, item) => sum + item.quantityPending, 0)
    const totalOrdered = reportData.reduce((sum, item) => sum + item.quantityOrdered, 0)
    const totalFulfilled = reportData.reduce((sum, item) => sum + item.quantityFulfilled, 0)

    return NextResponse.json({
        type: 'backorder',
        data: reportData,
        summary: {
            totalBackorders: backorders.length,
            totalOrdered,
            totalFulfilled,
            totalPending
        }
    })
}

import { requireRole } from '@/lib/auth'

async function generateProfitabilityReport(dateFilter: any) {
    // 1. Enforce Admin Role
    try {
        await requireRole(['ADMIN'])
    } catch (error) {
        return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 })
    }

    // 2. Fetch Delivery Orders with Items and Allocated Inventory (for COGS)
    const deliveryOrders = await prisma.deliveryOrder.findMany({
        where: {
            ...dateFilter,
            status: { in: ['COMPLETED', 'CONFIRMED'] } // Only include confirmed/completed orders
        },
        include: {
            items: {
                include: {
                    product: true,
                    reservedItems: true // Allocated inventory items (source of true cost)
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    })

    // 3. Process Data
    const reportData: any[] = []

    for (const order of deliveryOrders) {
        for (const item of order.items) {
            // Calculate COGS from allocated items
            // If no items allocated (e.g. unallocated order), allow fallback to 0 or standard cost if we had it
            // For now, specialized strict COGS: sum of unitCost of all reserved items
            const totalCost = item.reservedItems.reduce((sum: number, inv: any) => sum + inv.unitCost, 0)

            // If quantity > reservedItems (partial allocation), we might miss some cost data.
            // We could estimate using the average of reserved items for the remainder,
            // but strict accounting prefers actuals.
            // We will report what we know.

            const totalRevenue = item.unitPrice * item.quantity
            const grossProfit = totalRevenue - totalCost
            const margin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0

            reportData.push({
                orderDate: order.createdAt,
                orderNumber: order.orderNumber,
                customer: order.customerName,
                product: `${item.product.brand} ${item.product.model}`,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalRevenue,
                totalCost,
                grossProfit,
                margin: parseFloat(margin.toFixed(1)) + '%'
            })
        }
    }

    // 4. Summaries
    const totalRevenue = reportData.reduce((sum, item) => sum + item.totalRevenue, 0)
    const totalCost = reportData.reduce((sum, item) => sum + item.totalCost, 0)
    const totalProfit = totalRevenue - totalCost
    const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0

    return NextResponse.json({
        type: 'profitability',
        data: reportData,
        summary: {
            totalRevenue,
            totalCost,
            totalProfit,
            avgMargin: parseFloat(avgMargin.toFixed(1)) + '%'
        }
    })
}
