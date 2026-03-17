"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Plus, Search, Archive, RefreshCw, Trash2, Edit } from "lucide-react"
import { formatDate } from "@/lib/utils"
import BackButton from "@/components/BackButton"
import PaginationControls from "@/components/PaginationControls"
import ConfirmModal from "@/components/ConfirmModal"

type Product = {
    id: string
    sku: string
    name: string
    brand: string
    category: string
    model: string
    isActive: boolean
    createdAt: string
    lowResellerPrice: number
    resellerPrice: number
    _count: {
        inventory: number
    }
}

export default function ProductManagementPage() {
    const [products, setProducts] = useState<Product[]>([])
    const [meta, setMeta] = useState<any>({ total: 0, page: 1, limit: 20, totalPages: 0 })
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [debouncedSearch, setDebouncedSearch] = useState("")
    const [showInactive, setShowInactive] = useState(true)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [pendingAction, setPendingAction] = useState<null | {
        title: string; message: string; variant?: 'danger' | 'warning' | 'info'; onConfirm: () => void
    }>(null)
    const [updatedPrices, setUpdatedPrices] = useState<{ [key: string]: { lowResellerPrice?: string, resellerPrice?: string } }>({})

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500)
        return () => clearTimeout(timer)
    }, [searchTerm])

    const fetchProducts = useCallback(async (page: number = 1) => {
        setLoading(true)
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '20',
                search: debouncedSearch,
                includeInactive: showInactive.toString()
            })
            const res = await fetch(`/api/products?${params}`)

            if (!res.ok) throw new Error('Failed to fetch products')

            const data = await res.json()
            setProducts(data.products || [])
            setMeta(data.meta || { total: data.products?.length || 0, page: 1, limit: 20, totalPages: 1 })
        } catch (error) {
            console.error('Failed to fetch products:', error)
            setProducts([])
        } finally {
            setLoading(false)
        }
    }, [debouncedSearch, showInactive])

    useEffect(() => {
        fetchProducts()
    }, [fetchProducts])

    async function handleStatusChange(productId: string, newStatus: boolean) {
        setPendingAction({
            title: newStatus ? 'Activate Product' : 'Deactivate Product',
            message: `Are you sure you want to ${newStatus ? 'activate' : 'deactivate'} this product?`,
            variant: newStatus ? 'info' : 'warning',
            onConfirm: async () => {
                setPendingAction(null)
                setActionLoading(productId)
                try {
                    const res = await fetch(`/api/products/${productId}?type=${newStatus ? 'restore' : 'soft'}`, { method: 'DELETE' })
                    if (!res.ok) throw new Error('Failed to update status')
                    await fetchProducts()
                } catch (error) {
                    console.error('Error:', error)
                } finally {
                    setActionLoading(null)
                }
            }
        })
    }

    async function handleDelete(productId: string) {
        setPendingAction({
            title: 'Permanently Delete Product',
            message: 'Are you sure you want to PERMANENTLY delete this product? This action cannot be undone.',
            variant: 'danger',
            onConfirm: async () => {
                setPendingAction(null)
                setActionLoading(productId)
                try {
                    const res = await fetch(`/api/products/${productId}?type=hard`, { method: 'DELETE' })
                    if (!res.ok) {
                        const data = await res.json()
                        throw new Error(data.error || 'Failed to delete product')
                    }
                    await fetchProducts()
                } catch (error: any) {
                    console.error('Error:', error)
                } finally {
                    setActionLoading(null)
                }
            }
        })
    }
    
    async function handlePriceSave(productId: string) {
        const updates = updatedPrices[productId]
        if (!updates) return; 
        try {
            const res = await fetch(`/api/products/${productId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lowResellerPrice: updates.lowResellerPrice !== undefined ? Number(updates.lowResellerPrice) : undefined,
                    resellerPrice: updates.resellerPrice !== undefined ? Number(updates.resellerPrice) : undefined
                })
            })
            if (!res.ok) throw new Error('Failed to update price')
            
            setProducts(prev => prev.map(p => p.id === productId ? { 
                ...p, 
                lowResellerPrice: updates.lowResellerPrice !== undefined ? Number(updates.lowResellerPrice) : p.lowResellerPrice,
                resellerPrice: updates.resellerPrice !== undefined ? Number(updates.resellerPrice) : p.resellerPrice
            } : p))

            setUpdatedPrices(prev => {
                const next = { ...prev };
                delete next[productId];
                return next;
            });
        } catch (error) {
            console.error('Failed to save prices:', error)
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
            <ConfirmModal
                open={!!pendingAction}
                title={pendingAction?.title ?? ''}
                message={pendingAction?.message ?? ''}
                variant={pendingAction?.variant ?? 'danger'}
                loading={!!actionLoading}
                onConfirm={() => pendingAction?.onConfirm()}
                onCancel={() => setPendingAction(null)}
            />
            <div className="sm:flex sm:items-center sm:justify-between">
                <div>
                    <BackButton className="mb-4" href="/dashboard/settings" />
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
                        className="block w-full pl-10 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    />
                </div>
                <div className="mt-2 text-xs text-gray-400 font-medium px-1 flex justify-between">
                    <span>
                        Showing {products.length} of {meta.total} products
                        {debouncedSearch && ` (filtered)`}
                    </span>
                    <span>Page {meta.page} of {meta.totalPages}</span>
                </div>
            </div>

            <div className="bg-white shadow sm:rounded-2xl border border-gray-200 overflow-hidden flex flex-col flex-1 min-h-[400px]">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-300">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Product</th>
                                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Details</th>
                                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Low Reseller Price</th>
                                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Reseller Price</th>
                                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Created</th>
                                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
                                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Stock</th>
                                <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                                    <span className="sr-only">Actions</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {products.map((product) => (
                                <tr key={product.id} className="hover:bg-gray-50">
                                    <td className="py-4 pl-4 pr-3 text-sm sm:pl-6">
                                        <div className="font-medium text-gray-900">{product.name}</div>
                                        <div className="text-gray-500">{product.sku}</div>
                                    </td>
                                    <td className="px-3 py-4 text-sm text-gray-500">
                                        <div>{product.brand}</div>
                                        <div>{product.category} / {product.model}</div>
                                    </td>
                                    
                                    {/* Low Reseller Price */}
                                    <td className="px-3 py-4 text-sm text-gray-500">
                                        <input
                                            type="text"
                                            value={updatedPrices[product.id]?.lowResellerPrice !== undefined ? updatedPrices[product.id].lowResellerPrice : product.lowResellerPrice}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setUpdatedPrices(prev => ({ ...prev, [product.id]: { ...prev[product.id], lowResellerPrice: val } }));
                                            }}
                                            onBlur={() => handlePriceSave(product.id)}
                                            className="w-24 px-2 py-1 rounded border border-gray-200 text-sm focus:ring-1 focus:ring-blue-500 outline-none font-medium text-gray-700"
                                        />
                                    </td>

                                    {/* Reseller Price */}
                                    <td className="px-3 py-4 text-sm text-gray-500">
                                        <input
                                            type="text"
                                            value={updatedPrices[product.id]?.resellerPrice !== undefined ? updatedPrices[product.id].resellerPrice : product.resellerPrice}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setUpdatedPrices(prev => ({ ...prev, [product.id]: { ...prev[product.id], resellerPrice: val } }));
                                            }}
                                            onBlur={() => handlePriceSave(product.id)}
                                            className="w-24 px-2 py-1 rounded border border-gray-200 text-sm focus:ring-1 focus:ring-blue-500 outline-none font-medium text-gray-700"
                                        />
                                    </td>

                                    <td className="px-3 py-4 text-sm text-gray-500">
                                        {formatDate(product.createdAt)}
                                    </td>
                                    <td className="px-3 py-4 text-sm">
                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-tighter ${product.isActive
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
                <PaginationControls
                    currentPage={meta.page}
                    totalPages={meta.totalPages}
                    onPageChange={fetchProducts}
                    totalResults={meta.total}
                    limit={meta.limit}
                    className="bg-gray-50/50 border-t border-gray-100"
                />
            </div>
        </div>
    )
}
