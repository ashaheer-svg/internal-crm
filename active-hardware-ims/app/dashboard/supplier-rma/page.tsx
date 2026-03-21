"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Search, Package, Printer, Ship } from "lucide-react"
import { formatDate } from "@/lib/utils"

type SupplierRma = {
    id: string
    rmaNumber: string
    supplierRmaRef: string | null
    status: string
    createdAt: string
    supplier: { name: string }
    defectiveItem?: {
        serialNumber: string
        product: { name: string; brand: string; model: string }
    } | null
    warrantyClaims?: Array<{
        inventoryItem: {
            serialNumber: string
            product: { name: string; brand: string; model: string }
        }
    }>
}

export default function SupplierRmaPage() {
    const router = useRouter()
    const [rmaCases, setRmaCases] = useState<SupplierRma[]>([])
    const [filteredCases, setFilteredCases] = useState<SupplierRma[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<string>('all')
    const [searchTerm, setSearchTerm] = useState("")

    useEffect(() => {
        fetchCases()
    }, [])

    useEffect(() => {
        filterCases()
    }, [rmaCases, activeTab, searchTerm])

    async function fetchCases() {
        try {
            const res = await fetch('/api/supplier-rma')
            const data = await res.json()
            setRmaCases(data)
        } catch (error) {
            console.error('Failed to fetch supplier RMA cases:', error)
        } finally {
            setLoading(false)
        }
    }

    function filterCases() {
        let filtered = rmaCases

        if (activeTab !== 'all') {
            filtered = filtered.filter(c => c.status === activeTab)
        }

        if (searchTerm) {
            filtered = filtered.filter(c =>
                c.rmaNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (c.supplierRmaRef && c.supplierRmaRef.toLowerCase().includes(searchTerm.toLowerCase())) ||
                c.supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (c.defectiveItem && c.defectiveItem.serialNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (c.warrantyClaims && c.warrantyClaims.some(wc => wc.inventoryItem.serialNumber.toLowerCase().includes(searchTerm.toLowerCase())))
            )
        }

        setFilteredCases(filtered)
    }

    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'OPEN': return 'bg-yellow-100 text-yellow-800'
            case 'SHIPPED': return 'bg-blue-100 text-blue-800'
            case 'RESOLVED': return 'bg-green-100 text-green-800'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    const statusCounts = {
        all: rmaCases.length,
        OPEN: rmaCases.filter(c => c.status === 'OPEN').length,
        SHIPPED: rmaCases.filter(c => c.status === 'SHIPPED').length,
        RESOLVED: rmaCases.filter(c => c.status === 'RESOLVED').length,
    }

    if (loading) {
        return <div className="flex justify-center items-center h-64 text-gray-500">Loading Cases...</div>
    }

    return (
        <div className="space-y-6">
            <div className="sm:flex sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Supplier RMAs</h1>
                    <p className="mt-1 text-sm text-gray-500">Manage outbound vendor return cases</p>
                </div>
                <div className="mt-4 sm:mt-0 sm:flex-none">
                    <Link
                        href="/dashboard/supplier-rma/new"
                        className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                    >
                        Create Bulk RMA
                    </Link>
                </div>
            </div>

            {/* Search */}
            <div className="bg-white shadow sm:rounded-lg p-4">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search by RMA #, Supplier, or Serial..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 rounded-lg border border-gray-200 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    {['all', 'OPEN', 'SHIPPED', 'RESOLVED'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`${activeTab === tab ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium`}
                        >
                            {tab === 'all' ? 'All' : tab} ({statusCounts[tab as keyof typeof statusCounts]})
                        </button>
                    ))}
                </nav>
            </div>

            {/* Table */}
            <div className="bg-white shadow sm:rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">RMA #</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item / Serial</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                            <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredCases.map((c) => (
                            <tr key={c.id} className="hover:bg-gray-50 cursor-pointer">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {c.rmaNumber}
                                    {c.supplierRmaRef && <div className="text-xs text-gray-500">Ref: {c.supplierRmaRef}</div>}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{c.supplier.name}</td>
                                 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {c.warrantyClaims && c.warrantyClaims.length > 0 ? (
                                        <div>
                                            <div className="font-semibold text-blue-600">{c.warrantyClaims.length} Item(s)</div>
                                            <div className="text-xs text-gray-600 truncate max-w-xs">
                                                {c.warrantyClaims.map(wc => wc.inventoryItem.product.name).join(', ')}
                                            </div>
                                        </div>
                                    ) : c.defectiveItem ? (
                                        <div>
                                            <div className="font-semibold">{c.defectiveItem.product.brand} {c.defectiveItem.product.name}</div>
                                            <div className="text-xs font-mono">{c.defectiveItem.serialNumber}</div>
                                        </div>
                                    ) : (
                                        <div className="text-gray-400">No items</div>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs font-semibold rounded-full ${getStatusBadgeClass(c.status)}`}>
                                        {c.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(c.createdAt)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                    <button 
                                        onClick={() => window.open(`/dashboard/supplier-rma/${c.id}/print`, '_blank')}
                                        className="text-gray-400 hover:text-blue-500 mr-2"
                                        title="Print Pack Slip"
                                    >
                                        <Printer className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
