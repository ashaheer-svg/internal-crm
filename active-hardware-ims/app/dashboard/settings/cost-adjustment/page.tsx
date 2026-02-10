"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, Search, Save, Loader2, Filter, Upload, Calculator } from "lucide-react"
import { useRouter } from "next/navigation"
import { Currency } from "@/components/Currency"

type GRN = {
    id: string
    grnNumber: string
    supplier: string
    createdAt: string
}

type Product = {
    id: string
    name: string
    brand: string
    model: string
}

type InventoryItem = {
    id: string
    serialNumber: string
    unitCost: number
    status: string
    product: {
        name: string
        brand: string
        model: string
    }
    location: {
        name: string
    }
}

export default function CostAdjustmentPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false) // Initial load
    const [searching, setSearching] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")

    const [grns, setGrns] = useState<GRN[]>([])
    const [products, setProducts] = useState<Product[]>([])

    // Search Modes
    const [searchMode, setSearchMode] = useState<'GRN' | 'SERIAL'>('GRN')

    // Selection state
    const [selectedGrnId, setSelectedGrnId] = useState("")
    const [selectedProductId, setSelectedProductId] = useState("")
    const [serialInput, setSerialInput] = useState("")

    // Data state
    const [items, setItems] = useState<InventoryItem[]>([])
    const [editedCosts, setEditedCosts] = useState<{ [key: string]: string }>({})

    // Bulk Actions State
    const [bulkCost, setBulkCost] = useState("")
    const [bulkPasteInput, setBulkPasteInput] = useState("")
    const [showBulkPaste, setShowBulkPaste] = useState(false)

    useEffect(() => {
        fetchInitialData()
    }, [])

    async function fetchInitialData() {
        setLoading(true)
        try {
            const [grnRes, prodRes] = await Promise.all([
                fetch("/api/grn"),
                fetch("/api/products")
            ])

            if (grnRes.ok) {
                const grnData = await grnRes.json()
                setGrns(grnData)
            }
            if (prodRes.ok) {
                const prodData = await prodRes.json()
                setProducts(prodData)
            }
        } catch (e) {
            console.error("Failed to load initial data", e)
            setError("Failed to load options")
        } finally {
            setLoading(false)
        }
    }

    async function handleSearch() {
        if (searchMode === 'GRN' && !selectedGrnId) {
            setError("Please select a GRN")
            return
        }
        if (searchMode === 'SERIAL' && !serialInput.trim()) {
            setError("Please enter serial numbers")
            return
        }

        setSearching(true)
        setError("")
        setSuccess("")
        setItems([])
        setEditedCosts({})

        try {
            const params = new URLSearchParams()

            if (searchMode === 'GRN') {
                params.append("grnId", selectedGrnId)
                if (selectedProductId) params.append("productId", selectedProductId)
            } else {
                // Parse serials
                const serials = serialInput
                    .split(/[,\n\s]+/)
                    .map(s => s.trim())
                    .filter(s => s.length > 0)

                if (serials.length === 0) {
                    setError("No valid serial numbers found")
                    setSearching(false)
                    return
                }
                params.append("serials", serials.join(','))
            }

            const res = await fetch(`/api/inventory/cost-adjustment?${params.toString()}`)
            if (!res.ok) throw new Error("Failed to fetch items")

            const data = await res.json()
            setItems(data)

            if (data.length === 0) {
                setError("No inventory items found for this selection")
            }
        } catch (e) {
            setError("Failed to search items")
        } finally {
            setSearching(false)
        }
    }

    function handleCostChange(id: string, value: string) {
        setEditedCosts(prev => ({
            ...prev,
            [id]: value
        }))
    }

    // Apply a single cost to all visible items
    function applyUniformCost() {
        if (!bulkCost) return
        const updates: { [key: string]: string } = {}
        items.forEach(item => {
            updates[item.id] = bulkCost
        })
        setEditedCosts(updates)
        setSuccess(`Applied cost of ${bulkCost} to ${items.length} items. Click Save to confirm.`)
    }

    // Parse CSV: Serial,Cost
    function applyBulkPaste() {
        if (!bulkPasteInput) return

        const updates: { [key: string]: string } = {}
        const lines = bulkPasteInput.split('\n')
        let matchedCount = 0

        lines.forEach(line => {
            // Split by comma, tab, or space (be flexible)
            const parts = line.split(/[,\t]+/)
            if (parts.length >= 2) {
                const serial = parts[0].trim()
                const cost = parts[1].trim()

                // Find item by serial (case-insensitive)
                const item = items.find(i => i.serialNumber.toLowerCase() === serial.toLowerCase())
                if (item && !isNaN(parseFloat(cost))) {
                    updates[item.id] = cost
                    matchedCount++
                }
            }
        })

        if (matchedCount === 0) {
            setError("No matching serial numbers found in the pasted data.")
            return
        }

        setEditedCosts(prev => ({ ...prev, ...updates }))
        setSuccess(`Matched and updated ${matchedCount} items from pasted data. Click Save to confirm.`)
        setShowBulkPaste(false)
    }

    async function handleSave() {
        const updates = Object.entries(editedCosts).map(([id, cost]) => ({
            id,
            unitCost: parseFloat(cost)
        })).filter(item => !isNaN(item.unitCost))

        if (updates.length === 0) {
            setError("No valid changes to save")
            return
        }

        setSaving(true)
        setError("")
        setSuccess("")

        try {
            const res = await fetch("/api/inventory/cost-adjustment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ items: updates })
            })

            if (!res.ok) throw new Error("Failed to update costs")

            setSuccess(`Successfully updated ${updates.length} item(s)`)
            setEditedCosts({})
            // Refresh list
            handleSearch()
        } catch (e) {
            setError("Failed to save changes")
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/settings" className="p-2 hover:bg-gray-200 rounded-full">
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Cost Adjustment</h1>
                    <p className="text-sm text-gray-500">Update unit costs for inventory items</p>
                </div>
            </div>

            {/* Config & Search */}
            <div className="bg-white shadow sm:rounded-lg p-6">

                {/* Search Mode Toggles */}
                <div className="flex space-x-4 mb-6 border-b pb-4">
                    <button
                        onClick={() => { setSearchMode('GRN'); setItems([]); setError(""); setSuccess("") }}
                        className={`text-sm font-medium pb-2 -mb-4.5 border-b-2 ${searchMode === 'GRN' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Search by GRN
                    </button>
                    <button
                        onClick={() => { setSearchMode('SERIAL'); setItems([]); setError(""); setSuccess("") }}
                        className={`text-sm font-medium pb-2 -mb-4.5 border-b-2 ${searchMode === 'SERIAL' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Search by Serial Numbers
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6 items-end">

                    {/* GRN Search Inputs */}
                    {searchMode === 'GRN' && (
                        <>
                            <div className="sm:col-span-3">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Select GRN *</label>
                                <select
                                    className="block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm"
                                    value={selectedGrnId}
                                    onChange={(e) => setSelectedGrnId(e.target.value)}
                                >
                                    <option value="">Select a GRN receipt</option>
                                    {grns.map(grn => (
                                        <option key={grn.id} value={grn.id}>
                                            {grn.grnNumber} - {grn.supplier} ({new Date(grn.createdAt).toLocaleDateString()})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Product (Optional)</label>
                                <select
                                    className="block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm"
                                    value={selectedProductId}
                                    onChange={(e) => setSelectedProductId(e.target.value)}
                                >
                                    <option value="">All Products in GRN</option>
                                    {products.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.brand} {p.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </>
                    )}

                    {/* Serial Search Input */}
                    {searchMode === 'SERIAL' && (
                        <div className="sm:col-span-5">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Enter Serial Numbers *</label>
                            <textarea
                                rows={2}
                                className="block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm font-mono"
                                placeholder="Paste serial numbers (separated by comma, space, or new line)"
                                value={serialInput}
                                onChange={(e) => setSerialInput(e.target.value)}
                            />
                        </div>
                    )}

                    <div className="sm:col-span-1">
                        <button
                            onClick={handleSearch}
                            disabled={searching}
                            className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                            Search
                        </button>
                    </div>
                </div>
            </div>

            {/* Results & Actions */}
            {items.length > 0 && (
                <div className="space-y-4">

                    {/* Bulk Tools */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                        <div className="flex items-center gap-2">
                            <div className="bg-blue-100 p-2 rounded text-blue-600">
                                <Calculator className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold text-gray-900">Bulk Update Costs</h4>
                                <p className="text-xs text-gray-500">Apply to all {items.length} visible items</p>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    placeholder="Uniform Cost"
                                    className="w-32 rounded-md border-gray-300 shadow-sm border p-1.5 text-sm"
                                    value={bulkCost}
                                    onChange={(e) => setBulkCost(e.target.value)}
                                />
                                <button
                                    onClick={applyUniformCost}
                                    disabled={!bulkCost}
                                    className="px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Apply All
                                </button>
                            </div>
                            <div className="border-l border-gray-300 mx-2"></div>
                            <button
                                onClick={() => setShowBulkPaste(!showBulkPaste)}
                                className="px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center"
                            >
                                <Upload className="w-4 h-4 mr-2" />
                                Paste from CSV
                            </button>
                        </div>
                    </div>

                    {/* Bulk Paste Area */}
                    {showBulkPaste && (
                        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm animate-in fade-in slide-in-from-top-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Paste Data (Serial, Cost)</label>
                            <textarea
                                rows={4}
                                className="block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm font-mono mb-2"
                                placeholder={`SN001, 1500.00\nSN002, 1600.50`}
                                value={bulkPasteInput}
                                onChange={(e) => setBulkPasteInput(e.target.value)}
                            />
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => setShowBulkPaste(false)}
                                    className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={applyBulkPaste}
                                    className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                                >
                                    Process & Apply
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Status Messages */}
                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-400 p-4">
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    )}
                    {success && (
                        <div className="bg-green-50 border-l-4 border-green-400 p-4">
                            <p className="text-sm text-green-700">{success}</p>
                        </div>
                    )}

                    {/* Table */}
                    <div className="bg-white shadow sm:rounded-lg overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                            <h3 className="text-sm font-medium text-gray-700">
                                Found {items.length} item(s) to adjust
                            </h3>
                            {Object.keys(editedCosts).length > 0 && (
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 shadow-sm disabled:opacity-50"
                                >
                                    {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}
                                    Save Changes ({Object.keys(editedCosts).length})
                                </button>
                            )}
                        </div>
                        <div className="max-h-[600px] overflow-y-auto">
                            <table className="min-w-full divide-y divide-gray-200 relative">
                                <thead className="bg-gray-50 sticky top-0 z-10">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Serial Number</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Current Cost</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">New Cost</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {items.map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                <div className="font-medium">{item.product.name}</div>
                                                <div className="text-gray-500 text-xs">{item.product.brand} {item.product.model}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                                                {item.serialNumber}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {item.location.name}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                                                <Currency amount={item.unitCost} />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                <div className="relative rounded-md shadow-sm w-32">
                                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                                        <span className="text-gray-500 sm:text-sm">$</span>
                                                    </div>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        className={`block w-full rounded-md border-gray-300 pl-7 focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-1.5 border ${editedCosts[item.id] ? 'bg-yellow-50 border-yellow-300' : ''}`}
                                                        placeholder={item.unitCost.toString()}
                                                        value={editedCosts[item.id] !== undefined ? editedCosts[item.id] : ''}
                                                        onChange={(e) => handleCostChange(item.id, e.target.value)}
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                    ${item.status === 'AVAILABLE' ? 'bg-green-100 text-green-800' :
                                                        item.status === 'SOLD' ? 'bg-gray-100 text-gray-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                    {item.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
