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
    User,
    BarChart2,
    ShieldCheck,
    Layers
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

// ── Permission helpers ────────────────────────────────────────────────────────

function hasPermission(permissions: string[], required: string | null): boolean {
    if (!required) return true // no restriction = always show
    if (permissions.includes('all:manage')) return true
    return permissions.includes(required)
}

// ── Card definitions with required permission ─────────────────────────────────

function buildStatCards(stats: DashboardStats) {
    return [
        {
            name: 'Total Products',
            value: stats.totalProducts.toString(),
            icon: Package,
            color: 'text-blue-600',
            bg: 'bg-blue-100',
            href: '/dashboard/inventory',
            permission: 'inventory:read'
        },
        {
            name: 'Available Stock',
            value: stats.availableStock.toString(),
            icon: TrendingUp,
            color: 'text-green-600',
            bg: 'bg-green-100',
            href: '/dashboard/inventory',
            permission: 'inventory:read'
        },
        {
            name: 'Stock Value',
            value: '',
            icon: DollarSign,
            color: 'text-purple-600',
            bg: 'bg-purple-100',
            href: '/dashboard/reports',
            permission: 'reports:inventory-valuation:read'
        },
        {
            name: 'Pending RMAs',
            value: stats.pendingWarrantyClaims.toString(),
            icon: Activity,
            color: 'text-orange-600',
            bg: 'bg-orange-100',
            href: '/dashboard/warranty',
            permission: 'warranty_rma:read'
        },
        {
            name: 'Low Stock Items',
            value: stats.lowStockCount.toString(),
            icon: AlertTriangle,
            color: 'text-red-600',
            bg: 'bg-red-100',
            href: '#low-stock',
            permission: 'inventory:read'
        },
        {
            name: 'Sold Items',
            value: stats.soldStock.toString(),
            icon: FileText,
            color: 'text-indigo-600',
            bg: 'bg-indigo-100',
            href: '/dashboard/transactions',
            permission: 'delivery_orders:read'
        },
        {
            name: 'Total Customers',
            value: stats.totalCustomers.toString(),
            icon: Users,
            color: 'text-pink-600',
            bg: 'bg-pink-100',
            href: '/dashboard/settings/customers',
            permission: 'customers:read'
        },
        {
            name: 'Delivery Orders',
            value: stats.totalDeliveryOrders.toString(),
            icon: Truck,
            color: 'text-teal-600',
            bg: 'bg-teal-100',
            href: '/dashboard/transactions',
            permission: 'delivery_orders:read'
        },
    ]
}

