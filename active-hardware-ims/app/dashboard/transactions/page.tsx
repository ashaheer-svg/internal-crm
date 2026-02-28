"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Plus, FileText, Package, Receipt, Search, ArrowRight, MapPin, User, DollarSign, Hash, Filter, RefreshCw, Truck, ArrowLeftRight, Wrench, RotateCcw, AlertTriangle, TrendingDown, ShieldCheck, Layers } from "lucide-react"
import { Currency } from "@/components/Currency"
import { formatDate } from "@/lib/utils"

type PurchaseOrder = {
    id: string
    poNumber: string
    supplier: string
    totalAmount: number
    status: string
    createdAt: string
    items: any[]
}

type Invoice = {
    id: string
    invoiceNumber: string
    customerName: string
    totalAmount: number
    status: string
    createdAt: string
    items: any[]
    salesRep?: {
        name: string
    }
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

// ── Type config ──────────────────────────────────────────────────────────────
const TYPE_CFG: Record<string, { label: string; icon: any; badge: string; dot: string }> = {
    RECEIPT: { label: 'Stock Receipt', icon: Package, badge: 'bg-emerald-100 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500' },
    IN: { label: 'Inventory In', icon: Package, badge: 'bg-emerald-100 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500' },
    OUT: { label: 'Dispatched', icon: Truck, badge: 'bg-blue-100 text-blue-800 border-blue-200', dot: 'bg-blue-500' },
    ISSUE: { label: 'Issued', icon: Truck, badge: 'bg-blue-100 text-blue-800 border-blue-200', dot: 'bg-blue-500' },
    TRANSFER: { label: 'Location Transfer', icon: ArrowLeftRight, badge: 'bg-purple-100 text-purple-800 border-purple-200', dot: 'bg-purple-500' },
    RETURN: { label: 'Return', icon: RotateCcw, badge: 'bg-amber-100 text-amber-800 border-amber-200', dot: 'bg-amber-500' },
    RENTAL_OUT: { label: 'Rental Dispatch', icon: Truck, badge: 'bg-indigo-100 text-indigo-800 border-indigo-200', dot: 'bg-indigo-500' },
    RENTAL_RETURN: { label: 'Rental Return', icon: RotateCcw, badge: 'bg-indigo-100 text-indigo-800 border-indigo-200', dot: 'bg-indigo-400' },
    SERVICE_OUT: { label: 'Service Dispatch', icon: Wrench, badge: 'bg-violet-100 text-violet-800 border-violet-200', dot: 'bg-violet-500' },
    WARRANTY_IN: { label: 'Warranty RMA In', icon: ShieldCheck, badge: 'bg-rose-100 text-rose-800 border-rose-200', dot: 'bg-rose-500' },
    WARRANTY_OUT: { label: 'Warranty Replace', icon: ShieldCheck, badge: 'bg-rose-100 text-rose-800 border-rose-200', dot: 'bg-rose-400' },
    COST_ADJUSTMENT: { label: 'Cost Recalculation', icon: TrendingDown, badge: 'bg-orange-100 text-orange-800 border-orange-200', dot: 'bg-orange-500' },
    ADJUSTMENT: { label: 'Cost Adjustment', icon: TrendingDown, badge: 'bg-orange-100 text-orange-800 border-orange-200', dot: 'bg-orange-500' },
    STATUS_CHANGE: { label: 'Status Change', icon: AlertTriangle, badge: 'bg-yellow-100 text-yellow-800 border-yellow-200', dot: 'bg-yellow-500' },
    IMPORT: { label: 'Legacy Import', icon: Layers, badge: 'bg-gray-100 text-gray-700 border-gray-200', dot: 'bg-gray-400' },
    BACKORDER_ALLOC: { label: 'Backorder Alloc.', icon: Package, badge: 'bg-teal-100 text-teal-800 border-teal-200', dot: 'bg-teal-500' },
}

const ALL_TYPES = Object.keys(TYPE_CFG)

function getTypeCfg(type: string) {
    return TYPE_CFG[type] ?? { label: type, icon: Package, badge: 'bg-gray-100 text-gray-700 border-gray-200', dot: 'bg-gray-400' }
}

export default function TransactionsPage() {
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
    const [invoices, setInvoices] = useState<Invoice[]>([])
    const [deliveryOrders, setDeliveryOrders] = useState<any[]>([])
    const [transactionLogs, setTransactionLogs] = useState<TransactionLog[]>([])
    const [loading, setLoading] = useState(true)
    const [logsLoading, setLogsLoading] = useState(false)
    const [activeTab, setActiveTab] = useState<'po' | 'invoice' | 'do' | 'log'>('po')

    // Log filters
    const [logSearch, setLogSearch] = useState('')
    const [logType, setLogType] = useState('ALL')
    const [logDateFrom, setLogDateFrom] = useState('')
    const [logDateTo, setLogDateTo] = useState('')

    const [showDeletedDO, setShowDeletedDO] = useState(false)

    useEffect(() => {
        fetchPurchaseOrders()
        fetchInvoices()
        fetchTransactionLogs()
    }, [])

    useEffect(() => {
        fetchDeliveryOrders()
    }, [showDeletedDO])

    // Re-fetch logs whenever filters change (with debounce for search)
    useEffect(() => {
        const timer = setTimeout(() => fetchTransactionLogs(), 400)
        return () => clearTimeout(timer)
    }, [logSearch, logType, logDateFrom, logDateTo])

    async function fetchPurchaseOrders() {
        try {
            const res = await fetch('/api/purchase-orders')
            const data = await res.json()
            setPurchaseOrders(data)
        } catch (error) {
            console.error(error)
        }
    }

    async function fetchInvoices() {
        try {
            const res = await fetch('/api/invoices')
            const data = await res.json()
            setInvoices(data)
        } catch (error) {
            console.error(error)
        }
    }

    async function fetchDeliveryOrders() {
        try {
            // Pass includeInactive param based on toggle
            const res = await fetch(`/api/delivery-orders?includeInactive=${showDeletedDO}`)
            const data = await res.json()
            setDeliveryOrders(data)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    async function fetchTransactionLogs() {
        setLogsLoading(true)
        try {
            const params = new URLSearchParams({ limit: '300' })
            if (logType && logType !== 'ALL') params.set('type', logType)
            if (logSearch) params.set('search', logSearch)
            if (logDateFrom) params.set('dateFrom', logDateFrom)
            if (logDateTo) params.set('dateTo', logDateTo)

            const res = await fetch(`/api/transaction-logs?${params}`)
            if (res.ok) {
                const data = await res.json()
                setTransactionLogs(data)
            }
        } catch (error) {
            console.error('Failed to fetch transaction logs:', error)
        } finally {
            setLogsLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="sm:flex sm:items-center sm:justify-between">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">Transactions</h1>
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('po')}
                        className={`${activeTab === 'po' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium`}
                    >
                        Purchase Orders
                    </button>
                    <button
                        onClick={() => setActiveTab('do')}
                        className={`${activeTab === 'do' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium`}
                    >
                        Delivery Orders
                    </button>
                    <button
                        onClick={() => setActiveTab('invoice')}
                        className={`${activeTab === 'invoice' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium`}
                    >
                        Invoices
                    </button>
                    <button
                        onClick={() => setActiveTab('log')}
                        className={`${activeTab === 'log' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium`}
                    >
                        Transaction Log
                    </button>
                </nav>
            </div>

            {/* Purchase Orders Tab */}
            {activeTab === 'po' && (
                <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-blue-900 mb-2">How to Manage Purchase Orders</h3>
                        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                            <li>Click <strong>"New Purchase Order"</strong> to initiate a stock receipt from a supplier.</li>
                            <li>Select a supplier and enter the expected items and their unit costs.</li>
                            <li>Once items arrive, open the PO and mark them as <strong>"Received"</strong>.</li>
                            <li>Scanning or manually entering serial numbers is required during receipt to update inventory.</li>
                        </ul>
                    </div>
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-medium text-gray-900">Purchase Orders (Stock Receipts)</h2>
                        <Link
                            href="/dashboard/transactions/purchase-orders/new"
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            <Plus className="w-4 h-4" />
                            New Purchase Order
                        </Link>
                    </div>

                    <div className="bg-white shadow overflow-hidden sm:rounded-md">
                        <ul className="divide-y divide-gray-200">
                            {purchaseOrders.map((po) => (
                                <li key={po.id}>
                                    <Link href={`/dashboard/transactions/purchase-orders/${po.id}`} className="block hover:bg-gray-50">
                                        <div className="px-4 py-4 sm:px-6">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center">
                                                    <FileText className="h-5 w-5 text-gray-400 mr-3" />
                                                    <p className="text-sm font-medium text-blue-600 truncate">{po.poNumber}</p>
                                                </div>
                                                <div className="ml-2 flex-shrink-0 flex">
                                                    <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${po.status === 'DRAFT' ? 'bg-gray-100 text-gray-800' : ''}
                            ${po.status === 'SUBMITTED' ? 'bg-yellow-100 text-yellow-800' : ''}
                            ${po.status === 'RECEIVED' ? 'bg-green-100 text-green-800' : ''}
                            ${po.status === 'CANCELLED' ? 'bg-red-100 text-red-800' : ''}
                          `}>
                                                        {po.status}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="mt-2 sm:flex sm:justify-between">
                                                <div className="sm:flex">
                                                    <p className="flex items-center text-sm text-gray-500">
                                                        <Package className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                                                        {po.supplier}
                                                    </p>
                                                    <div className="mt-2 flex flex-col gap-1 text-sm text-gray-500 sm:mt-0 sm:ml-6">
                                                        {po.items.map((item: any) => (
                                                            <div key={item.id} className="flex items-center gap-2">
                                                                <span className="font-medium text-gray-900">{item.product.model || item.product.name}</span>
                                                                <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                                                    {po.status === 'DRAFT' ?
                                                                        `Qty: ${item.quantity}` :
                                                                        `${item.receivedQty.toLocaleString()} / ${item.quantity.toLocaleString()}`
                                                                    }
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                                                    <p className="font-semibold text-gray-900">
                                                        <Currency amount={po.totalAmount} />
                                                    </p>
                                                    <p className="ml-4 text-xs">
                                                        {formatDate(po.createdAt)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                </li>
                            ))}
                            {purchaseOrders.length === 0 && !loading && (
                                <li className="px-4 py-12 text-center text-gray-500">
                                    No purchase orders yet. Create your first PO to track stock receipts.
                                </li>
                            )}
                        </ul>
                    </div>
                </div>
            )}

            {/* Delivery Orders Tab (New) */}
            {activeTab === 'do' && (
                <div className="space-y-4">
                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-indigo-900 mb-2">How to Manage Delivery Orders</h3>
                        <ul className="text-sm text-indigo-700 space-y-1 list-disc list-inside">
                            <li>Create a <strong>Delivery Order</strong> to reserve stock for a customer shipment.</li>
                            <li>Items added to a Delivery Order are reserved and deducted from "Available" stock.</li>
                            <li>You can link a Delivery Order to an existing Invoice or track it independently.</li>
                            <li>Use the <strong>"Print Packing Slip"</strong> feature for physical shipments.</li>
                        </ul>
                    </div>
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-medium text-gray-900">Delivery Orders (Main)</h2>
                        <div className="flex items-center gap-3">
                            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={showDeletedDO}
                                    onChange={(e) => setShowDeletedDO(e.target.checked)}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                Show Deleted
                            </label>
                            <Link
                                href="/dashboard/transactions/delivery-orders/new"
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm"
                            >
                                <Plus className="w-4 h-4" />
                                New Delivery Order
                            </Link>
                        </div>
                    </div>

                    <div className="bg-white shadow overflow-hidden sm:rounded-md">
                        <ul className="divide-y divide-gray-200">
                            {deliveryOrders.filter(o => showDeletedDO || o.isActive !== false).map((order) => (
                                <li key={order.id} className={order.isActive === false ? 'opacity-60 bg-gray-50' : ''}>
                                    <Link href={`/dashboard/transactions/delivery-orders/${order.id}`} className="block hover:bg-gray-50">
                                        <div className="px-4 py-4 sm:px-6">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center">
                                                    <Package className="h-5 w-5 text-gray-400 mr-3" />
                                                    <div className="flex flex-col">
                                                        <p className={`text-sm font-medium ${order.isActive === false ? 'text-gray-500 line-through' : 'text-blue-600'} truncate`}>
                                                            {order.orderNumber}
                                                        </p>
                                                        {order.isActive === false && (
                                                            <span className="text-xs text-red-500 font-bold">DELETED</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="ml-2 flex-shrink-0 flex">
                                                    <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${order.status === 'DRAFT' ? 'bg-gray-100 text-gray-800' : ''}
                            ${order.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-800' : ''}
                            ${order.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : ''}
                            ${order.status === 'CANCELLED' ? 'bg-red-100 text-red-800' : ''}
                          `}>
                                                        {order.status}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="mt-2 sm:flex sm:justify-between">
                                                <div className="sm:flex sm:flex-wrap sm:gap-x-6 sm:gap-y-2">
                                                    <p className="flex items-center text-sm text-gray-900 font-medium">
                                                        {order.customerName}
                                                    </p>
                                                    {order.invoiceNumber && (
                                                        <p className="flex items-center text-sm text-indigo-600 font-medium">
                                                            Inv: {order.invoiceNumber}
                                                        </p>
                                                    )}
                                                    {order.salesRep?.name && (
                                                        <p className="flex items-center text-sm text-gray-500">
                                                            Rep: <span className="ml-1 text-gray-700 font-medium">{order.salesRep.name}</span>
                                                        </p>
                                                    )}
                                                    <p className="flex items-center text-sm text-gray-500">
                                                        {order._count?.items?.toLocaleString() || 0} item(s)
                                                    </p>
                                                </div>
                                                <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                                                    <p className="ml-4 text-xs">
                                                        {formatDate(order.createdAt)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                </li>
                            ))}
                            {deliveryOrders.length === 0 && !loading && (
                                <li className="px-4 py-12 text-center text-gray-500">
                                    No delivery orders yet. Create one to manage shipments.
                                </li>
                            )}
                        </ul>
                    </div>
                </div>
            )}

            {/* Invoices Tab */}
            {activeTab === 'invoice' && (
                <div className="space-y-4">
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-purple-900 mb-2">How to Manage Invoices</h3>
                        <ul className="text-sm text-purple-700 space-y-1 list-disc list-inside">
                            <li>Create an <strong>Invoice</strong> for finalized sales and financial record-keeping.</li>
                            <li>Saving an invoice automatically marks the selected inventory items as <strong>SOLD</strong>.</li>
                            <li>Professional invoices can be printed or emailed directly from the invoice details view.</li>
                            <li>Track payment status (Draft, Issued, Paid, Cancelled) to manage receivables.</li>
                        </ul>
                    </div>
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-medium text-gray-900">Invoices (Financial Documents)</h2>
                        <Link
                            href="/dashboard/transactions/invoices/new"
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            <Plus className="w-4 h-4" />
                            New Invoice
                        </Link>
                    </div>

                    <div className="bg-white shadow overflow-hidden sm:rounded-md">
                        <ul className="divide-y divide-gray-200">
                            {invoices.map((inv) => (
                                <li key={inv.id}>
                                    <Link href={`/dashboard/transactions/invoices/${inv.id}`} className="block hover:bg-gray-50">
                                        <div className="px-4 py-4 sm:px-6">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center">
                                                    <Receipt className="h-5 w-5 text-gray-400 mr-3" />
                                                    <p className="text-sm font-medium text-blue-600 truncate">{inv.invoiceNumber}</p>
                                                </div>
                                                <div className="ml-2 flex-shrink-0 flex">
                                                    <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${inv.status === 'DRAFT' ? 'bg-gray-100 text-gray-800' : ''}
                            ${inv.status === 'ISSUED' ? 'bg-blue-100 text-blue-800' : ''}
                            ${inv.status === 'PAID' ? 'bg-green-100 text-green-800' : ''}
                            ${inv.status === 'CANCELLED' ? 'bg-red-100 text-red-800' : ''}
                          `}>
                                                        {inv.status}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="mt-2 sm:flex sm:justify-between">
                                                <div className="sm:flex">
                                                    <p className="flex items-center text-sm text-gray-500">
                                                        {inv.customerName}
                                                    </p>
                                                    {inv.salesRep?.name && (
                                                        <p className="flex items-center text-sm text-gray-500 sm:ml-6">
                                                            Rep: <span className="ml-1 text-gray-700 font-medium">{inv.salesRep.name}</span>
                                                        </p>
                                                    )}
                                                    <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                                                        {inv.items.length.toLocaleString()} item(s)
                                                    </p>
                                                </div>
                                                <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                                                    <p className="font-semibold text-gray-900">
                                                        <Currency amount={inv.totalAmount} />
                                                    </p>
                                                    <p className="ml-4 text-xs">
                                                        {formatDate(inv.createdAt)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                </li>
                            ))}
                            {invoices.length === 0 && !loading && (
                                <li className="px-4 py-12 text-center text-gray-500">
                                    No delivery orders yet. Create your first delivery order to track sales.
                                </li>
                            )}
                        </ul>
                    </div>
                </div>
            )}

            {/* Transaction Log Tab */}
            {activeTab === 'log' && (
                <div className="space-y-4">
                    {/* ── Toolbar ── */}
                    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3">
                        {/* Search + Date range */}
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search serial, product, notes, performed by…"
                                    className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    value={logSearch}
                                    onChange={e => setLogSearch(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-2 items-center text-sm text-gray-500">
                                <span className="whitespace-nowrap">From</span>
                                <input type="date" value={logDateFrom} onChange={e => setLogDateFrom(e.target.value)}
                                    className="border border-gray-300 rounded-lg px-2 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
                                <span>to</span>
                                <input type="date" value={logDateTo} onChange={e => setLogDateTo(e.target.value)}
                                    className="border border-gray-300 rounded-lg px-2 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
                                <button onClick={() => { setLogDateFrom(''); setLogDateTo(''); setLogSearch(''); setLogType('ALL') }}
                                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-500" title="Clear filters">
                                    <RefreshCw className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Type filter pills */}
                        <div className="flex flex-wrap gap-1.5">
                            <button
                                onClick={() => setLogType('ALL')}
                                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${logType === 'ALL' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                                    }`}
                            >All ({transactionLogs.length})</button>
                            {ALL_TYPES.filter(t => transactionLogs.some(l => l.type === t) || logType === t).map(t => {
                                const cfg = getTypeCfg(t)
                                const count = transactionLogs.filter(l => l.type === t).length
                                if (count === 0 && logType !== t) return null
                                return (
                                    <button
                                        key={t}
                                        onClick={() => setLogType(logType === t ? 'ALL' : t)}
                                        className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${logType === t ? cfg.badge + ' shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                                            }`}
                                    >
                                        {cfg.label} {count > 0 && `(${count})`}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* ── Log list  ── */}
                    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                        {logsLoading && (
                            <div className="p-8 text-center text-sm text-gray-400">Loading…</div>
                        )}
                        {!logsLoading && transactionLogs.length === 0 && (
                            <div className="p-12 text-center text-gray-400">
                                <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                <p className="font-medium">No stock movements found</p>
                                <p className="text-xs mt-1">Try adjusting your search or filters</p>
                            </div>
                        )}
                        {!logsLoading && transactionLogs.length > 0 && (
                            <div className="divide-y divide-gray-100">
                                {transactionLogs.map((log) => {
                                    const cfg = getTypeCfg(log.type)
                                    const Icon = cfg.icon
                                    return (
                                        <div key={log.id} className="flex gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                                            {/* Colored dot + icon */}
                                            <div className="flex-shrink-0 mt-1">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${cfg.badge} border`}>
                                                    <Icon className="w-3.5 h-3.5" />
                                                </div>
                                            </div>

                                            {/* Main content */}
                                            <div className="flex-1 min-w-0">
                                                {/* Row 1: type badge + datetime */}
                                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.badge}`}>
                                                        {cfg.label}
                                                    </span>
                                                    <span className="text-xs text-gray-400 flex-shrink-0">
                                                        {new Date(log.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>

                                                {/* Row 2: product name */}
                                                {(log.product?.name || log.notes) && (
                                                    <p className="mt-1 text-sm font-medium text-gray-900 truncate">
                                                        {log.product?.name ?? ''}
                                                        {log.product?.sku && <span className="ml-2 text-[10px] font-mono text-gray-400">{log.product.sku}</span>}
                                                    </p>
                                                )}

                                                {/* Row 3: key facts inline */}
                                                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                                                    {log.serialNumber && (
                                                        <span className="flex items-center gap-1">
                                                            <Hash className="w-3 h-3 text-gray-400" />
                                                            <span className="font-mono text-gray-700">{log.serialNumber}</span>
                                                        </span>
                                                    )}
                                                    {log.quantity > 0 && (
                                                        <span className="flex items-center gap-1">
                                                            <Layers className="w-3 h-3 text-gray-400" />
                                                            Qty: <strong>{log.quantity}</strong>
                                                        </span>
                                                    )}
                                                    {log.unitCost != null && log.unitCost > 0 && (
                                                        <span className="flex items-center gap-1">
                                                            <DollarSign className="w-3 h-3 text-gray-400" />
                                                            <Currency amount={log.unitCost} className="text-xs font-medium text-gray-700" />
                                                        </span>
                                                    )}
                                                    {(log.fromLocation || log.toLocation) && (
                                                        <span className="flex items-center gap-1">
                                                            <MapPin className="w-3 h-3 text-gray-400" />
                                                            {log.fromLocation && <span className="text-gray-600">{log.fromLocation}</span>}
                                                            {log.fromLocation && log.toLocation && <ArrowRight className="w-3 h-3 text-gray-400" />}
                                                            {log.toLocation && <span className="font-medium text-gray-700">{log.toLocation}</span>}
                                                        </span>
                                                    )}
                                                    {log.referenceType && log.referenceId && (
                                                        <span className="flex items-center gap-1 text-gray-400">
                                                            Ref: <span className="font-mono">{log.referenceType}:{log.referenceId.slice(-8).toUpperCase()}</span>
                                                        </span>
                                                    )}
                                                    {log.performedBy && (
                                                        <span className="flex items-center gap-1">
                                                            <User className="w-3 h-3 text-gray-400" />
                                                            {log.performedBy}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Row 4: notes (if any, gray, small) */}
                                                {log.notes && (
                                                    <p className="mt-1.5 text-xs text-gray-400 italic leading-snug line-clamp-2">{log.notes}</p>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                        {/* Footer */}
                        {!logsLoading && transactionLogs.length >= 300 && (
                            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-400 text-center">
                                Showing most recent 300 entries. Use filters to narrow results.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
