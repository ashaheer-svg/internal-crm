"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus, Search, AlertTriangle } from "lucide-react"
import { formatDate } from "@/lib/utils"

type WarrantyClaim = {
    id: string
    customerName: string
    description: string
    status: string
    createdAt: string
    updatedAt: string
    inventoryItem: {
        id: string
        serialNumber: string
        product: {
            name: string
            brand: string
            category: string
            model: string
        }
    }
    replacementItemId?: string | null
    replacementExternalInfo?: string | null
    replacementType?: string | null
}

export default function WarrantyPage() {
    const router = useRouter()
    const [claims, setClaims] = useState<WarrantyClaim[]>([])
    const [filteredClaims, setFilteredClaims] = useState<WarrantyClaim[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<string>('all')
    const [searchTerm, setSearchTerm] = useState("")

    // Build rejection alerts
    const [buildRejections, setBuildRejections] = useState<any[]>([])

    useEffect(() => {
        fetchClaims()
        fetchBuildRejections()
    }, [])

    useEffect(() => {
        filterClaims()
    }, [claims, activeTab, searchTerm])

    async function fetchClaims() {
        try {
            const res = await fetch('/api/warranty')
            const data = await res.json()
            setClaims(data)
        } catch (error) {
            console.error('Failed to fetch warranty claims:', error)
        } finally {
            setLoading(false)
        }
    }

    async function fetchBuildRejections() {
        try {
            const res = await fetch('/api/build-rejections/active')
            if (res.ok) {
                const data = await res.json()
                setBuildRejections(data.rejections || [])
            }
        } catch (e) {
            console.error('Failed to fetch build rejections', e)
        }
    }

    async function handleDismissRejection(rejectionId: string, doId: string) {
        try {
            await fetch(`/api/delivery-orders/${doId}/build-rejections/${rejectionId}`, {
                method: 'PATCH'
            })
            setBuildRejections(prev => prev.filter(r => r.id !== rejectionId))
        } catch (e) {
            console.error('Failed to dismiss rejection', e)
        }
    }

    function filterClaims() {
        let filtered = claims

        // Filter by status tab
        if (activeTab !== 'all') {
            filtered = filtered.filter(claim => claim.status === activeTab)
        }

        // Filter by search term
        if (searchTerm) {
            filtered = filtered.filter(claim =>
                claim.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                claim.inventoryItem.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                claim.inventoryItem.product.name.toLowerCase().includes(searchTerm.toLowerCase())
            )
        }

        setFilteredClaims(filtered)
    }

    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'PENDING':
                return 'bg-yellow-100 text-yellow-800'
            case 'IN_PROGRESS':
                return 'bg-blue-100 text-blue-800'
            case 'AWAITING_SUPPLIER':
                return 'bg-orange-100 text-orange-800'
            case 'RESOLVED':
                return 'bg-green-100 text-green-800'
            case 'CLOSED':
                return 'bg-gray-100 text-gray-800'
            default:
                return 'bg-gray-100 text-gray-800'
        }
    }

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'IN_PROGRESS':
                return 'In Progress'
            case 'AWAITING_SUPPLIER':
                return 'Awaiting Supplier'
            default:
                return status.charAt(0) + status.slice(1).toLowerCase()
        }
    }

    const statusCounts = {
        all: claims.length,
        PENDING: claims.filter(c => c.status === 'PENDING').length,
        IN_PROGRESS: claims.filter(c => c.status === 'IN_PROGRESS').length,
        AWAITING_SUPPLIER: claims.filter(c => c.status === 'AWAITING_SUPPLIER').length,
        RESOLVED: claims.filter(c => c.status === 'RESOLVED').length,
        CLOSED: claims.filter(c => c.status === 'CLOSED').length,
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <p className="text-gray-500">Loading warranty claims...</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="sm:flex sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Warranty & RMA</h1>
                    <p className="mt-1 text-sm text-gray-500">Manage warranty claims and RMA requests</p>
                </div>
                <div className="mt-4 sm:mt-0 flex items-center gap-2">
                    <Link
                        href="/dashboard/warranty/new"
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        New Claim
                    </Link>
                    <Link
                        href="/dashboard/warranty/lookup"
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                    >
                        <Search className="w-4 h-4" />
                        Lookup
                    </Link>
                </div>
            </div>

            {/* ── Build Rejection Alert Banner ── */}
            {buildRejections.length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 overflow-hidden">
                    <div className="px-4 py-3 flex items-center justify-between border-b border-red-200">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                            <span className="text-sm font-semibold text-red-800">
                                {buildRejections.length} item{buildRejections.length > 1 ? 's' : ''} rejected during technical build — potential fault
                            </span>
                        </div>
                        <span className="text-xs text-red-500 italic">Dismiss if not a defect</span>
                    </div>
                    <ul className="divide-y divide-red-100">
                        {buildRejections.map((r) => (
                            <li key={r.id} className="px-4 py-3 flex items-start gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-mono text-sm font-bold text-red-800">{r.serialNumber}</span>
                                        <span className="text-xs text-gray-500">
                                            · DO {r.deliveryOrder?.orderNumber}
                                            · Rejected by {r.rejectedByName}
                                            · {new Date(r.rejectedAt).toLocaleString()}
                                        </span>
                                    </div>
                                    {r.comment && (
                                        <p className="text-xs text-red-700 mt-1">
                                            <span className="font-semibold">Reason:</span> {r.comment}
                                        </p>
                                    )}
                                </div>
                                <div className="flex gap-2 flex-shrink-0">
                                    <Link
                                        href={`/dashboard/warranty/new?serial=${encodeURIComponent(r.serialNumber)}`}
                                        className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                                    >
                                        + Claim
                                    </Link>
                                    <button
                                        onClick={() => handleDismissRejection(r.id, r.deliveryOrder?.id)}
                                        className="text-xs px-2 py-1 rounded border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 transition-colors"
                                    >
                                        Dismiss
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            {/* Search Bar */}
            <div className="bg-white shadow sm:rounded-lg p-4">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search by customer name, serial number, or product..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 rounded-lg border border-gray-200 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                </div>
            </div>

            {/* Status Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`${activeTab === 'all' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium`}
                    >
                        All Claims ({statusCounts.all})
                    </button>
                    <button
                        onClick={() => setActiveTab('PENDING')}
                        className={`${activeTab === 'PENDING' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium`}
                    >
                        Pending ({statusCounts.PENDING})
                    </button>
                    <button
                        onClick={() => setActiveTab('IN_PROGRESS')}
                        className={`${activeTab === 'IN_PROGRESS' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium`}
                    >
                        In Progress ({statusCounts.IN_PROGRESS})
                    </button>
                    <button
                        onClick={() => setActiveTab('AWAITING_SUPPLIER')}
                        className={`${activeTab === 'AWAITING_SUPPLIER' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium`}
                    >
                        Awaiting Supplier ({statusCounts.AWAITING_SUPPLIER})
                    </button>
                    <button
                        onClick={() => setActiveTab('RESOLVED')}
                        className={`${activeTab === 'RESOLVED' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium`}
                    >
                        Resolved ({statusCounts.RESOLVED})
                    </button>
                    <button
                        onClick={() => setActiveTab('CLOSED')}
                        className={`${activeTab === 'CLOSED' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium`}
                    >
                        Closed ({statusCounts.CLOSED})
                    </button>
                </nav>
            </div>

            {/* Claims Table */}
            <div className="bg-white shadow sm:rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Claim ID</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Serial Number</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                            <th scope="col" className="relative px-6 py-3">
                                <span className="sr-only">Actions</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredClaims.map((claim) => (
                            <tr
                                key={claim.id}
                                className="hover:bg-gray-50 cursor-pointer"
                                onClick={() => router.push(`/dashboard/warranty/${claim.id}`)}
                            >
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {claim.id.slice(0, 8)}...
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {claim.customerName}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {claim.inventoryItem.product.brand} {claim.inventoryItem.product.name} ({claim.inventoryItem.product.category})
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <div className="flex flex-col">
                                        <span>{claim.inventoryItem.serialNumber}</span>
                                        {(claim.replacementItemId || claim.replacementExternalInfo) && (
                                            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-tighter bg-blue-50 px-1 rounded inline-block w-fit mt-0.5">
                                                REPLACED
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(claim.status)}`}>
                                        {getStatusLabel(claim.status)}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {formatDate(claim.createdAt)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <Link href={`/dashboard/warranty/${claim.id}`} className="text-blue-600 hover:text-blue-900">
                                        View
                                    </Link>
                                </td>
                            </tr>
                        ))}
                        {filteredClaims.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-6 py-10 text-center text-gray-500 text-sm">
                                    {searchTerm ? 'No claims found matching your search.' : 'No warranty claims found. Create your first claim.'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
