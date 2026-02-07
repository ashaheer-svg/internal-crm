"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
    Package,
    AlertTriangle,
    Activity,
    DollarSign,
    TrendingUp,
    Clock,
    FileText
} from "lucide-react"

type DashboardStats = {
    totalProducts: number
    totalInventory: number
    availableStock: number
    soldStock: number
    rmaStock: number
    totalStockValue: number
    pendingWarrantyClaims: number
    lowStockCount: number
    lowStockProducts: Array<{
        id: string
        name: string
        brand: string
        sku: string
        availableCount: number
    }>
    recentActivity: Array<{
        id: string
        type: string
        description: string
        amount?: number
        date: string
    }>
}

export default function DashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchStats()
    }, [])

    async function fetchStats() {
        try {
            const res = await fetch('/api/dashboard/stats')
            const data = await res.json()
            setStats(data)
        } catch (error) {
            console.error('Failed to fetch stats:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <p className="text-gray-500">Loading dashboard...</p>
            </div>
        )
    }

    if (!stats) {
        return (
            <div className="flex justify-center items-center h-64">
                <p className="text-gray-500">Failed to load dashboard data</p>
            </div>
        )
    }

    const statCards = [
        {
            name: 'Total Products',
            value: stats.totalProducts.toString(),
            icon: Package,
            color: 'text-blue-600',
            bg: 'bg-blue-100',
            href: '/dashboard/inventory'
        },
        {
            name: 'Available Stock',
            value: stats.availableStock.toString(),
            icon: TrendingUp,
            color: 'text-green-600',
            bg: 'bg-green-100',
            href: '/dashboard/inventory'
        },
        {
            name: 'Stock Value',
            value: `Rs. ${stats.totalStockValue.toLocaleString()}`,
            icon: DollarSign,
            color: 'text-purple-600',
            bg: 'bg-purple-100',
            href: '/dashboard/reports'
        },
        {
            name: 'Pending RMAs',
            value: stats.pendingWarrantyClaims.toString(),
            icon: Activity,
            color: 'text-orange-600',
            bg: 'bg-orange-100',
            href: '/dashboard/warranty'
        },
        {
            name: 'Low Stock Items',
            value: stats.lowStockCount.toString(),
            icon: AlertTriangle,
            color: 'text-red-600',
            bg: 'bg-red-100',
            href: '#low-stock'
        },
        {
            name: 'Sold Items',
            value: stats.soldStock.toString(),
            icon: FileText,
            color: 'text-indigo-600',
            bg: 'bg-indigo-100',
            href: '/dashboard/transactions'
        },
    ]

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Dashboard Overview</h1>
                    <p className="mt-1 text-sm text-gray-500">Real-time inventory and business metrics</p>
                </div>
                <Link
                    href="/dashboard/reports"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                    <FileText className="w-4 h-4 mr-2" />
                    View Reports
                </Link>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {statCards.map((stat) => (
                    <Link
                        key={stat.name}
                        href={stat.href}
                        className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow hover:shadow-md transition-shadow sm:p-6"
                    >
                        <div className="flex items-center">
                            <div className={`flex-shrink-0 rounded-md ${stat.bg} p-3`}>
                                <stat.icon className={`h-6 w-6 ${stat.color}`} aria-hidden="true" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="truncate text-sm font-medium text-gray-500">{stat.name}</dt>
                                    <dd>
                                        <div className="text-lg font-medium text-gray-900">{stat.value}</div>
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Recent Activity */}
                <div className="rounded-lg bg-white p-6 shadow">
                    <div className="flex items-center gap-2 mb-4">
                        <Clock className="w-5 h-5 text-gray-400" />
                        <h3 className="text-lg font-medium leading-6 text-gray-900">Recent Activity</h3>
                    </div>
                    {stats.recentActivity.length > 0 ? (
                        <div className="space-y-3">
                            {stats.recentActivity.map((activity) => (
                                <div key={activity.id} className="flex items-start justify-between border-b pb-3 last:border-b-0">
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {new Date(activity.date).toLocaleString()}
                                        </p>
                                    </div>
                                    {activity.amount && (
                                        <span className="text-sm font-semibold text-gray-900">
                                            Rs. {activity.amount.toLocaleString()}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-sm text-gray-500">No recent activity</div>
                    )}
                </div>

                {/* Low Stock Alerts */}
                <div id="low-stock" className="rounded-lg bg-white p-6 shadow">
                    <div className="flex items-center gap-2 mb-4">
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                        <h3 className="text-lg font-medium leading-6 text-gray-900">Low Stock Alerts</h3>
                    </div>
                    {stats.lowStockProducts.length > 0 ? (
                        <div className="space-y-3">
                            {stats.lowStockProducts.slice(0, 5).map((product) => (
                                <Link
                                    key={product.id}
                                    href={`/dashboard/inventory/${product.id}`}
                                    className="flex items-center justify-between border-b pb-3 last:border-b-0 hover:bg-gray-50 -mx-2 px-2 py-2 rounded"
                                >
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">
                                            {product.brand} {product.name}
                                        </p>
                                        <p className="text-xs text-gray-500">SKU: {product.sku}</p>
                                    </div>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                        {product.availableCount} left
                                    </span>
                                </Link>
                            ))}
                            {stats.lowStockProducts.length > 5 && (
                                <Link
                                    href="/dashboard/inventory"
                                    className="text-sm text-blue-600 hover:text-blue-800 block mt-2"
                                >
                                    View all {stats.lowStockProducts.length} low stock items →
                                </Link>
                            )}
                        </div>
                    ) : (
                        <div className="text-sm text-gray-500">No low stock alerts</div>
                    )}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="rounded-lg bg-white p-6 shadow">
                <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Quick Actions</h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Link
                        href="/dashboard/stock-movements/grn/new"
                        className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                        Receive Stock
                    </Link>
                    <Link
                        href="/dashboard/transactions/invoices/new"
                        className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                        Create Invoice
                    </Link>
                    <Link
                        href="/dashboard/warranty/new"
                        className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                        New RMA Claim
                    </Link>
                    <Link
                        href="/dashboard/inventory"
                        className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                        View Inventory
                    </Link>
                </div>
            </div>
        </div>
    )
}
