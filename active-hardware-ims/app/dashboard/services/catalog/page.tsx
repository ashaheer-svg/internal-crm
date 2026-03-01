"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Plus, Search, ChevronUp, ChevronDown } from "lucide-react"
import BackButton from "@/components/BackButton"

type ServiceProduct = {
    id: string
    sku: string
    name: string
    brand: string
    category: string
    model: string
    isActive: boolean
    serviceDefinition?: {
        type: string
        durationValue: number
        durationUnit: string
        billingCycle?: string
    }
}

export default function ServiceCatalogPage() {
    const [products, setProducts] = useState<ServiceProduct[]>([])
    const [filteredProducts, setFilteredProducts] = useState<ServiceProduct[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [currentPage, setCurrentPage] = useState(1)
    const [showInactive, setShowInactive] = useState(false)
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'sku', direction: 'asc' })
    const itemsPerPage = 20

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
        ).sort((a, b) => {
            if (!sortConfig) return 0
            const aValue = getSortValue(a, sortConfig.key)
            const bValue = getSortValue(b, sortConfig.key)
            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
            return 0
        })
        setFilteredProducts(filtered)
        setCurrentPage(1)
    }, [searchTerm, products, sortConfig])

    function getSortValue(product: ServiceProduct, key: string) {
        switch (key) {
            case 'sku': return product.sku.toLowerCase()
            case 'name': return product.name.toLowerCase()
            case 'type': return (product.serviceDefinition?.type || 'SERVICE').toLowerCase()
            case 'duration': return product.serviceDefinition?.durationValue || 0
            case 'billing': return (product.serviceDefinition?.billingCycle || 'Manual').toLowerCase()
            case 'status': return product.isActive ? 1 : 0
            default: return 0
        }
    }

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc'
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc'
        }
        setSortConfig({ key, direction })
    }

    const SortIcon = ({ column }: { column: string }) => {
        if (!sortConfig || sortConfig.key !== column) return <div className="w-4 h-4 ml-1 inline-block" />
        return sortConfig.direction === 'asc'
            ? <ChevronUp className="w-4 h-4 ml-1 inline-block text-blue-600" />
            : <ChevronDown className="w-4 h-4 ml-1 inline-block text-blue-600" />
    }

    async function fetchProducts() {
        try {
            const url = showInactive
                ? '/api/products?type=service&includeInactive=true'
                : '/api/products?type=service'
            const res = await fetch(url)

            if (!res.ok) {
                throw new Error('Failed to fetch services')
            }

            const data = await res.json()
            setProducts(data)
            setFilteredProducts(data)
        } catch (error) {
            console.error('Failed to fetch services:', error)
        } finally {
            setLoading(false)
        }
    }

    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const currentProducts = filteredProducts.slice(startIndex, endIndex)

    const goToPage = (page: number) => {
        setCurrentPage(Math.max(1, Math.min(page, totalPages)))
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <p className="text-gray-500">Loading service catalog...</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="sm:flex sm:items-center sm:justify-between">
                <div>
                    <BackButton className="mb-4" />
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Service Catalog</h1>
                </div>
                <div className="flex items-center gap-2">
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
                </div>
                <div className="flex items-center gap-2">
                    <Link
                        href="/dashboard/services/catalog/new"
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Service Package
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
                        placeholder="Search services..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 rounded-lg border border-gray-200 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                </div>
            </div>

            <div className="mt-8 flow-root">
                <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                            <table className="min-w-full divide-y divide-gray-300">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th
                                            scope="col"
                                            className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 cursor-pointer hover:bg-gray-100"
                                            onClick={() => handleSort('sku')}
                                        >
                                            SKU
                                            <SortIcon column="sku" />
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                                            onClick={() => handleSort('name')}
                                        >
                                            Package Name
                                            <SortIcon column="name" />
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                                            onClick={() => handleSort('type')}
                                        >
                                            Type
                                            <SortIcon column="type" />
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                                            onClick={() => handleSort('duration')}
                                        >
                                            Duration
                                            <SortIcon column="duration" />
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                                            onClick={() => handleSort('billing')}
                                        >
                                            Billing
                                            <SortIcon column="billing" />
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                                            onClick={() => handleSort('status')}
                                        >
                                            Status
                                            <SortIcon column="status" />
                                        </th>
                                        <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                                            <span className="sr-only">Edit</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {currentProducts.map((product) => (
                                        <tr key={product.id} className="hover:bg-gray-50">
                                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">{product.sku}</td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{product.name}</td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                                                    {product.serviceDefinition?.type || 'SERVICE'}
                                                </span>
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                {product.serviceDefinition ? `${product.serviceDefinition.durationValue} ${product.serviceDefinition.durationUnit}` : '-'}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                {product.serviceDefinition?.billingCycle || 'Manual'}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm">
                                                <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${product.isActive
                                                    ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20'
                                                    : 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20'
                                                    }`}>
                                                    {product.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                                <div className="flex justify-end gap-2">
                                                    <Link href={`/dashboard/services/catalog/${product.id}/edit`} className="text-blue-600 hover:text-blue-900">
                                                        Edit
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {currentProducts.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="py-8 text-center text-sm text-gray-500">
                                                {searchTerm ? 'No services found matching your search.' : 'No service packages found. Create your first package.'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
