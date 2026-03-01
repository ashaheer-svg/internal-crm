"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Plus, ArrowDownToLine, ArrowUpFromLine, ArrowRightLeft } from "lucide-react"

type Product = {
    id: string
    sku: string
    name: string
    brand: string
    category: string
    inventory: any[]
    _count: {
        inventory: number
    }
}

export default function StockMovementsPage() {
    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'inward' | 'outward' | 'transfer'>('inward')

    useEffect(() => {
        fetchProducts()
    }, [])

    async function fetchProducts() {
        try {
            const res = await fetch('/api/products')

            if (!res.ok) throw new Error('Failed to fetch products')

            const data = await res.json()
            const prods = data.products || (Array.isArray(data) ? data : [])
            setProducts(prods)
        } catch (error) {
            console.error(error)
            setProducts([])
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="sm:flex sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Stock Movements</h1>
                    <p className="mt-1 text-sm text-gray-500">Manage inward receipts, outward issues, and internal transfers</p>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('inward')}
                        className={`${activeTab === 'inward' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium flex items-center gap-2`}
                    >
                        <ArrowDownToLine className="w-4 h-4" />
                        Inward Stock
                    </button>
                    <button
                        onClick={() => setActiveTab('outward')}
                        className={`${activeTab === 'outward' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium flex items-center gap-2`}
                    >
                        <ArrowUpFromLine className="w-4 h-4" />
                        Outward Stock
                    </button>
                    <button
                        onClick={() => setActiveTab('transfer')}
                        className={`${activeTab === 'transfer' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium flex items-center gap-2`}
                    >
                        <ArrowRightLeft className="w-4 h-4" />
                        Internal Transfers
                    </button>
                </nav>
            </div>

            {/* Inward Stock Tab */}
            {activeTab === 'inward' && (
                <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-blue-900 mb-2">How to Add Inward Stock</h3>
                        <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                            <li>Create a Purchase Order in Transactions (optional but recommended)</li>
                            <li>Go to Inventory → Select the product</li>
                            <li>Use the "Add Inventory (Inward)" form on the right side</li>
                            <li>Enter serial number, location, and unit cost</li>
                            <li>Stock will be marked as AVAILABLE</li>
                        </ol>
                    </div>

                    <div className="bg-white shadow sm:rounded-lg p-6">
                        <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Access to Products</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {products.slice(0, 9).map((product) => (
                                <Link
                                    key={product.id}
                                    href={`/dashboard/inventory/${product.id}`}
                                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                                >
                                    <p className="font-medium text-gray-900">{product.name}</p>
                                    <p className="text-sm text-gray-500">SKU: {product.sku} | Cat: {product.category}</p>
                                    <p className="text-sm text-blue-600 mt-2">
                                        Current Stock: {product.inventory?.length || 0} units
                                    </p>
                                </Link>
                            ))}
                        </div>
                        <div className="mt-4">
                            <Link
                                href="/dashboard/inventory"
                                className="text-sm text-blue-600 hover:text-blue-800"
                            >
                                View all products →
                            </Link>
                        </div>
                    </div>
                </div>
            )}

            {/* Outward Stock Tab */}
            {activeTab === 'outward' && (
                <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-green-900 mb-2">How to Issue Outward Stock (Sales)</h3>
                        <ol className="text-sm text-green-700 space-y-1 list-decimal list-inside">
                            <li>Go to Transactions → Invoices tab</li>
                            <li>Click "New Invoice"</li>
                            <li>Enter customer details</li>
                            <li>Select items from available inventory (right panel)</li>
                            <li>Set selling price for each item</li>
                            <li>Create invoice - items will be marked as SOLD</li>
                        </ol>
                    </div>

                    <div className="bg-white shadow sm:rounded-lg p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-medium text-gray-900">Create New Invoice</h2>
                            <Link
                                href="/dashboard/transactions/invoices/new"
                                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                New Invoice
                            </Link>
                        </div>
                        <p className="text-sm text-gray-500">
                            Create invoices to issue stock to customers. The system will automatically mark items as sold and create transaction logs.
                        </p>
                    </div>

                    <div className="bg-white shadow sm:rounded-lg p-6">
                        <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Invoices</h2>
                        <Link
                            href="/dashboard/transactions"
                            className="text-sm text-blue-600 hover:text-blue-800"
                        >
                            View all invoices →
                        </Link>
                    </div>
                </div>
            )}

            {/* Internal Transfers Tab */}
            {activeTab === 'transfer' && (
                <div className="space-y-4">
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-purple-900 mb-2">How to Transfer Stock Between Locations</h3>
                        <ol className="text-sm text-purple-700 space-y-1 list-decimal list-inside">
                            <li>Go to Inventory → Select the product</li>
                            <li>Find the item you want to transfer in the inventory table</li>
                            <li>Click the "Transfer" button in the Actions column</li>
                            <li>Select the destination location</li>
                            <li>Confirm the transfer</li>
                        </ol>
                    </div>

                    <div className="bg-white shadow sm:rounded-lg p-6">
                        <h2 className="text-lg font-medium text-gray-900 mb-4">Products with Inventory</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {products.filter(p => p.inventory?.length > 0).slice(0, 9).map((product) => (
                                <Link
                                    key={product.id}
                                    href={`/dashboard/inventory/${product.id}`}
                                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                                >
                                    <p className="font-medium text-gray-900">{product.name}</p>
                                    <p className="text-sm text-gray-500">SKU: {product.sku} | Cat: {product.category}</p>
                                    <p className="text-sm text-purple-600 mt-2">
                                        {product.inventory.length} units available for transfer
                                    </p>
                                </Link>
                            ))}
                        </div>
                        {products.filter(p => p.inventory?.length > 0).length === 0 && (
                            <p className="text-sm text-gray-500 text-center py-8">
                                No inventory available for transfer. Add stock first.
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
