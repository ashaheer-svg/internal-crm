"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, Search, Save, Loader2, Filter } from "lucide-react"
import { useRouter } from "next/navigation"

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

    // Selection state
    const [selectedGrnId, setSelectedGrnId] = useState("")
    const [selectedProductId, setSelectedProductId] = useState("")

    // Data state
    const [items, setItems] = useState<InventoryItem[]>([])
    const [editedCosts, setEditedCosts] = useState<{ [key: string]: string }>({})

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
        if (!selectedGrnId) {
            setError("Please select a GRN")
            return
        }

        setSearching(true)
        setError("")
        setSuccess("")
        setItems([])
        setEditedCosts({})

        try {
            const params = new URLSearchParams()
            params.append("grnId", selectedGrnId)
            if (selectedProductId) params.append("productId", selectedProductId)

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
                    <p className="text-sm text-gray-500">Update unit costs for inventory items by GRN</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white shadow sm:rounded-lg p-6">
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6 items-end">
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

                    <div className="sm:col-span-1">
                        <button
                            onClick={handleSearch}
                            disabled={searching || !selectedGrnId}
                            className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                            Search
                        </button>
                    </div>
                </div>
            </div>

            {/* Results */}
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

            {items.length > 0 && (
                <div className="bg-white shadow sm:rounded-lg overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                        <h3 className="text-sm font-medium text-gray-700">
                            Found {items.length} item(s)
                        </h3>
                        {Object.keys(editedCosts).length > 0 && (
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 shadow-sm disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}
                                Save Changes
                            </button>
                        )}
                    </div>
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Serial Number</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Cost</th>
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
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {item.unitCost.toFixed(2)}
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
            )}
        </div>
    )
}
