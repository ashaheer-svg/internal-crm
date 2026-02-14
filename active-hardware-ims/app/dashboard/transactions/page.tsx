"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Plus, FileText, Package, Receipt } from "lucide-react"
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
}

export default function TransactionsPage() {
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
    const [invoices, setInvoices] = useState<Invoice[]>([])
    const [deliveryOrders, setDeliveryOrders] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'po' | 'invoice' | 'do' | 'log'>('po')

    // Add state for filtering deleted orders
    const [showDeletedDO, setShowDeletedDO] = useState(false)

    useEffect(() => {
        fetchPurchaseOrders()
        fetchInvoices()
    }, [])

    // Fetch DOs whenever toggle changes or on mount
    useEffect(() => {
        fetchDeliveryOrders()
    }, [showDeletedDO])

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

    return (
        <div className="space-y-6">
            <div className="sm:flex sm:items-center sm:justify-between">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">Delivery Orders</h1>
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
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-medium text-gray-900">Purchase Orders (Stock Receipts)</h2>
                        <Link
                            href="/dashboard/transactions/purchase-orders/new"
                            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                        >
                            <Plus className="w-4 h-4 mr-2" />
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
                                                                        `${item.receivedQty} / ${item.quantity}`
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
                                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                            >
                                <Plus className="w-4 h-4 mr-2" />
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
                                                        {order._count?.items || 0} item(s)
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
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-medium text-gray-900">Invoices (Financial Documents)</h2>
                        <Link
                            href="/dashboard/transactions/invoices/new"
                            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            New Delivery Order
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
                                                    <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                                                        {inv.items.length} item(s)
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
                <div className="bg-white shadow sm:rounded-lg p-6">
                    <p className="text-sm text-gray-500 text-center py-8">
                        Transaction log viewer coming soon. All stock movements are being logged automatically.
                    </p>
                </div>
            )}
        </div>
    )
}
