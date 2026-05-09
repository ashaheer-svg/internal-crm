"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Plus, FileText, Package, Receipt, Search, ArrowRight, MapPin, User, DollarSign, Hash, Filter, RefreshCw, Truck, ArrowLeftRight, Wrench, RotateCcw, AlertTriangle, TrendingDown, ShieldCheck, Layers, Calendar, History } from "lucide-react"
import { Currency } from "@/components/Currency"
import { formatDate, cn } from "@/lib/utils"
import SortIcon from "@/components/SortIcon"
import PaginationControls from "@/components/PaginationControls"

type PurchaseOrder = {
    id: string
    poNumber: string
    supplier: string
    totalAmount: number
    status: string
    createdAt: string
    items: any[]
}



type TransactionLog = {
    id: string
    type: string
    referenceType: string | null
    referenceId: string | null
    productId: string | null
    product?: { name: string; sku: string; model?: string | null } | null
    serialNumber: string | null
    quantity: number
    fromLocation: string | null
    toLocation: string | null
    unitCost: number | null
    performedBy: string | null
    notes: string | null
    createdAt: string
}

const TYPE_CFG: Record<string, { label: string; icon: any; badge: string; dot: string }> = {
    RECEIPT: { label: 'Stock Receipt', icon: Package, badge: 'bg-emerald-100 text-emerald-800 border-emerald-200 shadow-sm', dot: 'bg-emerald-500' },
    IN: { label: 'Inventory In', icon: Package, badge: 'bg-emerald-100 text-emerald-800 border-emerald-200 shadow-sm', dot: 'bg-emerald-500' },
    OUT: { label: 'Dispatched', icon: Truck, badge: 'bg-blue-100 text-blue-800 border-blue-200 shadow-sm', dot: 'bg-blue-500' },
    ISSUE: { label: 'Issued', icon: Truck, badge: 'bg-blue-100 text-blue-800 border-blue-200 shadow-sm', dot: 'bg-blue-500' },
    TRANSFER: { label: 'Location Transfer', icon: ArrowLeftRight, badge: 'bg-purple-100 text-purple-800 border-purple-200 shadow-sm', dot: 'bg-purple-500' },
    RETURN: { label: 'Return', icon: RotateCcw, badge: 'bg-amber-100 text-amber-800 border-amber-200 shadow-sm', dot: 'bg-amber-500' },
    RENTAL_OUT: { label: 'Rental Dispatch', icon: Truck, badge: 'bg-indigo-100 text-indigo-800 border-indigo-200 shadow-sm', dot: 'bg-indigo-500' },
    RENTAL_RETURN: { label: 'Rental Return', icon: RotateCcw, badge: 'bg-indigo-100 text-indigo-800 border-indigo-200 shadow-sm', dot: 'bg-indigo-400' },
    SERVICE_OUT: { label: 'Service Dispatch', icon: Wrench, badge: 'bg-violet-100 text-violet-800 border-violet-200 shadow-sm', dot: 'bg-violet-500' },
    WARRANTY_IN: { label: 'Warranty RMA In', icon: ShieldCheck, badge: 'bg-rose-100 text-rose-800 border-rose-200 shadow-sm', dot: 'bg-rose-500' },
    WARRANTY_OUT: { label: 'Warranty Replace', icon: ShieldCheck, badge: 'bg-rose-100 text-rose-800 border-rose-200 shadow-sm', dot: 'bg-rose-400' },
    COST_ADJUSTMENT: { label: 'Cost Recalculation', icon: TrendingDown, badge: 'bg-orange-100 text-orange-800 border-orange-200 shadow-sm', dot: 'bg-orange-500' },
    ADJUSTMENT: { label: 'Cost Adjustment', icon: TrendingDown, badge: 'bg-orange-100 text-orange-800 border-orange-200 shadow-sm', dot: 'bg-orange-500' },
    STATUS_CHANGE: { label: 'Status Change', icon: AlertTriangle, badge: 'bg-yellow-100 text-yellow-800 border-yellow-200 shadow-sm', dot: 'bg-yellow-500' },
    IMPORT: { label: 'Legacy Import', icon: Layers, badge: 'bg-gray-100 text-gray-700 border-gray-200 shadow-sm', dot: 'bg-gray-400' },
    BACKORDER_ALLOC: { label: 'Backorder Alloc.', icon: Package, badge: 'bg-teal-100 text-teal-800 border-teal-200 shadow-sm', dot: 'bg-teal-500' },
}

