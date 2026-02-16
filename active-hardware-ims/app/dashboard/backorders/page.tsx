"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Package, ExternalLink, AlertCircle } from "lucide-react"
import { formatDate } from "@/lib/utils"

type BackorderItem = {
    id: string
    productId: string
    quantityOrdered: number
    quantityFulfilled: number
    status: string
    createdAt: Date
    product: {
        id: string
        sku: string
        name: string
        brand: string
        category: string
    }
    invoice: {
        id: string
        invoiceNumber: string
        customerName: string
        customerId: string
        createdAt: Date
    }
    type?: 'DELIVERY_ORDER' | 'INVOICE'
}

export default function BackordersPage() {
    const [backorders, setBackorders] = useState<BackorderItem[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchBackorders()
    }, [])

    async function fetchBackorders() {
        try {
            const res = await fetch('/api/backorders?status=PENDING&status=PARTIAL')

            if (!res.ok) throw new Error('Failed to fetch backorders')

            const data = await res.json()
            if (Array.isArray(data)) {
                setBackorders(data)
            } else {
                setBackorders([])
            }
        } catch (error) {
            console.error('Failed to fetch backorders:', error)
            setBackorders([])
        } finally {
            setLoading(false)
        }
    }

    // Group by product
    const groupedByProduct = backorders.reduce((acc: Record<string, any>, backorder) => {
        const productId = backorder.productId
        if (!acc[productId]) {
            acc[productId] = {
                product: backorder.product,
                backorders: [],
                totalPending: 0
            }
        }
        acc[productId].backorders.push(backorder)
        acc[productId].totalPending += (backorder.quantityOrdered - backorder.quantityFulfilled)
        return acc
    }, {})

    const productGroups = Object.values(groupedByProduct)
    const totalPendingItems = backorders.reduce((sum: number, b) => sum + (b.quantityOrdered - b.quantityFulfilled), 0)

    if (loading) {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">Backorders</h1>
                <p className="text-center text-gray-500 py-12">Loading backorders...</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Backorders</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Manage and track pending backorder items
                    </p>
                </div>
                <Link
                    href="/dashboard/reports?type=backorder"
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                    Generate Report
                </Link>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <Package className="h-6 w-6 text-amber-600" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">Total Backorders</dt>
                                    <dd className="text-2xl font-semibold text-gray-900">{backorders.length}</dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <AlertCircle className="h-6 w-6 text-amber-600" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">Pending Items</dt>
                                    <dd className="text-2xl font-semibold text-gray-900">{totalPendingItems}</dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <Package className="h-6 w-6 text-blue-600" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">Unique Products</dt>
                                    <dd className="text-2xl font-semibold text-gray-900">{productGroups.length}</dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Backorders List */}
            {backorders.length === 0 ? (
                <div className="bg-white shadow sm:rounded-lg p-12 text-center">
                    <Package className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No pending backorders</h3>
                    <p className="mt-1 text-sm text-gray-500">
                        All orders are fulfilled. Great job!
                    </p>
                </div>
            ) : (
                <div className="bg-white shadow sm:rounded-lg overflow-hidden">
                    <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                        <h2 className="text-lg font-medium text-gray-900">Pending Backorders by Product</h2>
                    </div>
                    <div className="divide-y divide-gray-200">
                        {productGroups.map((group: any) => (
                            <div key={group.product.id} className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h3 className="text-base font-medium text-gray-900">
                                            {group.product.brand} {group.product.name} ({group.product.category})
                                        </h3>
                                        <p className="text-sm text-gray-500">
                                            SKU: {group.product.sku} | Total Pending: {group.totalPending} units
                                        </p>
                                    </div>
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800">
                                        {group.backorders.length} {group.backorders.length === 1 ? 'order' : 'orders'}
                                    </span>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Delivery Order</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order Date</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ordered</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fulfilled</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pending</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {group.backorders.map((backorder: BackorderItem) => (
                                                <tr key={backorder.id} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-blue-600">
                                                        <Link href={backorder.type === 'DELIVERY_ORDER'
                                                            ? `/dashboard/transactions/delivery-orders/${backorder.invoice.id}`
                                                            : `/dashboard/transactions/invoices/${backorder.invoice.id}`}
                                                            className="hover:underline">
                                                            {backorder.invoice.invoiceNumber}
                                                        </Link>
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                                        {backorder.invoice.customerName}
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                                        {formatDate(backorder.invoice.createdAt)}
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                                        {backorder.quantityOrdered}
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-green-600">
                                                        {backorder.quantityFulfilled}
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-amber-600 font-medium">
                                                        {backorder.quantityOrdered - backorder.quantityFulfilled}
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${backorder.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                                                            backorder.status === 'PARTIAL' ? 'bg-blue-100 text-blue-800' :
                                                                'bg-gray-100 text-gray-800'
                                                            }`}>
                                                            {backorder.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm space-x-2">
                                                        <Link
                                                            href={backorder.type === 'DELIVERY_ORDER'
                                                                ? `/dashboard/transactions/delivery-orders/${backorder.invoice.id}`
                                                                : `/dashboard/transactions/invoices/${backorder.invoice.id}`}
                                                            className="text-gray-600 hover:text-gray-900 inline-flex items-center"
                                                        >
                                                            View
                                                            <ExternalLink className="ml-1 h-3 w-3" />
                                                        </Link>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

// Removed unused code
        </div>
    )
}
