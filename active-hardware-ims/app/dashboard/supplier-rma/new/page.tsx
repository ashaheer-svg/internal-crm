"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Check, Package, Search } from "lucide-react"

type Claim = {
    id: string
    customerName: string
    description: string
    createdAt: string
    inventoryItem: {
        serialNumber: string
        product: { name: string; brand: string; model: string }
    }
}

type Supplier = {
    id: string
    name: string
}

export default function NewBulkSupplierRmaPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [claims, setClaims] = useState<Claim[]>([])
    const [suppliers, setSuppliers] = useState<Supplier[]>([])
    const [selectedClaims, setSelectedClaims] = useState<string[]>([])
    const [searchTerm, setSearchTerm] = useState("")

    // Form loads
    const [supplierId, setSupplierId] = useState("")
    const [supplierRmaRef, setSupplierRmaRef] = useState("")
    const [notes, setNotes] = useState("")
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        fetchInitialData()
    }, [])

    async function fetchInitialData() {
        try {
            // 1. Fetch Candidates (Awaiting Supplier)
            const claimsRes = await fetch('/api/warranty?status=AWAITING_SUPPLIER')
            const claimsData = await claimsRes.json()
            setClaims(claimsData)

            // 2. Fetch Suppliers
            const suppliersRes = await fetch('/api/crm/customers?isSupplier=true')
            const suppliersData = await suppliersRes.json()
            setSuppliers(suppliersData.filter((s: any) => s.isSupplier))

        } catch (err) {
            console.error("Failed to load initial data:", err)
            setError("Failed to load candidates. Reload the page.")
        } finally {
            setLoading(false)
        }
    }

    const filteredClaims = claims.filter(c =>
        c.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.inventoryItem.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.inventoryItem.product.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const toggleClaimSelection = (id: string) => {
        if (selectedClaims.includes(id)) {
            setSelectedClaims(selectedClaims.filter(c => c !== id))
        } else {
            setSelectedClaims([...selectedClaims, id])
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (selectedClaims.length === 0) {
            setError("Please select at least one item to group.")
            return
        }
        if (!supplierId) {
            setError("Please select a supplier.")
            return
        }

        setSubmitting(true)
        setError(null)

        try {
            const res = await fetch('/api/supplier-rma/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    claimIds: selectedClaims,
                    supplierId,
                    supplierRmaRef,
                    notes
                })
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || "Failed to create Supplier RMA")
            }

            router.push('/dashboard/supplier-rma')
            router.refresh()
        } catch (err: any) {
            setError(err.message)
            setSubmitting(false)
        }
    }

    if (loading) {
        return <div className="flex justify-center items-center h-64 text-gray-500">Loading Candidates...</div>
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/supplier-rma" className="p-2 hover:bg-gray-100 rounded-full">
                    <ArrowLeft className="w-5 h-5 text-gray-500" />
                </Link>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">New Bulk Supplier RMA</h1>
            </div>

            {error && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Selection Panel */}
                <div className="md:col-span-2 space-y-4">
                    <div className="bg-white shadow sm:rounded-lg p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-medium text-gray-900">Select Items ({selectedClaims.length})</h3>
                            <div className="relative w-48">
                                <span className="absolute inset-y-0 left-0 pl-2 flex items-center"><Search className="w-4 h-4 text-gray-400" /></span>
                                <input 
                                    type="text" 
                                    placeholder="Search..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-8 pr-2 py-1 text-xs border border-gray-200 rounded-md w-full"
                                />
                            </div>
                        </div>

                        {filteredClaims.length === 0 ? (
                            <div className="text-center py-8 text-gray-400 text-sm">No items in 'Awaiting Supplier' status found.</div>
                        ) : (
                            <div className="space-y-2 max-h-96 overflow-y-auto divide-y divide-gray-100">
                                {filteredClaims.map(c => (
                                    <div 
                                        key={c.id} 
                                        onClick={() => toggleClaimSelection(c.id)}
                                        className={`flex items-center p-3 rounded-md cursor-pointer hover:bg-gray-50 transition ${selectedClaims.includes(c.id) ? 'bg-blue-50 border-blue-200 border' : 'border border-transparent'}`}
                                    >
                                        <div className={`w-4 h-4 rounded border flex items-center justify-center mr-3 ${selectedClaims.includes(c.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                                            {selectedClaims.includes(c.id) && <Check className="w-3 h-3 text-white" />}
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-semibold text-sm text-gray-900">{c.inventoryItem.product.brand} {c.inventoryItem.product.name}</div>
                                            <div className="text-xs font-mono text-gray-500">SN: {c.inventoryItem.serialNumber}</div>
                                        </div>
                                        <div className="text-xs text-gray-400">
                                            {c.customerName}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Submit Panel */}
                <div className="space-y-4">
                    <div className="bg-white shadow sm:rounded-lg p-6 space-y-4">
                        <h4 className="text-md font-medium text-gray-900 border-b pb-2">RMA Details</h4>
                        
                        <div>
                            <label className="block text-xs font-medium text-gray-700">Vendor / Supplier</label>
                            <select
                                value={supplierId}
                                onChange={(e) => setSupplierId(e.target.value)}
                                required
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            >
                                <option value="">Select Vendor</option>
                                {suppliers.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-700">Supplier RMA Reference <span className="text-gray-400 font-normal">(Optional)</span></label>
                            <input
                                type="text"
                                value={supplierRmaRef}
                                onChange={(e) => setSupplierRmaRef(e.target.value)}
                                placeholder="Ref Ticket #"
                                className="mt-1 block d-block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-700">Internal Notes <span className="text-gray-400 font-normal">(Optional)</span></label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={3}
                                className="mt-1 block d-block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={submitting || selectedClaims.length === 0 || !supplierId}
                            className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                        >
                            {submitting ? 'Creating...' : 'Create Grouped RMA'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    )
}
