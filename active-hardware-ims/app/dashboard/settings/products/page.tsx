"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Plus, Search, Archive, RefreshCw, Trash2, Edit } from "lucide-react"
import { formatDate } from "@/lib/utils"
import BackButton from "@/components/BackButton"

type Product = {
    id: string
    sku: string
    name: string
    brand: string
    category: string
    model: string
    isActive: boolean
    createdAt: string
    _count: {
        inventory: number
    }
}

export default function ProductManagementPage() {
    const [products, setProducts] = useState<Product[]>([])
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [showInactive, setShowInactive] = useState(true) // Default to showing inactive
    const [actionLoading, setActionLoading] = useState<string | null>(null)

    useEffect(() => {
        fetchProducts()
    }, [showInactive])

    useEffect(() => {
        const filtered = products.filter(product =>
            product.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.sku.toLowerCase().includes(searchTerm.toLowerCase())
        )
        setFilteredProducts(filtered)
    }, [searchTerm, products])

    async function fetchProducts() {
        setLoading(true)
        try {
            const url = showInactive ? '/api/products?includeInactive=true' : '/api/products'
            const res = await fetch(url)

            if (!res.ok) throw new Error('Failed to fetch products')

            const data = await res.json()
            if (Array.isArray(data)) {
                setProducts(data)
                setFilteredProducts(data)
            } else {
                setProducts([])
                console.error('Invalid products data:', data)
            }
        } catch (error) {
            console.error('Failed to fetch products:', error)
            setProducts([])
        } finally {
            setLoading(false)
        }
    }

    async function handleStatusChange(productId: string, newStatus: boolean) {
        if (!confirm(`Are you sure you want to ${newStatus ? 'activate' : 'deactivate'} this product?`)) return

        setActionLoading(productId)
        try {
            const res = await fetch(`/api/products/${productId}?type=${newStatus ? 'restore' : 'soft'}`, {
                method: 'DELETE'
            })

            if (!res.ok) throw new Error('Failed to update status')

            await fetchProducts()
        } catch (error) {
            console.error('Error:', error)
            alert('Failed to update product status')
        } finally {
            setActionLoading(null)
        }
    }

    async function handleDelete(productId: string) {
        if (!confirm('Are you sure you want to PERMANENTLY delete this product? This action cannot be undone.')) return

        setActionLoading(productId)
        try {
            const res = await fetch(`/api/products/${productId}?type=hard`, {
                method: 'DELETE'
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Failed to delete product')
            }

            await fetchProducts()
        } catch (error: any) {
            console.error('Error:', error)
            alert(error.message)
        } finally {
            setActionLoading(null)
        }
    }

    if (loading && products.length === 0) {
        return (
            <div className="flex justify-center items-center h-64">
                <p className="text-gray-500">Loading products...</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="sm:flex sm:items-center sm:justify-between">
                <div>
                    <BackButton className="mb-4" />
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Product Management</h1>
                    <p className="mt-1 text-sm text-gray-500">Admin view for managing all products.</p>
                </div>
                <div className="flex items-center gap-4">
                    <label className="inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={showInactive}
                            onChange={(e) => setShowInactive(e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        <span className="ms-3 text-sm font-medium text-gray-700">Show Inactive</span>
                    </label>
                    <Link
                        href="/dashboard/inventory/new"
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Product
                    </Link>
                </div>
            </div>

            <div className="bg-white shadow sm:rounded-lg p-4">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search products..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                </div>
            </div>

            <div className="bg-white shadow sm:rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Product</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Details</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Created</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Stock</th>
                            <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                                <span className="sr-only">Actions</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {filteredProducts.map((product) => (
                            <tr key={product.id} className="hover:bg-gray-50">
                                <td className="py-4 pl-4 pr-3 text-sm sm:pl-6">
                                    <div className="font-medium text-gray-900">{product.name}</div>
                                    <div className="text-gray-500">{product.sku}</div>
                                </td>
                                <td className="px-3 py-4 text-sm text-gray-500">
                                    <div>{product.brand}</div>
                                    <div>{product.category} / {product.model}</div>
                                </td>
                                <td className="px-3 py-4 text-sm text-gray-500">
                                    {formatDate(product.createdAt)}
                                </td>
                                <td className="px-3 py-4 text-sm">
                                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${product.isActive
                                        ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20'
                                        : 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20'
                                        }`}>
                                        {product.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td className="px-3 py-4 text-sm text-gray-500">
                                    {product._count.inventory} units
                                </td>
                                <td className="relative py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                    <div className="flex justify-end gap-2">
                                        <Link href={`/dashboard/inventory/${product.id}/edit`} className="text-blue-600 hover:text-blue-900 p-1" title="Edit">
                                            <Edit className="w-4 h-4" />
                                        </Link>

                                        {product.isActive ? (
                                            <button
                                                onClick={() => handleStatusChange(product.id, false)}
                                                className="text-amber-600 hover:text-amber-900 p-1"
                                                title="Deactivate"
                                                disabled={actionLoading === product.id}
                                            >
                                                <Archive className="w-4 h-4" />
                                            </button>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => handleStatusChange(product.id, true)}
                                                    className="text-green-600 hover:text-green-900 p-1"
                                                    title="Activate"
                                                    disabled={actionLoading === product.id}
                                                >
                                                    <RefreshCw className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(product.id)}
                                                    className="text-red-600 hover:text-red-900 p-1"
                                                    title="Delete Permanently"
                                                    disabled={actionLoading === product.id}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
