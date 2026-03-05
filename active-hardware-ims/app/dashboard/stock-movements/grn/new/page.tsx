"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import ProductSelector from "@/components/selectors/ProductSelector"
import CustomerSelector from "@/components/selectors/CustomerSelector"
import FormattedNumberInput from "@/components/FormattedNumberInput"
import { ArrowLeft, Trash2, Save, Package, Truck, Hash, ClipboardList, PlusCircle, CheckCircle2 } from "lucide-react"

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
        <div className="min-h-screen bg-[#f8fafc] pb-12">
            {/* Header */}
            <div className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-30 px-8 py-5">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard/stock-movements" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">New Goods Receipt (GRN)</h1>
                            <p className="text-sm text-gray-500 font-medium tracking-tight uppercase">Inventory Inbound Management</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={loading || totalItems === 0}
                            className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-xl shadow-lg shadow-green-500/20 text-sm font-bold hover:bg-green-700 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {loading ? (
                                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            {loading ? `Processing...` : `Receive ${totalItems} Units`}
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto mt-8 px-4 space-y-8">

                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-400 p-4">
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    )}

                    {/* Header Info */}
                    <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-xl shadow-blue-500/5 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-75">
                        <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
                            <div className="p-2 bg-blue-50 rounded-lg">
                                <ClipboardList className="w-5 h-5 text-blue-600" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Receipt Details</h3>
                        </div>

                        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">GRN Number <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    required
                                    value={grnNumber}
                                    onChange={(e) => setGrnNumber(e.target.value)}
                                    className="w-full rounded-xl border-gray-200 px-4 py-3 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none border shadow-sm font-mono font-bold"
                                />
                            </div>

                            <div>
                                <CustomerSelector
                                    label="Supplier / Vendor"
                                    required
                                    type="SUPPLIER"
                                    selectedCustomer={null}
                                    onSelect={(s) => setSupplier(s?.name || "")}
                                    placeholder="Search for a supplier..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5 flex items-center gap-2">
                                    <Package className="w-4 h-4 text-gray-400" />
                                    PO Reference
                                </label>
                                <input
                                    type="text"
                                    value={poReference}
                                    onChange={(e) => setPoReference(e.target.value)}
                                    className="w-full rounded-xl border-gray-200 px-4 py-3 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none border shadow-sm font-medium"
                                    placeholder="Optional"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5 flex items-center gap-2">
                                    <Truck className="w-4 h-4 text-gray-400" />
                                    Received By <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={receivedBy}
                                    onChange={(e) => setReceivedBy(e.target.value)}
                                    className="w-full rounded-xl border-gray-200 px-4 py-3 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none border shadow-sm font-medium"
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">Additional Notes</label>
                                <textarea
                                    rows={2}
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="w-full rounded-xl border-gray-200 px-4 py-3 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none border shadow-sm font-medium bg-gray-50/30"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Items */}
                    <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-xl shadow-blue-500/5 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150 transition-all hover:shadow-2xl hover:shadow-blue-500/10">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-50 rounded-lg">
                                    <PlusCircle className="w-5 h-5 text-green-600" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900">Line Items ({totalItems} units)</h3>
                            </div>
                        </div>

                        <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 mb-8">
                            <label className="block text-sm font-bold text-gray-700 mb-3">Add Product to Receipt</label>
                            <ProductSelector
                                onProductSelect={handleProductSelect}
                                placeholder="Type brand, name or SKU to add..."
                            />
                            <p className="text-[11px] text-gray-400 mt-2 italic px-1 font-medium italic">Products added will appear below for serial number entry</p>
                        </div>

                        <div className="space-y-6">
                            {items.length === 0 ? (
                                <div className="text-center py-20 bg-gray-50/30 border-2 border-dashed border-gray-200 rounded-2xl">
                                    <Package className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                                    <p className="text-sm text-gray-400 font-medium">No items added. Use the search above to begin.</p>
                                </div>
                            ) : (items.map((item, index) => (
                                <div key={index} className="border border-gray-100 rounded-2xl p-6 space-y-5 bg-white shadow-sm ring-1 ring-black/5 hover:ring-blue-500/20 transition-all animate-in fade-in zoom-in duration-300">
                                    <div className="flex justify-between items-center border-b border-gray-50 pb-4">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-xs ring-4 ring-blue-50">
                                                {index + 1}
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-bold text-gray-900">{item.product.brand} {item.product.name}</h3>
                                                <p className="text-[11px] font-mono text-gray-500 uppercase tracking-widest">{item.product.sku} • {item.product.model}</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeItem(index)}
                                            className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Target Location *</label>
                                            <select
                                                value={item.locationId}
                                                onChange={(e) => updateItem(index, 'locationId', e.target.value)}
                                                className="w-full rounded-xl border-gray-200 px-4 py-2.5 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none border bg-white font-medium"
                                            >
                                                <option value="">Select location...</option>
                                                {locations.map(l => (
                                                    <option key={l.id} value={l.id}>{l.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Unit Acquisition Cost *</label>
                                            <div className="relative">
                                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">LKR</div>
                                                <FormattedNumberInput
                                                    value={item.unitCost}
                                                    onChange={(val) => updateItem(index, 'unitCost', val)}
                                                    className="w-full rounded-xl border-gray-200 pl-10 pr-4 py-2.5 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none border font-bold text-blue-600"
                                                />
                                            </div>
                                        </div>

                                        <div className="sm:col-span-2 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                                            <div className="flex justify-between items-center mb-2">
                                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                                    <Hash className="w-3 h-3" />
                                                    Serial Numbers ({item.serialNumbers.length} units detection)
                                                </label>
                                                <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-tighter">Bulk Entry Mode</span>
                                            </div>
                                            <textarea
                                                rows={3}
                                                placeholder="Paste serials here (comma, space or line separated)..."
                                                value={item.serialNumbers.join(', ')}
                                                onChange={(e) => handleSerialNumbersChange(index, e.target.value)}
                                                className="w-full rounded-xl border-gray-200 p-3 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none border font-mono leading-relaxed"
                                            />
                                            <p className="mt-2 text-[10px] text-gray-400 font-medium italic">
                                                System will automatically parse valid strings as individual inventory units.
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
        </div>
    )
}
