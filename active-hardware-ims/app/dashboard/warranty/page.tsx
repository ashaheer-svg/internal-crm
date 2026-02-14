"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Plus, Shield, Search } from "lucide-react"
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
    location: {
        name: string
    }
}

export default function WarrantyPage() {
    const [claims, setClaims] = useState<WarrantyClaim[]>([])
    const [filteredClaims, setFilteredClaims] = useState<WarrantyClaim[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<string>('all')
    const [searchTerm, setSearchTerm] = useState("")

    useEffect(() => {
        fetchClaims()
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
            case 'SENT_TO_VENDOR':
                return 'bg-blue-100 text-blue-800'
            case 'REPAIRED':
                return 'bg-green-100 text-green-800'
            case 'RETURNED':
                return 'bg-gray-100 text-gray-800'
            default:
                return 'bg-gray-100 text-gray-800'
        }
    }

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'SENT_TO_VENDOR':
                return 'Sent to Vendor'
            default:
                return status.charAt(0) + status.slice(1).toLowerCase()
        }
    }

    const statusCounts = {
        all: claims.length,
        PENDING: claims.filter(c => c.status === 'PENDING').length,
        SENT_TO_VENDOR: claims.filter(c => c.status === 'SENT_TO_VENDOR').length,
        REPAIRED: claims.filter(c => c.status === 'REPAIRED').length,
        RETURNED: claims.filter(c => c.status === 'RETURNED').length,
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
                <div className="mt-4 sm:mt-0">
                    <Link
                        href="/dashboard/warranty/new"
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        New Claim
                    </Link>
                    <Link
                        href="/dashboard/warranty/lookup"
                        className="ml-3 inline-flex items-center px-4 py-2 border border-blue-600 shadow-sm text-sm font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50"
                    >
                        <Search className="w-4 h-4 mr-2" />
                        Lookup
                    </Link>
                </div>
            </div>

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
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
                        onClick={() => setActiveTab('SENT_TO_VENDOR')}
                        className={`${activeTab === 'SENT_TO_VENDOR' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium`}
                    >
                        Sent to Vendor ({statusCounts.SENT_TO_VENDOR})
                    </button>
                    <button
                        onClick={() => setActiveTab('REPAIRED')}
                        className={`${activeTab === 'REPAIRED' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium`}
                    >
                        Repaired ({statusCounts.REPAIRED})
                    </button>
                    <button
                        onClick={() => setActiveTab('RETURNED')}
                        className={`${activeTab === 'RETURNED' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium`}
                    >
                        Returned ({statusCounts.RETURNED})
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
                            <tr key={claim.id} className="hover:bg-gray-50">
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
                                    {claim.inventoryItem.serialNumber}
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