// Quick actions with required permissions
const QUICK_ACTIONS = [
    { label: 'Receive Stock', href: '/dashboard/stock-movements/grn/new', permission: 'inventory:create' },
    { label: 'Create Invoice', href: '/dashboard/transactions/invoices/new', permission: 'invoices:create' },
    { label: 'New RMA Claim', href: '/dashboard/warranty/new', permission: 'warranty_rma:create' },
    { label: 'View Inventory', href: '/dashboard/inventory', permission: 'inventory:read' },
    { label: 'New CRM Project', href: '/dashboard/crm/pipeline', permission: 'projects:create' },
    { label: 'New Delivery Order', href: '/dashboard/transactions/delivery-orders/new', permission: 'delivery_orders:create' },
    { label: 'View Reports', href: '/dashboard/reports', permission: 'reports:read' },
    { label: 'New Purchase Order', href: '/dashboard/transactions/purchase-orders/new', permission: 'purchase_orders:create' },
]

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null)
    const [permissions, setPermissions] = useState<string[]>([])
    const [loading, setLoading] = useState(true)
    const [statsError, setStatsError] = useState<string | null>(null)

    useEffect(() => {
        // Fetch stats and permissions in parallel
        Promise.all([fetchStats(), fetchPermissions()])
    }, [])

    async function fetchStats() {
        setStatsError(null)
        try {
            const res = await fetch('/api/dashboard/stats')
            const data = await res.json()

            if (!res.ok || data?.error) {
                setStatsError(data?.message || 'Failed to load dashboard data.')
                return
            }

            if (data && typeof data.totalProducts === 'number') {
                setStats(data)
            } else {
                setStatsError('Invalid data received from server.')
            }
        } catch (error) {
            console.error('Failed to fetch stats:', error)
            setStatsError('A network error occurred. Please check your connection.')
        } finally {
            setLoading(false)
        }
    }

    async function fetchPermissions() {
        try {
            const res = await fetch('/api/auth/me')
            if (res.ok) {
                const data = await res.json()
                setPermissions(data.permissions ?? [])
            }
        } catch {
            // If permissions can't be loaded, show no restricted cards
        }
    }

    const can = (perm: string | null) => hasPermission(permissions, perm)

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <p className="text-gray-500">Loading dashboard...</p>
            </div>
        )
    }

    if (!stats) {
        return (
            <div className="flex flex-col justify-center items-center h-64 gap-4">
                <p className="text-red-600 font-medium">{statsError || 'Failed to load dashboard data'}</p>
                <button onClick={fetchStats} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">Retry</button>
            </div>
        )
    }

    const visibleStatCards = buildStatCards(stats).filter(c => can(c.permission))
    const visibleQuickActions = QUICK_ACTIONS.filter(a => can(a.permission))

    // Panel visibility
    const showInventoryPanels = can('inventory:read')
    const showActivityPanel = can('delivery_orders:read') || can('inventory:read')

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-background">Dashboard Overview</h1>
                    <p className="mt-1 text-sm text-gray-500">Real-time inventory and business metrics</p>
                </div>
                {can('reports:read') && (
                    <Link
                        href="/dashboard/reports"
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                        <FileText className="w-4 h-4 mr-2" />
                        View Reports
                    </Link>
                )}
            </div>

            {/* Messaging — always visible to all roles */}
            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 rounded-2xl bg-gradient-to-br from-white to-gray-50 p-1 shadow-sm border border-gray-100 overflow-hidden group">
                    <div className="bg-white rounded-[calc(1rem-1px)] h-full">
                        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-red-50 rounded-lg text-red-600">
                                    <AlertTriangle className="w-5 h-5 animate-pulse" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900 tracking-tight">Urgent Attention</h3>
                                    <p className="text-[10px] text-gray-500 font-medium">Critical items requiring immediate action</p>
                                </div>
                            </div>
                            <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 text-[10px] font-bold uppercase tracking-wider">
                                {stats.pendingMessages.filter(m => m.priority === 'URGENT').length} Priority
                            </span>
                        </div>

                        <div className="p-5">
                            {stats.pendingMessages.filter(m => m.priority === 'URGENT').length > 0 ? (
                                <div className="grid gap-4 md:grid-cols-2">
                                    {stats.pendingMessages.filter(m => m.priority === 'URGENT').slice(0, 2).map((msg) => (
                                        <Link
                                            key={msg.id}
                                            href="/dashboard/messaging"
                                            className="flex flex-col p-4 bg-white border border-red-100 rounded-xl hover:border-red-300 hover:shadow-lg transition-all group/card relative overflow-hidden"
                                        >
                                            <div className="absolute top-0 right-0 p-2">
                                                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                            </div>

                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-600 text-white uppercase tracking-tighter">
                                                    {msg.category}
                                                </span>
                                                <span className="text-[9px] text-gray-400 font-bold italic">{formatDate(msg.date)}</span>
                                            </div>

                                            <h4 className="text-sm font-bold text-gray-900 group-hover/card:text-red-700 mb-2 line-clamp-1 leading-tight">
                                                {msg.subject}
                                            </h4>

                                            <div className="mt-auto pt-3 border-t border-gray-50 flex items-center justify-between">
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center">
                                                        <User className="w-3 text-gray-500" />
                                                    </div>
                                                    <span className="text-[10px] font-bold text-gray-700 truncate max-w-[80px]">From {msg.sender}</span>
                                                </div>
                                                {msg.deadline && (
                                                    <div className="flex items-center gap-1 text-[9px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-lg">
                                                        <Clock className="w-2.5 h-2.5" />
                                                        {new Date(msg.deadline).toLocaleDateString()}
                                                    </div>
                                                )}
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-6 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                                    <CheckCircle2 className="w-5 h-5 text-green-500 mb-2" />
                                    <p className="text-xs font-bold text-gray-900 tracking-tight">Level Clear</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100 flex flex-col h-full max-h-[320px]">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-gray-900 tracking-tight">Brief Summary</h3>
                        </div>
                        <Link href="/dashboard/messaging" className="text-[9px] font-bold text-blue-600 uppercase tracking-widest hover:text-blue-800 transition-colors">
                            Full Inbox
                        </Link>
                    </div>

                    <div className="space-y-2 flex-1 overflow-y-auto scrollbar-hide">
                        {stats.pendingMessages.filter(m => m.priority !== 'URGENT').length > 0 ? (
                            stats.pendingMessages.filter(m => m.priority !== 'URGENT').slice(0, 4).map((msg) => (
                                <Link
                                    key={msg.id}
                                    href="/dashboard/messaging"
                                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100 group/item"
                                >
                                    <div className={cn(
                                        "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                                        msg.priority === 'HIGH' ? "bg-orange-50 text-orange-600" : "bg-blue-50 text-blue-600"
                                    )}>
                                        <Mail className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-xs font-bold text-gray-900 truncate tracking-tight group-hover/item:text-blue-600 transition-colors">
                                            {msg.subject}
                                        </h4>
                                        <p className="text-[10px] text-gray-500 font-medium truncate">From {msg.sender}</p>
                                    </div>
                                    <ChevronRight className="w-3 h-3 text-gray-300 group-hover/item:text-blue-500" />
                                </Link>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full py-4 text-gray-400 opacity-50">
                                <MessageSquare className="w-6 h-6 mb-1" />
                                <p className="text-[9px] font-bold uppercase tracking-widest text-center">No other<br />messages</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats Grid — filtered by permission */}
            {visibleStatCards.length > 0 && (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {visibleStatCards.map((stat) => (
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
            )}

            {/* Panels — shown based on permission */}
            {(showActivityPanel || showInventoryPanels) && (
                <div className="grid gap-6 lg:grid-cols-2">
                    {/* Recent Activity */}
                    {showActivityPanel && (
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
                    )}

                    {/* Low Stock Alerts — only for those with inventory read */}
                    {showInventoryPanels && (
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
                    )}
                </div>
            )}

            {/* Quick Actions — filtered by permission */}
            {visibleQuickActions.length > 0 && (
                <div className="rounded-lg bg-white p-6 shadow">
                    <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Quick Actions</h3>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {visibleQuickActions.map((action) => (
                            <Link
                                key={action.href}
                                href={action.href}
                                className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                            >
                                {action.label}
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Empty state for very restricted roles (VIEWER with no cards) */}
            {visibleStatCards.length === 0 && visibleQuickActions.length === 0 && !showActivityPanel && !showInventoryPanels && (
                <div className="rounded-lg bg-white p-12 shadow text-center">
                    <ShieldCheck className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">Your dashboard is configured by your administrator.</p>
                    <p className="text-sm text-gray-400 mt-1">Use the sidebar to navigate to your available modules.</p>
                </div>
            )}
        </div>
    )
}
