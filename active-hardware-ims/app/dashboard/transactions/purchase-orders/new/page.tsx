"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Trash2, Save } from "lucide-react"
import { Currency } from "@/components/Currency"
import ProductSelector from "../../invoices/new/ProductSelector"

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

    const [suppliers, setSuppliers] = useState<{ id: string, name: string }[]>([])

    useEffect(() => {
        fetchNextPoNumber()
        fetchSuppliers()
    }, [])

    async function fetchSuppliers() {
        try {
            const res = await fetch("/api/customers?type=SUPPLIER&limit=100")
            if (res.ok) {
                const data = await res.json()
                setSuppliers(data.customers || [])
            }
        } catch (error) {
            console.error("Failed to fetch suppliers", error)
        }
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
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/transactions" className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">New Purchase Order</h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                    <div className="bg-red-50 border-l-4 border-red-400 p-4">
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                )}

                {/* Header Info */}
                <div className="bg-white shadow sm:rounded-lg p-6 space-y-4">
                    <h2 className="text-lg font-medium text-gray-900">Purchase Order Details</h2>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">PO Number *</label>
                            <input
                                type="text"
                                required
                                value={poNumber}
                                onChange={(e) => setPoNumber(e.target.value)}
                                className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Supplier *</label>
                            <select
                                required
                                value={supplier}
                                onChange={(e) => setSupplier(e.target.value)}
                                className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            >
                                <option value="">Select a supplier</option>
                                {suppliers.map((s) => (
                                    <option key={s.id} value={s.name}>
                                        {s.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Notes</label>
                        <textarea
                            rows={2}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                    </div>
                </div>

                {/* Items */}
                <div className="bg-white shadow sm:rounded-lg p-6 space-y-4">
                    <div>
                        <h2 className="text-lg font-medium text-gray-900 mb-4">Items</h2>
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Add Product</label>
                            <ProductSelector
                                onProductSelect={handleProductSelect}
                                excludeProductIds={usedProductIds}
                            />
                        </div>
                    </div>

                    {items.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                            No items added through search yet.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {/* Header Row */}
                            <div className="hidden sm:flex gap-4 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                <div className="flex-[2]">Product</div>
                                <div className="w-24 text-center">Quantity</div>
                                <div className="w-32 text-right pr-2">Unit Cost</div>
                                <div className="w-32 text-right">Total</div>
                                <div className="w-8"></div>
                            </div>

                            {items.map((item, index) => (
                                <div key={index} className="flex gap-4 items-center p-3 border rounded-md text-sm bg-gray-50">
                                    <div className="flex-[2]">
                                        <p className="font-medium text-gray-900">
                                            {item.product.brand} {item.product.name}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            SKU: {item.product.sku}
                                        </p>
                                    </div>

                                    <div className="w-24">
                                        <input
                                            type="number"
                                            min="1"
                                            value={item.quantity}
                                            onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                                            className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-center"
                                            aria-label="Quantity"
                                        />
                                    </div>

                                    <div className="w-32">
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={item.unitCost}
                                            onChange={(e) => updateItem(index, 'unitCost', Number(e.target.value))}
                                            className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-right"
                                            aria-label="Unit Cost"
                                        />
                                    </div>

                                    <div className="w-32 text-right font-semibold">
                                        <Currency amount={item.totalCost} className="text-gray-900" />
                                    </div>

                                    <div className="w-8 flex justify-end">
                                        <button
                                            type="button"
                                            onClick={() => removeItem(index)}
                                            className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                            title="Remove item"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex justify-end pt-4 border-t">
                        <div className="text-right flex items-center gap-4">
                            <p className="text-sm font-medium text-gray-700">Total Amount:</p>
                            <Currency amount={totalAmount} className="text-xl font-bold text-gray-900" />
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3">
                    <Link
                        href="/dashboard/transactions"
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                    >
                        Cancel
                    </Link>
                    <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Save className="w-4 h-4" />
                        {loading ? "Creating..." : "Create Purchase Order"}
                    </button>
                </div>
            </form>
        </div>
    )
}
