"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Plus, Printer, Search, Package } from "lucide-react"
import { cn } from "@/lib/utils"
import SortIcon from "@/components/SortIcon"
import PaginationControls from "@/components/PaginationControls"

type Product = {
    id: string
    sku: string
    name: string
    brand: string
    category: string
    model: string
    isActive: boolean
    _count: {
        inventory: number
    }
}

export default function InventoryPage() {
    const [products, setProducts] = useState<Product[]>([])
    const [meta, setMeta] = useState<any>({ total: 0, page: 1, limit: 20, totalPages: 0 })
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [debouncedSearch, setDebouncedSearch] = useState("")
    const [showInactive, setShowInactive] = useState(false)
    const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' })

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
                sortKey: sort.key,
                sortDir: sort.direction,
                includeInactive: showInactive.toString()
            })
            const res = await fetch(`/api/products?${params}`)

            if (!res.ok) {
                throw new Error('Failed to fetch products')
            }

            const data = await res.json()
            setProducts(data.products)
            setMeta(data.meta || { total: data.products.length, page: 1, limit: 20, totalPages: 1 })
        } catch (error) {
            console.error('Failed to fetch products:', error)
        } finally {
            setLoading(false)
        }
    }, [debouncedSearch, sort, showInactive])

    useEffect(() => {
        fetchProducts()
    }, [fetchProducts])

    const handleSort = (key: string) => {
        setSort(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }))
    }

    return (
        <div className="space-y-6">
            <div className="sm:flex sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Inventory Management</h1>
                    <p className="text-sm text-gray-500 mt-1">Track and manage your physical stock and service components</p>
                </div>
                <div className="flex items-center gap-4 mt-4 sm:mt-0">
                    <div className="flex p-1 bg-gray-100/80 rounded-xl border border-gray-200 shadow-sm backdrop-blur-sm">
                        <button
                            onClick={() => setShowInactive(false)}
                            className={cn(
                                "px-4 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200",
                                !showInactive
                                    ? "bg-white text-blue-600 shadow-sm ring-1 ring-black/5"
                                    : "text-gray-500 hover:text-gray-700"
                            )}
                        >
                            Active Only
                        </button>
                        <button
                            onClick={() => setShowInactive(true)}
                            className={cn(
                                "px-4 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200",
                                showInactive
                                    ? "bg-white text-blue-600 shadow-sm ring-1 ring-black/5"
                                    : "text-gray-500 hover:text-gray-700"
                            )}
                        >
                            All Products
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <Link
                            href="/dashboard/inventory/price-list"
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                        >
                            <Printer className="w-4 h-4" />
                            Price List
                        </Link>
                        <Link
                            href="/dashboard/inventory/new"
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            <Plus className="w-4 h-4" />
                            Add Product
                        </Link>
                    </div>
                </div>
            </div>

            {/* Search Bar */}
            <div className="bg-white shadow-sm sm:rounded-2xl border border-gray-200 p-4">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search by brand, category, model, name, or SKU..."
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

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden min-h-[400px]">
                {loading ? (
                    <div className="flex flex-col justify-center items-center h-64 gap-3">
                        <Package className="w-8 h-8 text-blue-500 animate-pulse" />
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Scanning Inventory...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50/50">
                                <tr>
                                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider sm:pl-6 leading-none">
                                        <SortIcon sort={sort} column="sku" label="SKU" onSort={handleSort} />
                                    </th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider leading-none">
                                        <SortIcon sort={sort} column="name" label="Product Name" onSort={handleSort} />
                                    </th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider leading-none">
                                        <SortIcon sort={sort} column="brand" label="Brand" onSort={handleSort} />
                                    </th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider leading-none">
                                        <SortIcon sort={sort} column="category" label="Category" onSort={handleSort} />
                                    </th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider leading-none">
                                        <SortIcon sort={sort} column="model" label="Model" onSort={handleSort} />
                                    </th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider leading-none">
                                        <SortIcon sort={sort} column="status" label="Status" onSort={handleSort} />
                                    </th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider leading-none">
                                        <SortIcon sort={sort} column="stock" label="Total Stock" onSort={handleSort} />
                                    </th>
                                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                                        <span className="sr-only">Edit</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {products.map((product) => (
                                    <tr key={product.id} className="hover:bg-gray-50/80 transition-colors group">
                                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-bold text-gray-900 sm:pl-6">{product.sku}</td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-600 font-medium">{product.name}</td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{product.brand}</td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{product.category}</td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{product.model}</td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                                            <span className={cn(
                                                "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-tighter",
                                                product.isActive
                                                    ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20'
                                                    : 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20'
                                            )}>
                                                {product.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 font-bold">
                                            {product._count.inventory.toLocaleString()}
                                        </td>
                                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Link href={`/dashboard/inventory/${product.id}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-blue-600 hover:bg-blue-50 transition-colors">
                                                    Manage Details
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {products.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan={8} className="py-20 text-center">
                                            <div className="flex flex-col items-center gap-2">
                                                <Package className="w-10 h-10 text-gray-200" />
                                                <p className="text-gray-400 font-medium">
                                                    {searchTerm ? 'No products found matching your search.' : 'No products found. Add your first product.'}
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
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
