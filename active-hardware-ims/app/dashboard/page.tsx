"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Currency } from "@/components/Currency"
import {
    Package,
    AlertTriangle,
    Activity,
    DollarSign,
    TrendingUp,
    Clock,
    FileText,
    Users,
    Truck,
    Mail,
    ChevronRight,
    MessageSquare,
    CheckCircle2,
    User
} from "lucide-react"
import { formatDate, formatDateTime, cn } from "@/lib/utils"

type DashboardStats = {
    totalProducts: number
    totalInventory: number
    availableStock: number
    soldStock: number
    rmaStock: number
    totalStockValue: number
    totalCustomers: number
    totalDeliveryOrders: number
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
    pendingMessagesCount: number
    pendingMessages: Array<{
        id: string
        subject: string
        sender: string
        priority: string
        category: string
        deadline?: string
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

            if (!res.ok) throw new Error('Failed to fetch stats')

            const data = await res.json()
            // Basic validation to ensure data has required structure
            if (data && typeof data.totalProducts === 'number') {
                setStats(data)
            } else {
                console.error('Invalid stats data:', data)
            }
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
        {
            name: 'Total Customers',
            value: stats.totalCustomers.toString(),
            icon: Users,
            color: 'text-pink-600',
            bg: 'bg-pink-100',
            href: '/dashboard/customers'
        },
        {
            name: 'Delivery Orders',
            value: stats.totalDeliveryOrders.toString(),
            icon: Truck,
            color: 'text-teal-600',
            bg: 'bg-teal-100',
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
                                        <div className="text-lg font-medium text-gray-900">
                                            {stat.name === 'Stock Value' ? (
                                                <Currency amount={stats.totalStockValue} />
                                            ) : (
                                                stat.value
                                            )}
                                        </div>
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
                                            {formatDateTime(activity.date)}
                                        </p>
                                    </div>
                                    {activity.amount && (
                                        <Currency amount={activity.amount} className="text-sm font-semibold text-gray-900" />
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

                {/* Pending Messages Widget */}
                <div className="rounded-lg bg-white p-6 shadow col-span-full border border-gray-100">
                    <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-4">
                        <div className="flex items-center gap-2">
                            <Mail className="w-5 h-5 text-blue-600" />
                            <h3 className="text-lg font-bold text-gray-900 tracking-tight">Pending Messages & Tasks</h3>
                        </div>
                        <Link href="/dashboard/messaging" className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">
                            View Inbox <ChevronRight className="w-3.5 h-3.5 ml-1" />
                        </Link>
                    </div>

                    {stats.pendingMessages.length > 0 ? (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {stats.pendingMessages.map((msg) => (
                                <Link
                                    key={msg.id}
                                    href="/dashboard/messaging"
                                    className="flex flex-col p-4 border border-gray-100 rounded-xl hover:bg-white hover:border-blue-400 hover:shadow-lg transition-all group relative overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 p-1">
                                        <div className={cn(
                                            "w-1.5 h-1.5 rounded-full",
                                            msg.priority === 'URGENT' ? "bg-red-500 animate-pulse" :
                                                msg.priority === 'HIGH' ? "bg-orange-500" : "bg-blue-500"
                                        )} />
                                    </div>
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={cn(
                                            "px-1.5 py-0.5 rounded text-[10px] font-bold tracking-tight uppercase",
                                            msg.priority === 'URGENT' ? "bg-red-100 text-red-700" :
                                                msg.priority === 'HIGH' ? "bg-orange-100 text-orange-700" :
                                                    "bg-blue-100 text-blue-700"
                                        )}>
                                            {msg.priority}
                                        </span>
                                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{msg.category}</span>
                                    </div>
                                    <h4 className="text-sm font-bold text-gray-900 group-hover:text-blue-700 line-clamp-1 mb-1">{msg.subject}</h4>
                                    <p className="text-xs text-gray-500 mb-3 flex items-center font-medium">
                                        <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center mr-2">
                                            <User className="w-3 h-3 text-gray-400" />
                                        </div>
                                        From {msg.sender}
                                    </p>

                                    <div className="mt-auto pt-3 border-t border-gray-50 flex items-center justify-between">
                                        {msg.deadline ? (
                                            <span className="text-[10px] font-bold text-orange-600 flex items-center">
                                                <Clock className="w-3 h-3 mr-1" />
                                                Due: {new Date(msg.deadline).toLocaleDateString()}
                                            </span>
                                        ) : (
                                            <span className="text-[10px] text-gray-400 font-medium">No deadline</span>
                                        )}
                                        <span className="text-[10px] text-gray-400 italic font-medium">{formatDate(msg.date)}</span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                            <div className="p-4 bg-gray-50 rounded-full mb-3">
                                <MessageSquare className="w-8 h-8 opacity-20" />
                            </div>
                            <p className="text-sm font-bold text-gray-500">All caught up!</p>
                            <p className="text-xs text-gray-400 mt-1">No pending messages or tasks</p>
                        </div>
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
