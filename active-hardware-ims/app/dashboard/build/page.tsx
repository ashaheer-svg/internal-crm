"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Package, Search, ChevronRight, Clock, Hammer, Wrench } from "lucide-react"
import { formatDate, formatStatus } from "@/lib/utils"
import SortIcon from "@/components/SortIcon"
import PaginationControls from "@/components/PaginationControls"
import { cn } from "@/lib/utils"

interface BuildQueueOrder {
    id: string
    orderNumber: string
    customerName: string
    status: string
    createdAt: string
    _count: {
        items: number
    }
    hasServiceItem?: boolean
}

type TabFilter = 'ALL' | 'HARDWARE' | 'SERVICE'

export default function BuildListingPage() {
    const [orders, setOrders] = useState<BuildQueueOrder[]>([])
    const [meta, setMeta] = useState<any>({ total: 0, page: 1, limit: 10, totalPages: 0 })
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [debouncedSearch, setDebouncedSearch] = useState("")
    const [activeTab, setActiveTab] = useState<TabFilter>('ALL')
    const [sort, setSort] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'createdAt', direction: 'desc' })

    // Counts for tabs (total across all filters for badge numbers)
    // We'll fetch these once or derive if possible, but for server-side pagination, 
    // it's better to fetch if we want accurate total counts for other tabs.
    // For now, let's focus on the active tab's pagination.
    const [counts, setCounts] = useState({ ALL: 0, HARDWARE: 0, SERVICE: 0 })

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 500)
        return () => clearTimeout(timer)
    }, [search])

    const fetchOrders = useCallback(async (page: number = 1) => {
        setLoading(true)
        try {
            const params = new URLSearchParams({
                status: 'READY_FOR_BUILD,BUILDING',
                page: page.toString(),
                limit: '10',
                sortKey: sort.key === 'date' ? 'createdAt' : sort.key === 'number' ? 'orderNumber' : sort.key === 'customer' ? 'customerName' : sort.key,
                sortDir: sort.direction,
                search: debouncedSearch,
                buildType: activeTab
            })

            const res = await fetch(`/api/delivery-orders?${params}`)
            if (res.ok) {
                const data = await res.json()
                setOrders(data.deliveryOrders)
                setMeta(data.meta)

                // If it's the first load of ALL, we can set the base count
                if (activeTab === 'ALL' && !debouncedSearch) {
                    setCounts(prev => ({ ...prev, ALL: data.meta.total }))
                }
            }
        } catch (error) {
            console.error("Failed to fetch build orders:", error)
        } finally {
            setLoading(false)
        }
    }, [activeTab, sort, debouncedSearch])

    // Fetch tab counts when refresh or search changes
    const fetchCounts = useCallback(async () => {
        try {
            const buildStatuses = 'READY_FOR_BUILD,BUILDING'
            const [all, hardware, service] = await Promise.all([
                fetch(`/api/delivery-orders?status=${buildStatuses}&limit=1&buildType=ALL`).then(r => r.json()),
                fetch(`/api/delivery-orders?status=${buildStatuses}&limit=1&buildType=HARDWARE`).then(r => r.json()),
                fetch(`/api/delivery-orders?status=${buildStatuses}&limit=1&buildType=SERVICE`).then(r => r.json())
            ])
            setCounts({
                ALL: all.meta?.total || 0,
                HARDWARE: hardware.meta?.total || 0,
                SERVICE: service.meta?.total || 0
            })
        } catch (e) {
            console.error("Failed to fetch counts", e)
        }
    }, [])

    useEffect(() => {
        fetchOrders()
    }, [fetchOrders])

    useEffect(() => {
        fetchCounts()
    }, [fetchCounts])

    const handleSort = (key: string) => {
        setSort(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }))
    }

    const tabs: { key: TabFilter; label: string; count: number }[] = [
        { key: 'ALL', label: 'All Orders', count: counts.ALL },
        { key: 'HARDWARE', label: 'Hardware Only', count: counts.HARDWARE },
        { key: 'SERVICE', label: 'Service / Rental', count: counts.SERVICE },
    ]

    return (
        <div className="space-y-8 pb-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-200">
                        <Hammer className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Technical Build Queue</h1>
                        <p className="text-sm text-gray-500 font-medium">Verify and prepare orders for delivery</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg border border-blue-100">
                    <Clock className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">{meta.total} Orders in Queue</span>
                </div>
            </div>

            {/* Tab Filter */}
            <div className="flex bg-gray-100/50 p-1 rounded-xl w-fit border border-gray-200">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={cn(
                            "flex items-center gap-2 px-6 py-2 text-sm font-bold rounded-lg transition-all",
                            activeTab === tab.key
                                ? "bg-white text-blue-600 shadow-sm border border-gray-200"
                                : "text-gray-500 hover:text-gray-700"
                        )}
                    >
                        {tab.label}
                        <span className={cn(
                            "px-2 py-0.5 rounded-md text-[10px] font-extrabold transition-colors",
                            activeTab === tab.key ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"
                        )}>
                            {tab.count}
                        </span>
                    </button>
                ))}
            </div>

            {/* Search and Controls */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Search by order number or customer..."
                        className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm font-medium"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <button
                    onClick={() => { fetchOrders(); fetchCounts(); }}
                    className="px-6 py-2.5 text-sm font-bold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-all active:scale-95 shadow-sm"
                >
                    Refresh Queue
                </button>
            </div>

            {loading ? (
                <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="h-24 bg-gray-50 rounded-2xl animate-pulse" />
                    ))}
                </div>
            ) : orders.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-16 text-center shadow-sm">
                    <div className="p-4 bg-gray-50 rounded-full w-fit mx-auto mb-4">
                        <Package className="h-10 w-10 text-gray-300" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">Queue is Clear</h3>
                    <p className="text-gray-500 max-w-xs mx-auto text-sm mt-1">
                        {activeTab === 'ALL'
                            ? 'There are no orders currently waiting for technical build.'
                            : `No ${activeTab.toLowerCase()} orders in queue.`}
                    </p>
                </div>
            ) : (
                <div className="bg-white shadow-sm rounded-2xl overflow-hidden border border-gray-100">
                    <div className="bg-gray-50/50 border-b border-gray-100 px-6 py-3 flex items-center gap-6">
                        <SortIcon sort={sort} column="number" label="Order #" onSort={handleSort} />
                        <SortIcon sort={sort} column="customer" label="Customer" onSort={handleSort} />
                        <SortIcon sort={sort} column="date" label="Date" onSort={handleSort} />
                        <SortIcon sort={sort} column="status" label="Status" onSort={handleSort} />
                    </div>
                    <ul className="divide-y divide-gray-50">
                        {orders.map((order) => (
                            <li key={order.id} className="hover:bg-gray-50/50 transition-all duration-200 group">
                                <Link href={`/dashboard/build/${order.id}`} className="block p-5 sm:px-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-5">
                                            <div className={cn(
                                                "p-3 rounded-2xl shadow-sm transition-all group-hover:scale-110",
                                                order.hasServiceItem
                                                    ? 'bg-purple-50 text-purple-600 border border-purple-100'
                                                    : order.status === 'BUILDING'
                                                        ? 'bg-blue-50 text-blue-600 border border-blue-100'
                                                        : 'bg-amber-50 text-amber-600 border border-amber-100'
                                            )}>
                                                {order.hasServiceItem ? <Wrench className="w-6 h-6" /> : <Hammer className="w-6 h-6" />}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-base font-bold text-gray-900">{order.orderNumber}</h3>
                                                    {order.hasServiceItem && (
                                                        <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-tighter bg-purple-100 text-purple-700 rounded border border-purple-200">
                                                            Service Linked
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-500 font-medium group-hover:text-blue-600 transition-colors">{order.customerName}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-8">
                                            <div className="text-right hidden md:block">
                                                <div className="flex items-center justify-end gap-1.5 text-xs text-gray-400 font-bold uppercase tracking-widest">
                                                    <Clock className="w-3 h-3" />
                                                    {formatDate(order.createdAt)}
                                                </div>
                                                <div className="text-xs font-bold text-gray-700 mt-1">
                                                    {order._count.items} Products Allocated
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className={cn(
                                                    "px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full border",
                                                    order.status === 'BUILDING'
                                                        ? 'bg-blue-50 border-blue-200 text-blue-700'
                                                        : 'bg-amber-50 border-amber-200 text-amber-700'
                                                )}>
                                                    {formatStatus(order.status)}
                                                </span>
                                                <div className="p-2 rounded-xl bg-gray-50 text-gray-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                                                    <ChevronRight className="w-5 h-5" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            </li>
                        ))}
                    </ul>
                    <PaginationControls
                        currentPage={meta.page}
                        totalPages={meta.totalPages}
                        onPageChange={(p) => fetchOrders(p)}
                        totalResults={meta.total}
                        limit={meta.limit}
                        className="border-t border-gray-50"
                    />
                </div>
            )}
        </div>
    )
}
