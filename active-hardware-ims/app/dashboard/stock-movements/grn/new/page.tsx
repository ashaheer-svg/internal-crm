"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react"

type Product = {
    id: string
    sku: string
    name: string
    brand: string
}

type Location = {
    id: string
    name: string
}

type GRNItem = {
    productId: string
    serialNumbers: string[]
    unitCost: number
    locationId: string
}

export default function NewGRNPage() {
    const router = useRouter()
    const [products, setProducts] = useState<Product[]>([])
    const [locations, setLocations] = useState<Location[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const [grnNumber, setGrnNumber] = useState("")
    const [supplier, setSupplier] = useState("")
    const [poReference, setPoReference] = useState("")
    const [receivedBy, setReceivedBy] = useState("")
    const [notes, setNotes] = useState("")
    const [items, setItems] = useState<GRNItem[]>([
        { productId: "", serialNumbers: [], unitCost: 0, locationId: "" }
    ])

    useEffect(() => {
        fetchProducts()
        fetchLocations()
        // Generate GRN number
        setGrnNumber(`GRN-${Date.now()}`)
    }, [])

    async function fetchProducts() {
        try {
            const res = await fetch('/api/products')
            const data = await res.json()
            setProducts(data)
        } catch (error) {
            console.error(error)
        }
    }

    async function fetchLocations() {
        try {
            const res = await fetch('/api/locations')
            const data = await res.json()
            setLocations(data)
        } catch (error) {
            console.error(error)
        }
    }

    function addItem() {
        setItems([...items, { productId: "", serialNumbers: [], unitCost: 0, locationId: "" }])
    }

    function removeItem(index: number) {
        setItems(items.filter((_, i) => i !== index))
    }

    function updateItem(index: number, field: keyof GRNItem, value: any) {
        const newItems = [...items]
        newItems[index] = { ...newItems[index], [field]: value }
        setItems(newItems)
    }

    function handleSerialNumbersChange(index: number, value: string) {
        // Split by comma, newline, or space and filter empty values
        const serialNumbers = value
            .split(/[,\n\s]+/)
            .map(s => s.trim())
            .filter(s => s.length > 0)

        updateItem(index, 'serialNumbers', serialNumbers)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError("")

        // Validation
        if (!grnNumber || !supplier || !receivedBy) {
            setError("GRN Number, Supplier, and Received By are required")
            setLoading(false)
            return
        }

        const validItems = items.filter(item =>
            item.productId &&
            item.serialNumbers.length > 0 &&
            item.locationId &&
            item.unitCost > 0
        )

        if (validItems.length === 0) {
            setError("Add at least one item with serial numbers")
            setLoading(false)
            return
        }

        try {
            const res = await fetch("/api/grn", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    grnNumber,
                    supplier,
                    poReference,
                    receivedBy,
                    notes,
                    items: validItems
                }),
            })

            if (!res.ok) {
                const json = await res.json()
                throw new Error(json.error || "Failed to create GRN")
            }

            const data = await res.json()
            router.push(`/dashboard/stock-movements/grn/${data.id}`)
        } catch (e) {
            setError(e instanceof Error ? e.message : "Something went wrong")
        } finally {
            setLoading(false)
        }
    }

    const totalItems = items.reduce((sum, item) => sum + item.serialNumbers.length, 0)

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/stock-movements" className="p-2 hover:bg-gray-200 rounded-full">
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">New Goods Receipt Note (GRN)</h1>
                    <p className="text-sm text-gray-500">Receive multiple items with serial numbers in bulk</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                    <div className="bg-red-50 border-l-4 border-red-400 p-4">
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                )}

                {/* Header Info */}
                <div className="bg-white shadow sm:rounded-lg p-6 space-y-4">
                    <h2 className="text-lg font-medium text-gray-900">GRN Details</h2>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">GRN Number *</label>
                            <input
                                type="text"
                                required
                                value={grnNumber}
                                onChange={(e) => setGrnNumber(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Supplier *</label>
                            <input
                                type="text"
                                required
                                value={supplier}
                                onChange={(e) => setSupplier(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">PO Reference</label>
                            <input
                                type="text"
                                value={poReference}
                                onChange={(e) => setPoReference(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm"
                                placeholder="Optional"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Received By *</label>
                            <input
                                type="text"
                                required
                                value={receivedBy}
                                onChange={(e) => setReceivedBy(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm"
                            />
                        </div>

                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-gray-700">Notes</label>
                            <textarea
                                rows={2}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm"
                            />
                        </div>
                    </div>
                </div>

                {/* Items */}
                <div className="bg-white shadow sm:rounded-lg p-6 space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-medium text-gray-900">Items ({totalItems} units)</h2>
                        <button
                            type="button"
                            onClick={addItem}
                            className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                            <Plus className="w-4 h-4 mr-1" />
                            Add Product
                        </button>
                    </div>

                    <div className="space-y-4">
                        {items.map((item, index) => (
                            <div key={index} className="border rounded-lg p-4 space-y-3">
                                <div className="flex justify-between items-start">
                                    <h3 className="text-sm font-medium text-gray-700">Product #{index + 1}</h3>
                                    {items.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeItem(index)}
                                            className="text-red-600 hover:text-red-800"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="sm:col-span-2">
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Product *</label>
                                        <select
                                            value={item.productId}
                                            onChange={(e) => updateItem(index, 'productId', e.target.value)}
                                            className="block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm"
                                        >
                                            <option value="">Select product...</option>
                                            {products.map(p => (
                                                <option key={p.id} value={p.id}>{p.sku} - {p.brand} {p.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Location *</label>
                                        <select
                                            value={item.locationId}
                                            onChange={(e) => updateItem(index, 'locationId', e.target.value)}
                                            className="block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm"
                                        >
                                            <option value="">Select location...</option>
                                            {locations.map(l => (
                                                <option key={l.id} value={l.id}>{l.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Unit Cost *</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={item.unitCost}
                                            onChange={(e) => updateItem(index, 'unitCost', Number(e.target.value))}
                                            className="block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm"
                                        />
                                    </div>

                                    <div className="sm:col-span-2">
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Serial Numbers * ({item.serialNumbers.length} entered)
                                        </label>
                                        <textarea
                                            rows={3}
                                            placeholder="Enter serial numbers separated by comma, space, or new line&#10;Example: SN001, SN002, SN003"
                                            value={item.serialNumbers.join(', ')}
                                            onChange={(e) => handleSerialNumbersChange(index, e.target.value)}
                                            className="block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm font-mono"
                                        />
                                        <p className="mt-1 text-xs text-gray-500">
                                            Tip: Paste multiple serial numbers separated by commas, spaces, or line breaks
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3">
                    <Link
                        href="/dashboard/stock-movements"
                        className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                        Cancel
                    </Link>
                    <button
                        type="submit"
                        disabled={loading || totalItems === 0}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                    >
                        <Save className="w-4 h-4 mr-2" />
                        {loading ? `Processing ${totalItems} Items...` : `Receive ${totalItems} Items`}
                    </button>
                </div>
            </form>
        </div>
    )
}
