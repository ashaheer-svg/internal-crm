"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Trash2, Save } from "lucide-react"
import ProductSelector from "../../../transactions/invoices/new/ProductSelector"
import FormattedNumberInput from "@/components/FormattedNumberInput"

type Product = {
    id: string
    sku: string
    name: string
    brand: string
    category: string
    model: string
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
    product: Product
}

export default function NewGRNPage() {
    const router = useRouter()
    const [locations, setLocations] = useState<Location[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const [grnNumber, setGrnNumber] = useState("")
    const [supplier, setSupplier] = useState("")
    const [poReference, setPoReference] = useState("")
    const [receivedBy, setReceivedBy] = useState("")
    const [notes, setNotes] = useState("")
    const [items, setItems] = useState<GRNItem[]>([])

    useEffect(() => {
        fetchLocations()
        // Generate GRN number
        setGrnNumber(`GRN-${Date.now()}`)
    }, [])

    async function fetchLocations() {
        try {
            const res = await fetch('/api/locations')
            const data = await res.json()
            setLocations(data)
        } catch (error) {
            console.error(error)
        }
    }

    function handleProductSelect(product: Product) {
        // Items can be added multiple times if different locations or serials, but usually one block is enough.
        // Let's allow duplicates but maybe warn? For GRN, distinguishing by serials is key.
        // User might want to split same product into two lines for different locations.
        // So we won't strictly block duplicates.

        const newItem: GRNItem = {
            productId: product.id,
            serialNumbers: [],
            unitCost: 0,
            locationId: "",
            product: product
        }
        setItems([...items, newItem])
    }

    function removeItem(index: number) {
        setItems(items.filter((_, i) => i !== index))
    }

    function updateItem(index: number, field: keyof GRNItem, value: any) {
        const newItems = [...items]
        const item = { ...newItems[index], [field]: value } as GRNItem
        newItems[index] = item
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
            setError("Add at least one item with serial numbers, location, and cost")
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
                    items: validItems.map(i => ({
                        productId: i.productId,
                        serialNumbers: i.serialNumbers,
                        unitCost: i.unitCost,
                        locationId: i.locationId
                    }))
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
    const usedProductIds = items.map(i => i.productId)

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
                    <div>
                        <h2 className="text-lg font-medium text-gray-900 mb-4">Items ({totalItems} units)</h2>
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Add Product</label>
                            <ProductSelector
                                onProductSelect={handleProductSelect}
                            // We allow duplicates for GRN to support split locations, so no exclude
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        {items.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                                No items added. Search for a product to begin.
                            </div>
                        ) : (items.map((item, index) => (
                            <div key={index} className="border rounded-lg p-4 space-y-3 bg-gray-50">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <h3 className="text-sm font-medium text-gray-900">{item.product.brand} {item.product.name}</h3>
                                        <p className="text-xs text-gray-500">SKU: {item.product.sku}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeItem(index)}
                                        className="text-gray-400 hover:text-red-600 transition-colors"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                                        <FormattedNumberInput
                                            value={item.unitCost}
                                            onChange={(val) => updateItem(index, 'unitCost', val)}
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
                        )))}
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
