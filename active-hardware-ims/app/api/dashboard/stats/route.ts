import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
    try {
        // Get total products count
        const totalProducts = await prisma.product.count()

        // Get inventory statistics
        const totalInventory = await prisma.inventoryItem.count()
        const availableStock = await prisma.inventoryItem.count({
            where: { status: 'AVAILABLE' }
        })
        const soldStock = await prisma.inventoryItem.count({
            where: { status: 'SOLD' }
        })
        const rmaStock = await prisma.inventoryItem.count({
            where: { status: 'RMA' }
        })

        // Calculate total stock value
        const inventoryItems = await prisma.inventoryItem.findMany({
            where: { status: 'AVAILABLE' },
            select: { unitCost: true }
        })
        const totalStockValue = inventoryItems.reduce((sum, item) => sum + item.unitCost, 0)

        // Get warranty claims count
        const pendingWarrantyClaims = await prisma.warrantyClaim.count({
            where: {
                status: {
                    in: ['PENDING', 'SENT_TO_VENDOR', 'REPAIRED']
                }
            }
        })

        // Get low stock products (less than 5 available units)
        const productsWithStock = await prisma.product.findMany({
            include: {
                _count: {
                    select: {
                        inventory: {
                            where: { status: 'AVAILABLE' }
                        }
                    }
                }
            }
        })
        const lowStockProducts = productsWithStock.filter(p => p._count.inventory < 5 && p._count.inventory > 0)

        // Get recent transactions (last 10 invoices)
        const recentInvoices = await prisma.invoice.findMany({
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: {
                items: true
            }
        })

        // Get recent GRNs
        const recentGRNs = await prisma.goodsReceiptNote.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json({
            totalProducts,
            totalInventory,
            availableStock,
            soldStock,
            rmaStock,
            totalStockValue,
            pendingWarrantyClaims,
            lowStockCount: lowStockProducts.length,
            lowStockProducts: lowStockProducts.map(p => ({
                id: p.id,
                name: p.name,
                brand: p.brand,
                category: p.category,
                sku: p.sku,
                availableCount: p._count.inventory
            })),
            recentActivity: [
                ...recentInvoices.map(inv => ({
                    id: inv.id,
                    type: 'INVOICE',
                    description: `Invoice ${inv.invoiceNumber} - ${inv.customerName}`,
                    amount: inv.totalAmount,
                    date: inv.createdAt
                })),
                ...recentGRNs.map(grn => ({
                    id: grn.id,
                    type: 'GRN',
                    description: `GRN ${grn.grnNumber} - ${grn.supplier}`,
                    date: grn.createdAt
                }))
            ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10)
        })
    } catch (error) {
        console.error('Failed to fetch dashboard stats:', error)
        // Return default values instead of error to prevent frontend crash
        return NextResponse.json({
            totalProducts: 0,
            totalInventory: 0,
            availableStock: 0,
            soldStock: 0,
            rmaStock: 0,
            totalStockValue: 0,
            pendingWarrantyClaims: 0,
            lowStockCount: 0,
            lowStockProducts: [],
            recentActivity: []
        })
    }
}
