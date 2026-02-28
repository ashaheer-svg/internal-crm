import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET() {
    try {
        const user = await requireAuth()

        // Run all independent queries in parallel for performance
        const [
            totalProducts,
            totalInventory,
            availableStock,
            soldStock,
            rmaStock,
            totalCustomers,
            totalDeliveryOrders,
            inventoryItems,
            pendingWarrantyClaims,
            productsWithStock,
            recentInvoices,
            recentGRNs,
            pendingMessagesCount,
            pendingMessages,
        ] = await Promise.all([
            prisma.product.count({ where: { isActive: true } }),
            prisma.inventoryItem.count(),
            prisma.inventoryItem.count({ where: { status: 'AVAILABLE' } }),
            prisma.inventoryItem.count({ where: { status: 'SOLD' } }),
            prisma.inventoryItem.count({ where: { status: 'RMA' } }),
            prisma.customer.count({ where: { isActive: true } }),
            // Only count active (non-trashed) orders
            prisma.deliveryOrder.count({ where: { isActive: true } }),
            // For total stock value calculation
            prisma.inventoryItem.findMany({
                where: { status: 'AVAILABLE' },
                select: { unitCost: true }
            }),
            prisma.warrantyClaim.count({
                where: { status: { in: ['PENDING', 'SENT_TO_VENDOR', 'REPAIRED'] } }
            }),
            // Load products with their stock count AND minStock for proper low-stock detection
            prisma.product.findMany({
                where: { isActive: true, minStock: { gt: 0 } },
                select: {
                    id: true, name: true, brand: true, sku: true, minStock: true,
                    _count: { select: { inventory: { where: { status: 'AVAILABLE' } } } }
                }
            }),
            prisma.invoice.findMany({
                take: 10,
                orderBy: { createdAt: 'desc' },
                select: { id: true, invoiceNumber: true, customerName: true, totalAmount: true, createdAt: true }
            }),
            prisma.goodsReceiptNote.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                select: { id: true, grnNumber: true, supplier: true, createdAt: true }
            }),
            prisma.messageReceipt.count({ where: { userId: user.id, isDone: false } }),
            prisma.message.findMany({
                where: { receipts: { some: { userId: user.id, isDone: false } } },
                take: 5,
                include: { sender: { select: { name: true } } },
                orderBy: { createdAt: 'desc' }
            }),
        ])

        const totalStockValue = inventoryItems.reduce((sum, item) => sum + item.unitCost, 0)

        // Use per-product minStock threshold instead of hardcoded 5
        const lowStockProducts = productsWithStock.filter(
            p => p._count.inventory < (p.minStock ?? 5) && p._count.inventory >= 0
        )

        const recentActivity = [
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

        return NextResponse.json({
            totalProducts,
            totalInventory,
            availableStock,
            soldStock,
            rmaStock,
            totalStockValue,
            totalCustomers,
            totalDeliveryOrders,
            pendingWarrantyClaims,
            lowStockCount: lowStockProducts.length,
            lowStockProducts: lowStockProducts.map(p => ({
                id: p.id,
                name: p.name,
                brand: p.brand,
                sku: p.sku,
                availableCount: p._count.inventory,
                minStock: p.minStock
            })),
            recentActivity,
            pendingMessagesCount,
            pendingMessages: pendingMessages.map(m => ({
                id: m.id,
                subject: m.subject,
                sender: m.sender.name,
                priority: m.priority,
                category: m.category,
                deadline: m.deadline,
                date: m.createdAt
            }))
        })
    } catch (error: any) {
        if (error.message === 'Unauthorized' || error.message === 'Account is inactive') {
            return new NextResponse('Unauthorized', { status: 401 })
        }
        console.error('Failed to fetch dashboard stats:', error)
        // Return structured error so the frontend can show a meaningful state
        return NextResponse.json({ error: true, message: 'Failed to load dashboard data' }, { status: 500 })
    }
}
