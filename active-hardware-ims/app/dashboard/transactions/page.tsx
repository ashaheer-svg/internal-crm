"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Plus, FileText, Package, Receipt } from "lucide-react"

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
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'po' | 'invoice' | 'log'>('po')

    useEffect(() => {
        fetchPurchaseOrders()
        fetchInvoices()
    }, [])

    async function fetchPurchaseOrders() {
        try {
            const res = await fetch('/api/purchase-orders')
            const data = await res.json()
            setPurchaseOrders(data)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
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
                                                    <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                                                        {po.items.length} item(s)
                                                    </p>
                                                </div>
                                                <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                                                    <p className="font-semibold text-gray-900">
                                                        Rs. {po.totalAmount.toFixed(2)}
                                                    </p>
                                                    <p className="ml-4 text-xs">
                                                        {new Date(po.createdAt).toLocaleDateString()}
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

            {/* Invoices Tab */}
            {activeTab === 'invoice' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-medium text-gray-900">Invoices (Stock Issues)</h2>
                        <Link
                            href="/dashboard/transactions/invoices/new"
                            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                        >
                            <Plus className="w-4 h-4 mr-2" />
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
                                                    <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                                                        {inv.items.length} item(s)
                                                    </p>
                                                </div>
                                                <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                                                    <p className="font-semibold text-gray-900">
                                                        Rs. {inv.totalAmount.toFixed(2)}
                                                    </p>
                                                    <p className="ml-4 text-xs">
                                                        {new Date(inv.createdAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                </li>
                            ))}
                            {invoices.length === 0 && !loading && (
                                <li className="px-4 py-12 text-center text-gray-500">
                                    No invoices yet. Create your first invoice to track sales.
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
