"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Currency } from "@/components/Currency"
import ProductSelector from "@/components/selectors/ProductSelector"
import CustomerSelector from "@/components/selectors/CustomerSelector"
import FormattedNumberInput from "@/components/FormattedNumberInput"
import { ArrowLeft, Trash2, Save, ShoppingCart, Truck, Calendar, DollarSign, FileText, CheckCircle2 } from "lucide-react"

type Product = {
    id: string
    sku: string
    name: string
    brand: string
    category: string
    model: string
}

type POItem = {
    productId: string
    quantity: number
    unitCost: number
    totalCost: number
    product: Product
}

export default function NewPurchaseOrderPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const [poNumber, setPoNumber] = useState("")
    const [supplier, setSupplier] = useState("")
    const [notes, setNotes] = useState("")
    const [items, setItems] = useState<POItem[]>([])
    const [selectedSupplier, setSelectedSupplier] = useState<any>(null)

    const [suppliers, setSuppliers] = useState<{ id: string, name: string }[]>([])

    useEffect(() => {
        fetchNextPoNumber()
        fetchSuppliers()
    }, [])

    async function fetchSuppliers() {
        // We now use CustomerSelector which fetches its own data, 
        // but we still keep the old logic for compatibility if needed elsewhere, 
        // though here we'll simplify.
    }

    async function fetchNextPoNumber() {
        try {
            const res = await fetch("/api/sequences", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "PO" })
            })
            if (res.ok) {
                const data = await res.json()
                setPoNumber(data.number)
            }
        } catch (error) {
            console.error("Failed to fetch PO sequence", error)
        }
    }

    function handleProductSelect(product: Product) {
        // Check if already added
        if (items.some(i => i.productId === product.id)) {
            setError(`Product ${product.sku} is already in the list`)
            setTimeout(() => setError(""), 3000)
            return
        }

        const newItem: POItem = {
            productId: product.id,
            quantity: 1,
            unitCost: 0, // Default to 0, or could fetch last cost if available
            totalCost: 0,
            product: product
        }
        setItems([...items, newItem])
    }

    function removeItem(index: number) {
        setItems(items.filter((_, i) => i !== index))
    }

    function updateItem(index: number, field: keyof POItem, value: any) {
        const newItems = [...items]
        const item = { ...newItems[index], [field]: value } as POItem

        // Auto-calculate total cost
        if (field === 'quantity' || field === 'unitCost') {
            item.totalCost = item.quantity * item.unitCost
        }

        newItems[index] = item
        setItems(newItems)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError("")

        // Validation
        if (!poNumber || !supplier) {
            setError("PO Number and Supplier are required")
            setLoading(false)
            return
        }

        if (items.length === 0) {
            setError("Add at least one item to the purchase order")
            setLoading(false)
            return
        }

        try {
            const res = await fetch("/api/purchase-orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    poNumber,
                    supplier,
                    notes,
                    items: items.map(i => ({
                        productId: i.productId,
                        quantity: i.quantity,
                        unitCost: i.unitCost,
                        totalCost: i.totalCost
                    }))
                }),
            })

            if (!res.ok) {
                const json = await res.json()
                throw new Error(json.error || "Failed to create purchase order")
            }

            const data = await res.json()
            router.push(`/dashboard/transactions/purchase-orders/${data.id}`)
        } catch (e) {
            setError(e instanceof Error ? e.message : "Something went wrong")
        } finally {
            setLoading(false)
        }
    }

    const totalAmount = items.reduce((sum, item) => sum + item.totalCost, 0)
    const usedProductIds = items.map(i => i.productId)

    return (
        <div className="min-h-screen bg-[#f8fafc] pb-12">
            {/* Header */}
            <div className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-30 px-8 py-5">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard/transactions" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">New Purchase Order</h1>
                            <p className="text-sm text-gray-500 font-medium tracking-tight uppercase">Supply Chain Procurement</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors uppercase tracking-widest"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/20 text-sm font-bold hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {loading ? (
                                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            {loading ? `Generating...` : `Issue Purchase Order`}
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

                    <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-xl shadow-blue-500/5 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-75">
                        <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
                            <div className="p-2 bg-blue-50 rounded-lg">
                                <ShoppingCart className="w-5 h-5 text-blue-600" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Standard Procurement Request</h3>
                        </div>

                        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5 flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-gray-400" />
                                    PO Document Number
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={poNumber}
                                    onChange={(e) => setPoNumber(e.target.value)}
                                    className="w-full rounded-xl border-gray-200 px-4 py-3 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none border shadow-sm font-mono font-bold"
                                />
                            </div>

                            <div>
                                <CustomerSelector
                                    label="Supplier / Vendor"
                                    required
                                    type="SUPPLIER"
                                    selectedCustomer={selectedSupplier}
                                    onSelect={(s) => {
                                        setSelectedSupplier(s)
                                        setSupplier(s?.name || "")
                                    }}
                                    placeholder="Search for a manufacturer or supplier..."
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <label className="block text-sm font-bold text-gray-700 mb-1.5 flex items-center gap-2">
                                    <Truck className="w-4 h-4 text-gray-400" />
                                    Internal Procurement Notes
                                </label>
                                <textarea
                                    rows={2}
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="w-full rounded-xl border-gray-200 px-4 py-3 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none border bg-gray-50/30 font-medium"
                                    placeholder="Instructions for the supplier or warehouse..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Items Section */}
                    <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-xl shadow-blue-500/5 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
                        <div className="flex items-center justify-between border-b border-gray-50 pb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-50 rounded-lg">
                                    <ShoppingCart className="w-5 h-5 text-green-600" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900">Order Manifest</h3>
                            </div>
                            <div className="px-4 py-1.5 bg-blue-50 rounded-full">
                                <span className="text-xs font-bold text-blue-600 uppercase tracking-tighter">{items.length} Products Identified</span>
                            </div>
                        </div>

                        <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
                            <label className="block text-sm font-bold text-gray-700 mb-3">Add Items to Order</label>
                            <ProductSelector
                                onProductSelect={handleProductSelect}
                                excludeProductIds={usedProductIds}
                                placeholder="Type variant name, SKU or model..."
                            />
                        </div>

                        <div className="space-y-4">
                            {items.length === 0 ? (
                                <div className="text-center py-20 bg-gray-50/20 border-2 border-dashed border-gray-200 rounded-3xl">
                                    <ShoppingCart className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                                    <p className="text-sm text-gray-400 font-medium">Your purchase order is empty.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {items.map((item, index) => (
                                        <div key={index} className="flex flex-col sm:flex-row gap-6 p-6 border border-gray-100 rounded-2xl bg-white shadow-sm ring-1 ring-black/5 hover:ring-blue-500/20 transition-all group animate-in slide-in-from-right-4 duration-300">
                                            <div className="flex-[3] space-y-1">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg uppercase tracking-widest">{item.product.brand}</span>
                                                    <h4 className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{item.product.name}</h4>
                                                </div>
                                                <p className="text-[11px] font-mono text-gray-400 uppercase tracking-widest pl-0.5">{item.product.sku} • {item.product.model}</p>
                                            </div>

                                            <div className="flex flex-1 gap-6 items-center justify-between sm:justify-end">
                                                <div className="w-24">
                                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 sm:hidden">Qty</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={item.quantity}
                                                        onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                                                        className="w-full rounded-xl border-gray-200 px-3 py-2.5 text-sm font-bold text-center focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none border transition-all"
                                                    />
                                                </div>

                                                <div className="w-32">
                                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 text-right sm:hidden">Unit Cost</label>
                                                    <FormattedNumberInput
                                                        value={item.unitCost}
                                                        onChange={(val) => updateItem(index, 'unitCost', val)}
                                                        className="w-full rounded-xl border-gray-200 px-4 py-2.5 text-sm font-bold text-right focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none border text-blue-600"
                                                    />
                                                </div>

                                                <div className="w-36 text-right hidden sm:block">
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Line Total</p>
                                                    <Currency amount={item.totalCost} className="text-sm font-bold text-gray-900" />
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => removeItem(index)}
                                                    className="p-2.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex justify-end pt-8 border-t border-gray-100 mt-8">
                                <div className="flex flex-col items-end gap-2 px-4">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Grand Total Investment</p>
                                    <div className="flex items-center gap-4 bg-gray-50 px-6 py-3 rounded-2xl border border-gray-100">
                                        <div className="p-1.5 bg-blue-600 rounded-lg">
                                            <DollarSign className="w-4 h-4 text-white" />
                                        </div>
                                        <Currency amount={totalAmount} className="text-3xl font-black text-gray-900 tracking-tighter" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    )
}