const ALL_TYPES = Object.keys(TYPE_CFG)

function getTypeCfg(type: string) {
    return TYPE_CFG[type] ?? { label: type, icon: Package, badge: 'bg-gray-100 text-gray-700 border-gray-200 shadow-sm', dot: 'bg-gray-400' }
}

function TransactionsContent() {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])

    const [deliveryOrders, setDeliveryOrders] = useState<any[]>([])
    const [transactionLogs, setTransactionLogs] = useState<TransactionLog[]>([])
    const [loading, setLoading] = useState(true)
    const [logsLoading, setLogsLoading] = useState(false)
    
    // Initialize activeTab from URL immediately, then check localStorage on mount
    const initialTab = (searchParams.get('tab') as any)
    const [activeTab, setActiveTab] = useState<'po' | 'do' | 'log'>(
        ['po', 'do', 'log'].includes(initialTab) ? initialTab as any : 'po'
    )

    useEffect(() => {
        if (!searchParams.get('tab')) {
            const savedTab = localStorage.getItem('last_tx_tab') as any
            if (['po', 'do', 'log'].includes(savedTab)) {
                setActiveTab(savedTab)
            }
        }
    }, [searchParams])

    const handleTabChange = (tabId: 'po' | 'do' | 'log') => {
        setActiveTab(tabId)
        localStorage.setItem('last_tx_tab', tabId)
        
        // Update URL without full refresh to persist state in history
        const params = new URLSearchParams(searchParams.toString())
        params.set('tab', tabId)
        router.replace(`${pathname}?${params.toString()}`)
    }

    // Filters
    const [logSearch, setLogSearch] = useState('')
    const [logType, setLogType] = useState('ALL')
    const [logDateFrom, setLogDateFrom] = useState('')
    const [logDateTo, setLogDateTo] = useState('')
    const [poSearch, setPoSearch] = useState('')
    const [doSearch, setDoSearch] = useState('')


    // Pagination Meta
    const [poMeta, setPoMeta] = useState({ total: 0, page: 1, limit: 25, totalPages: 1 })
    const [doMeta, setDoMeta] = useState({ total: 0, page: 1, limit: 25, totalPages: 1 })

    const [logMeta, setLogMeta] = useState({ total: 0, page: 1, limit: 25, totalPages: 1 })

    // Sort configs
    const [poSort, setPoSort] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' })
    const [doSort, setDoSort] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' })

    const [logSort, setLogSort] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' })

    const [showDeletedDO, setShowDeletedDO] = useState(false)
    const limit = 25

    const fetchPurchaseOrders = useCallback(async (page: number = 1) => {
        setLoading(true)
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                sortKey: poSort.key,
                sortDir: poSort.direction,
            })
            if (poSearch) params.set('search', poSearch)
            const res = await fetch(`/api/purchase-orders?${params}`)
            const data = await res.json()
            if (data.purchaseOrders) {
                setPurchaseOrders(data.purchaseOrders)
                setPoMeta(data.meta || { total: data.purchaseOrders.length, page: 1, limit, totalPages: 1 })
            } else {
                setPurchaseOrders(data)
                setPoMeta({ total: data.length, page: 1, limit, totalPages: 1 })
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }, [poSort, poSearch])

    const fetchDeliveryOrders = useCallback(async (page: number = 1) => {
        setLoading(true)
        try {
            const params = new URLSearchParams({
                includeInactive: showDeletedDO.toString(),
                page: page.toString(),
                limit: limit.toString(),
                sortKey: doSort.key,
                sortDir: doSort.direction,
            })
            if (doSearch) params.set('search', doSearch)
            const res = await fetch(`/api/delivery-orders?${params}`)
            const data = await res.json()
            if (data.deliveryOrders) {
                setDeliveryOrders(data.deliveryOrders)
                setDoMeta(data.meta || { total: data.deliveryOrders.length, page: 1, limit, totalPages: 1 })
            } else {
                setDeliveryOrders(data)
                setDoMeta({ total: data.length, page: 1, limit, totalPages: 1 })
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }, [doSort, doSearch, showDeletedDO])

    const fetchTransactionLogs = useCallback(async (page: number = 1) => {
        setLogsLoading(true)
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                sortKey: logSort.key,
                sortDir: logSort.direction,
            })
            if (logType && logType !== 'ALL') params.set('type', logType)
            if (logSearch) params.set('search', logSearch)
            if (logDateFrom) params.set('dateFrom', logDateFrom)
            if (logDateTo) params.set('dateTo', logDateTo)

            const res = await fetch(`/api/transaction-logs?${params}`)
            if (res.ok) {
                const data = await res.json()
                if (data.logs) {
                    setTransactionLogs(data.logs)
                    setLogMeta(data.meta || { total: data.logs.length, page: 1, limit, totalPages: 1 })
                } else {
                    setTransactionLogs(data)
                    setLogMeta({ total: data.length, page: 1, limit, totalPages: 1 })
                }
            }
        } catch (error) {
            console.error('Failed to fetch transaction logs:', error)
        } finally {
            setLogsLoading(false)
        }
    }, [logSort, logSearch, logType, logDateFrom, logDateTo])

    useEffect(() => {
        const timer = setTimeout(() => fetchPurchaseOrders(1), 400)
        return () => clearTimeout(timer)
    }, [fetchPurchaseOrders])



    useEffect(() => {
        const timer = setTimeout(() => fetchDeliveryOrders(1), 400)
        return () => clearTimeout(timer)
    }, [fetchDeliveryOrders])

    useEffect(() => {
        const timer = setTimeout(() => fetchTransactionLogs(1), 400)
        return () => clearTimeout(timer)
    }, [fetchTransactionLogs])

    const handleSort = (tab: string, key: string) => {
        if (tab === 'po') setPoSort(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }))
        if (tab === 'do') setDoSort(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }))

        if (tab === 'log') setLogSort(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }))
    }

    return (
        <div className="space-y-6 flex flex-col min-h-screen pb-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-background">Enterprise Transactions</h1>
                    <p className="text-sm text-gray-500 font-medium">unified procurement, fulfillment, and movement history</p>
                </div>
            </div>

            {/* Premium Tab Navigation */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-1.5 flex gap-1 w-fit">
                {[
                    { id: 'po', label: 'Purchase Orders', icon: Package },
                    { id: 'do', label: 'Delivery Orders', icon: Truck },
                    { id: 'log', label: 'Transaction Log', icon: History },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id as any)}
                        className={cn(
                            "flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
                            activeTab === tab.id
                                ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                                : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                        )}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Purchase Orders Tab */}
            {activeTab === 'po' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col justify-between">
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 mb-1">Stock Receipt Protocol</h3>
                                <p className="text-xs text-gray-500 leading-relaxed">Initiate procurement flows, manage supplier interactions, and reconcile incoming shipments with digital serial tracking.</p>
                            </div>
                            <Link
                                href="/dashboard/transactions/purchase-orders/new"
                                className="mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-md shadow-blue-100 transition-all active:scale-95 text-xs font-bold w-full md:w-fit"
                            >
                                <Plus className="w-4 h-4" />
                                New Purchase Order
                            </Link>
                        </div>
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
                            <h3 className="text-sm font-bold text-gray-900 mb-3">Search & Filters</h3>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="PO Number, supplier name..."
                                    className="w-full pl-9 pr-4 py-2 text-sm border-gray-200 rounded-xl focus:ring-blue-500 shadow-sm transition-all"
                                    value={poSearch}
                                    onChange={e => setPoSearch(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col flex-1 min-h-[500px]">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-100">
                                <thead className="bg-gray-50/50">
                                    <tr>
                                        <th className="px-6 py-3.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                                            <SortIcon sort={poSort} column="poNumber" label="Order ID" onSort={(k) => handleSort('po', k)} />
                                        </th>
                                        <th className="px-6 py-3.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                                            <SortIcon sort={poSort} column="supplier" label="Supplier" onSort={(k) => handleSort('po', k)} />
                                        </th>
                                        <th className="px-6 py-3.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Line Items</th>
                                        <th className="px-6 py-3.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                                            <SortIcon sort={poSort} column="status" label="Status" onSort={(k) => handleSort('po', k)} />
                                        </th>
                                        <th className="px-6 py-3.5 text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                                            <SortIcon sort={poSort} column="amount" label="Valuation" onSort={(k) => handleSort('po', k)} />
                                        </th>
                                        <th className="px-6 py-3.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                                            <SortIcon sort={poSort} column="date" label="Timestamp" onSort={(k) => handleSort('po', k)} />
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {loading ? (
                                        Array.from({ length: 8 }).map((_, i) => (
                                            <tr key={i} className="animate-pulse">
                                                <td colSpan={6} className="px-6 py-4"><div className="h-4 bg-gray-50 rounded-lg w-full" /></td>
                                            </tr>
                                        ))
                                    ) : purchaseOrders.map((po) => (
                                        <tr key={po.id} className="hover:bg-gray-50/50 transition-all cursor-pointer group" onClick={() => router.push(`/dashboard/transactions/purchase-orders/${po.id}`)}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-600 font-mono tracking-tighter uppercase">{po.poNumber}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-gray-900 uppercase tracking-tight">{po.supplier}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1 max-w-xs">
                                                    {po.items.slice(0, 2).map((item: any) => (
                                                        <div key={item.id} className="flex items-center justify-between text-[11px] text-gray-600 font-medium">
                                                            <span className="truncate mr-3">{item.product?.model || item.product?.name}</span>
                                                            <span className="bg-gray-100 px-1.5 py-0.5 rounded font-bold text-[9px] flex-shrink-0">
                                                                {po.status === 'RECEIVED' ? `${item.receivedQty || 0}/${item.quantity}` : item.quantity}
                                                            </span>
                                                        </div>
                                                    ))}
                                                    {po.items.length > 2 && <span className="text-[10px] text-gray-400 font-bold italic">+{po.items.length - 2} more items</span>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={cn(
                                                    "px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-tighter border",
                                                    po.status === 'DRAFT' && 'bg-gray-100 text-gray-700 border-gray-200',
                                                    po.status === 'SUBMITTED' && 'bg-blue-50 text-blue-700 border-blue-200',
                                                    po.status === 'RECEIVED' && 'bg-emerald-50 text-emerald-700 border-emerald-200',
                                                    po.status === 'CANCELLED' && 'bg-rose-50 text-rose-700 border-rose-200'
                                                )}>
                                                    {po.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right tabular-nums">
                                                <Currency amount={po.totalAmount} />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                                                {formatDate(po.createdAt)}
                                            </td>
                                        </tr>
                                    ))}
                                    {purchaseOrders.length === 0 && !loading && (
                                        <tr><td colSpan={6} className="px-6 py-20 text-center"><p className="text-gray-400 font-medium">No procurement records found</p></td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <PaginationControls
                            currentPage={poMeta.page}
                            totalPages={poMeta.totalPages}
                            onPageChange={(p) => fetchPurchaseOrders(p)}
                            totalResults={poMeta.total}
                            limit={poMeta.limit}
                            className="bg-gray-50/50 border-t border-gray-100"
                        />
                    </div>
                </div>
            )}

            {/* Delivery Orders Tab */}
            {activeTab === 'do' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col justify-between">
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 mb-1">Fulfillment Orchestration</h3>
                                <p className="text-xs text-gray-500 leading-relaxed">Reserve stock, generate packing slips, and track dispatch status. Integrated link with sales invoices for seamless revenue recognition.</p>
                            </div>
                            <Link
                                href="/dashboard/transactions/delivery-orders/new"
                                className="mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-md shadow-indigo-100 transition-all active:scale-95 text-xs font-bold w-full md:w-fit"
                            >
                                <Plus className="w-4 h-4" />
                                New Delivery Order
                            </Link>
                        </div>
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3">
                            <h3 className="text-sm font-bold text-gray-900">Search & Filters</h3>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="DO Number, customer..."
                                    className="w-full pl-9 pr-4 py-2 text-sm border-gray-200 rounded-xl focus:ring-indigo-500 shadow-sm transition-all"
                                    value={doSearch}
                                    onChange={e => setDoSearch(e.target.value)}
                                />
                            </div>
                            <label className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={showDeletedDO}
                                    onChange={(e) => setShowDeletedDO(e.target.checked)}
                                    className="rounded-lg border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                                />
                                Include Deactivated Records
                            </label>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col flex-1 min-h-[500px]">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-100">
                                <thead className="bg-gray-50/50">
                                    <tr>
                                        <th className="px-6 py-3.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                                            <SortIcon sort={doSort} column="orderNumber" label="Dispatch ID" onSort={(k) => handleSort('do', k)} />
                                        </th>
                                        <th className="px-6 py-3.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                                            <SortIcon sort={doSort} column="customerName" label="Consignee" onSort={(k) => handleSort('do', k)} />
                                        </th>
                                        <th className="px-6 py-3.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Linked Invoice</th>
                                        <th className="px-6 py-3.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                                            <SortIcon sort={doSort} column="status" label="Current Status" onSort={(k) => handleSort('do', k)} />
                                        </th>
                                        <th className="px-6 py-3.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                                            <SortIcon sort={doSort} column="date" label="Issue Date" onSort={(k) => handleSort('do', k)} />
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {loading ? (
                                        Array.from({ length: 8 }).map((_, i) => (
                                            <tr key={i} className="animate-pulse">
                                                <td colSpan={5} className="px-6 py-4"><div className="h-4 bg-gray-50 rounded-lg w-full" /></td>
                                            </tr>
                                        ))
                                    ) : deliveryOrders.map((order) => (
                                        <tr key={order.id} className={cn("hover:bg-gray-50/50 transition-all cursor-pointer group", !order.isActive && 'bg-gray-50/30')} onClick={() => router.push(`/dashboard/transactions/delivery-orders/${order.id}`)}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className={cn("text-sm font-bold font-mono tracking-tighter uppercase", order.isActive === false ? 'text-gray-400 line-through' : 'text-indigo-600')}>
                                                        {order.orderNumber}
                                                    </span>
                                                    {!order.isActive && <span className="text-[9px] text-rose-500 font-bold uppercase tracking-widest">Deactivated</span>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-gray-900 uppercase tracking-tight">{order.customerName}</td>
                                            <td className="px-6 py-4 whitespace-nowrap font-mono text-[11px] text-blue-600 font-bold">{order.invoiceNumber || <span className="text-gray-300">-</span>}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={cn(
                                                    "px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-tighter border",
                                                    order.status === 'DRAFT' && 'bg-gray-100 text-gray-700 border-gray-200',
                                                    order.status === 'CONFIRMED' && 'bg-indigo-50 text-indigo-700 border-indigo-200',
                                                    order.status === 'COMPLETED' && 'bg-emerald-50 text-emerald-700 border-emerald-200',
                                                    order.status === 'CANCELLED' && 'bg-rose-50 text-rose-700 border-rose-200'
                                                )}>
                                                    {order.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                                                {formatDate(order.createdAt)}
                                            </td>
                                        </tr>
                                    ))}
                                    {deliveryOrders.length === 0 && !loading && (
                                        <tr><td colSpan={5} className="px-6 py-20 text-center"><p className="text-gray-400 font-medium">No shipment records found</p></td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <PaginationControls
                            currentPage={doMeta.page}
                            totalPages={doMeta.totalPages}
                            onPageChange={(p) => fetchDeliveryOrders(p)}
                            totalResults={doMeta.total}
                            limit={doMeta.limit}
                            className="bg-gray-50/50 border-t border-gray-100"
                        />
                    </div>
                </div>
            )}



            {/* Transaction Log Tab */}
            {activeTab === 'log' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-4">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Serial #, product, notes, performed by…"
                                    className="w-full pl-10 pr-4 py-2 text-sm border-gray-200 rounded-xl focus:ring-blue-500 shadow-sm transition-all"
                                    value={logSearch}
                                    onChange={e => setLogSearch(e.target.value)}
                                />
                            </div>
                            <div className="flex flex-wrap gap-2 items-center text-xs font-bold text-gray-400 uppercase tracking-wider">
                                <Calendar className="w-3.5 h-3.5" />
                                <input type="date" value={logDateFrom} onChange={e => setLogDateFrom(e.target.value)}
                                    className="border border-gray-200 rounded-xl px-2 py-1 text-sm font-medium text-gray-700 focus:ring-blue-500 shadow-sm bg-white" />
                                <span className="mx-1">→</span>
                                <input type="date" value={logDateTo} onChange={e => setLogDateTo(e.target.value)}
                                    className="border border-gray-200 rounded-xl px-2 py-1 text-sm font-medium text-gray-700 focus:ring-blue-500 shadow-sm bg-white" />
                                <button onClick={() => { setLogDateFrom(''); setLogDateTo(''); setLogSearch(''); setLogType('ALL') }}
                                    className="ml-2 p-2 rounded-xl hover:bg-gray-100 text-gray-400 group transition-all active:rotate-180" title="Clear filters">
                                    <RefreshCw className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-50">
                            <button
                                onClick={() => setLogType('ALL')}
                                className={cn(
                                    "px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all",
                                    logType === 'ALL' ? "bg-gray-900 text-white border-gray-900 shadow-md" : "bg-white text-gray-400 border-gray-100 hover:border-gray-300"
                                )}
                            >
                                All Movements
                            </button>
                            {ALL_TYPES.map(t => {
                                const cfg = getTypeCfg(t)
                                return (
                                    <button
                                        key={t}
                                        onClick={() => setLogType(logType === t ? 'ALL' : t)}
                                        className={cn(
                                            "px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all flex items-center gap-1.5",
                                            logType === t ? cfg.badge + " border-current shadow-sm" : "bg-white text-gray-400 border-gray-100 hover:border-gray-300"
                                        )}
                                    >
                                        <cfg.icon className="w-3 h-3" />
                                        {cfg.label}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden min-h-[500px] flex flex-col">
                        <div className="bg-gray-50/50 border-b border-gray-100 px-5 py-3 flex gap-4 overflow-x-auto">
                            <span className="text-[10px] text-gray-400 font-bold uppercase py-1 whitespace-nowrap">Order Archive:</span>
                            <SortIcon sort={logSort} column="date" label="Timestamp" onSort={(k) => handleSort('log', k)} />
                            <SortIcon sort={logSort} column="type" label="Movement Type" onSort={(k) => handleSort('log', k)} />
                            <SortIcon sort={logSort} column="product" label="Asset" onSort={(k) => handleSort('log', k)} />
                            <SortIcon sort={logSort} column="quantity" label="Impact" onSort={(k) => handleSort('log', k)} />
                            <SortIcon sort={logSort} column="performedBy" label="Operator" onSort={(k) => handleSort('log', k)} />
                        </div>

                        <div className="divide-y divide-gray-50 flex-1">
                            {logsLoading ? (
                                Array.from({ length: 10 }).map((_, i) => (
                                    <div key={i} className="px-6 py-6 animate-pulse bg-white border-b border-gray-100">
                                        <div className="h-4 bg-gray-50 rounded-lg w-full" />
                                    </div>
                                ))
                            ) : transactionLogs.length === 0 ? (
                                <div className="p-20 text-center text-gray-400 bg-white">
                                    <Package className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                    <p className="font-bold uppercase tracking-widest text-[10px]">No movement logs discovered</p>
                                </div>
                            ) : (
                                transactionLogs.map((log) => {
                                    const cfg = getTypeCfg(log.type)
                                    const Icon = cfg.icon
                                    return (
                                        <div key={log.id} className="flex gap-4 px-6 py-4 hover:bg-gray-50 transition-all group relative overflow-hidden bg-white">
                                            <div className={cn("absolute left-0 top-0 bottom-0 w-0.5 transition-all opacity-0 group-hover:opacity-100", cfg.dot.replace('bg-', 'bg-'))} />
                                            <div className="flex-shrink-0 mt-0.5">
                                                <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center border shadow-sm transition-transform group-hover:scale-110 duration-300", cfg.badge)}>
                                                    <Icon className="w-5 h-5" />
                                                </div>
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
                                                    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-widest", cfg.badge)}>
                                                        {cfg.label}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                                                        {new Date(log.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>

                                                {(log.product?.name || log.notes) && (
                                                    <p className="text-sm font-bold text-gray-900 mb-1.5 flex items-center gap-2">
                                                        <span className="truncate">{log.product?.name ?? ''}</span>
                                                        {log.product?.sku && <span className="px-1.5 bg-gray-100 rounded text-[9px] font-bold text-gray-400 font-mono">#{log.product.sku}</span>}
                                                    </p>
                                                )}

                                                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] font-bold uppercase tracking-tight text-gray-500">
                                                    {log.serialNumber && (
                                                        <span className="flex items-center gap-1.5 text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
                                                            <Hash className="w-3 h-3" />
                                                            <span className="font-mono">{log.serialNumber}</span>
                                                        </span>
                                                    )}
                                                    {log.quantity > 0 && (
                                                        <span className="flex items-center gap-1.5">
                                                            <Layers className="w-3 h-3 text-gray-400" />
                                                            Qty <span className="text-gray-900 font-extrabold">{log.quantity}</span>
                                                        </span>
                                                    )}
                                                    {(log.fromLocation || log.toLocation) && (
                                                        <span className="flex items-center gap-1.5">
                                                            <MapPin className="w-3 h-3 text-gray-400" />
                                                            <span className="text-gray-400">{log.fromLocation || 'Outside'}</span>
                                                            <ArrowRight className="w-3 h-3 text-gray-300" />
                                                            <span className="text-gray-900 font-extrabold">{log.toLocation || 'Removed'}</span>
                                                        </span>
                                                    )}
                                                    {log.referenceId && (
                                                        <span className="flex items-center gap-1.5 text-gray-400 truncate max-w-[150px]">
                                                            <FileText className="w-3 h-3" />
                                                            {log.referenceType}:{log.referenceId.slice(-6).toUpperCase()}
                                                        </span>
                                                    )}
                                                    {log.performedBy && (
                                                        <span className="flex items-center gap-1.5 text-gray-900">
                                                            <User className="w-3 h-3 text-gray-400" />
                                                            {log.performedBy}
                                                        </span>
                                                    )}
                                                </div>

                                                {log.notes && (
                                                    <div className="mt-2 text-[10px] text-gray-400 italic bg-gray-50/50 p-2 rounded-xl border border-gray-100/50 line-clamp-1 group-hover:line-clamp-none transition-all">
                                                        "{log.notes}"
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>

                        <PaginationControls
                            currentPage={logMeta.page}
                            totalPages={logMeta.totalPages}
                            onPageChange={(p) => fetchTransactionLogs(p)}
                            totalResults={logMeta.total}
                            limit={logMeta.limit}
                            className="bg-gray-50/50 border-t border-gray-100"
                        />
                    </div>
                </div>
            )}
        </div>
    )
}

export default function TransactionsPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading procurement history...</div>}>
            <TransactionsContent />
        </Suspense>
    )
}
