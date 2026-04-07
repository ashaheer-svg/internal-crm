"use client"

import { useState, useEffect } from "react"
import { Search, FileText, Package, Calendar, User, X, Eye } from "lucide-react"

// Types
type Product = {
    name: string
    brand: string
    model: string
    sku: string
}

type GRNItem = {
    id: string
    quantity: number
    unitCost: number
    serialNumbers: string
    product: Product
}

type GRNInfo = {
    id: string
    grnNumber: string
    supplier: string
    createdAt: string
    status: string
}

type GRNDetails = GRNInfo & {
    poReference?: string
    receivedBy?: string
    notes?: string
    items?: GRNItem[]
}

export default function GRNLookupPage() {
    const [grns, setGrns] = useState<GRNInfo[]>([])
    const [loadingList, setLoadingList] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedGrn, setSelectedGrn] = useState<GRNDetails | null>(null)
    const [loadingDetails, setLoadingDetails] = useState(false)
    const [error, setError] = useState("")

    useEffect(() => {
        fetchGrns()
    }, [])

    async function fetchGrns() {
        try {
            const res = await fetch("/api/grn/lookup")
            if (!res.ok) throw new Error("Failed to load GRNs")
            const data = await res.json()
            setGrns(data)
        } catch (e: any) {
            setError(e.message)
        } finally {
            setLoadingList(false)
        }
    }

    async function handleSelectGrn(grnNumber: string) {
        setIsModalOpen(true)
        setLoadingDetails(true)
        setError("")
        try {
            const res = await fetch(`/api/grn/lookup?grnNumber=${encodeURIComponent(grnNumber)}`)
            if (!res.ok) throw new Error("Failed to load GRN details")
            const data = await res.json()
            setSelectedGrn(data)
        } catch (e: any) {
            setError(e.message)
        } finally {
            setLoadingDetails(false)
        }
    }

    const filteredGrns = grns.filter(g =>
        g.grnNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.supplier.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.status.toLowerCase().includes(searchQuery.toLowerCase())
    )

    function closeModal() {
        setIsModalOpen(false)
        // Optionally clear selected GRN so old data isn't shown on next open briefly
        setTimeout(() => setSelectedGrn(null), 200)
    }

    function formatDate(dateStr: string) {
        return new Date(dateStr).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        })
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-12 relative">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <FileText className="w-6 h-6 text-blue-600" />
                        GRN Lookup
                    </h1>
                    <p className="text-sm text-gray-500">Search and view details of Goods Receipt Notes and received devices</p>
                </div>
            </div>

            {error && !isModalOpen && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md text-sm">
                    {error}
                </div>
            )}

            {/* Search and Table Card */}
            <div className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden text-sm">

                {/* Search Bar */}
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <div className="relative w-full max-w-xl">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="w-5 h-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Filter by GRN Number, Supplier, or Status..."
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                        />
                    </div>
                </div>

                {/* Data Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                                <th className="py-3 px-6 font-semibold">GRN Number</th>
                                <th className="py-3 px-6 font-semibold">Supplier</th>
                                <th className="py-3 px-6 font-semibold">Date Received</th>
                                <th className="py-3 px-6 font-semibold">Status</th>
                                <th className="py-3 px-6 font-semibold text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loadingList ? (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-gray-500">Loading GRNs...</td>
                                </tr>
                            ) : filteredGrns.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-gray-500">No GRNs found matching your search.</td>
                                </tr>
                            ) : (
                                filteredGrns.map(g => (
                                    <tr
                                        key={g.id}
                                        onClick={() => handleSelectGrn(g.grnNumber)}
                                        className="hover:bg-blue-50 cursor-pointer transition-colors group"
                                    >
                                        <td className="py-3 px-6 font-medium text-gray-900 group-hover:text-blue-600">
                                            {g.grnNumber}
                                        </td>
                                        <td className="py-3 px-6 text-gray-700">
                                            {g.supplier}
                                        </td>
                                        <td className="py-3 px-6 text-gray-500">
                                            {formatDate(g.createdAt)}
                                        </td>
                                        <td className="py-3 px-6">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium 
                                                ${g.status === 'RECEIVED' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                                            `}>
                                                {g.status}
                                            </span>
                                        </td>
                                        <td className="py-3 px-6 text-right">
                                            <button
                                                className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleSelectGrn(g.grnNumber)
                                                }}
                                            >
                                                <Eye className="w-4 h-4" /> View
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {/* Pagination / Footer info could go here if needed later */}
                {!loadingList && filteredGrns.length > 0 && (
                    <div className="p-4 border-t border-gray-200 bg-gray-50 text-xs text-gray-500 text-right">
                        Showing {filteredGrns.length} records
                    </div>
                )}
            </div>

            {/* Modal Dialog */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm transition-opacity">
                    <div
                        className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                                    {selectedGrn?.grnNumber || 'Loading...'}
                                    {selectedGrn && (
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                                            ${selectedGrn.status === 'RECEIVED' ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-800'}
                                        `}>
                                            {selectedGrn.status}
                                        </span>
                                    )}
                                </h2>
                                <p className="text-sm text-gray-500 mt-1">Goods Receipt Note Details</p>
                            </div>
                            <button
                                onClick={closeModal}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto flex-1">
                            {loadingDetails ? (
                                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                                    <p>Loading GRN details...</p>
                                </div>
                            ) : selectedGrn ? (
                                <div className="space-y-6">
                                    {/* Meta Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
                                        <div>
                                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Supplier</span>
                                            <div className="flex items-center gap-2 text-gray-900 font-medium">
                                                <User className="w-4 h-4 text-gray-400" />
                                                {selectedGrn.supplier}
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Date Received</span>
                                            <div className="flex items-center gap-2 text-gray-900 font-medium">
                                                <Calendar className="w-4 h-4 text-gray-400" />
                                                {formatDate(selectedGrn.createdAt)}
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">PO Reference</span>
                                            <p className="text-gray-900 font-medium text-sm">
                                                {selectedGrn.poReference || "N/A"}
                                            </p>
                                        </div>
                                        <div>
                                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Received By</span>
                                            <p className="text-gray-900 font-medium text-sm">
                                                {selectedGrn.receivedBy || "N/A"}
                                            </p>
                                        </div>
                                        {selectedGrn.notes && (
                                            <div className="md:col-span-2 lg:col-span-4 border-t border-gray-200 pt-3 mt-1">
                                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Notes</span>
                                                <p className="text-sm text-gray-700">{selectedGrn.notes}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Items Table */}
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-3">
                                            <Package className="w-5 h-5 text-gray-500" />
                                            Received Devices
                                        </h3>
                                        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left border-collapse text-sm">
                                                    <thead>
                                                        <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-xs uppercase">
                                                            <th className="py-3 px-4 font-semibold">Product</th>
                                                            <th className="py-3 px-4 font-semibold text-right">Quantity</th>
                                                            <th className="py-3 px-4 font-semibold text-right">Unit Cost (Rs.)</th>
                                                            <th className="py-3 px-4 font-semibold">Serial Numbers</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-200">
                                                        {selectedGrn.items && selectedGrn.items.length > 0 ? (
                                                            selectedGrn.items.map(item => (
                                                                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                                                    <td className="py-4 px-4 align-top">
                                                                        <p className="font-semibold text-gray-900">{item.product?.brand} {item.product?.name}</p>
                                                                        <p className="text-xs text-gray-500 mt-1">{item.product?.model} • SKU: {item.product?.sku}</p>
                                                                    </td>
                                                                    <td className="py-4 px-4 text-right font-medium text-gray-900 align-top">
                                                                        {item.quantity}
                                                                    </td>
                                                                    <td className="py-4 px-4 text-right text-gray-600 align-top">
                                                                        <div className="flex items-center justify-end gap-1">
                                                                            {item.unitCost?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                        </div>
                                                                    </td>
                                                                    <td className="py-4 px-4 align-top">
                                                                        <div className="flex flex-wrap gap-1 max-w-sm">
                                                                            {item.serialNumbers ? item.serialNumbers.split(',').map((serial, idx) => (
                                                                                <span key={idx} className="bg-blue-50 border border-blue-100 text-blue-700 text-[11px] font-mono px-2 py-0.5 rounded">
                                                                                    {serial.trim()}
                                                                                </span>
                                                                            )) : <span className="text-gray-400 italic">No serials</span>}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            ))
                                                        ) : (
                                                            <tr>
                                                                <td colSpan={4} className="py-6 text-center text-gray-500">No items found for this GRN.</td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="py-12 text-center text-red-500">Failed to load details.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
