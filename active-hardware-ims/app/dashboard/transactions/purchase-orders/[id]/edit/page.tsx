"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react"
import { Currency } from "@/components/Currency"

type Product = {
    id: string
    sku: string
    name: string
    brand: string
    category: string
}

type POItem = {
    productId: string
    quantity: number
    unitCost: number
    totalCost: number
    receivedQty?: number
}

type Props = {
    params: Promise<{ id: string }>
}

export default function EditPurchaseOrderPage({ params }: Props) {
    const { id } = use(params)
    const router = useRouter()
    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true) // Start loading to fetch data
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState("")

    const [poNumber, setPoNumber] = useState("")
    const [supplier, setSupplier] = useState("")
    const [notes, setNotes] = useState("")
    const [status, setStatus] = useState("")
    const [items, setItems] = useState<POItem[]>([])
    const [isReadOnlyItems, setIsReadOnlyItems] = useState(false)

    useEffect(() => {
        Promise.all([fetchProducts(), fetchPoDetails()]).finally(() => setLoading(false))
    }, [])

    async function fetchPoDetails() {
        try {
            const res = await fetch(`/api/purchase-orders/${id}`)
            if (!res.ok) throw new Error("Failed to fetch PO details")
            const data = await res.json()

            setPoNumber(data.poNumber)
            setSupplier(data.supplier)
            setNotes(data.notes || "")
            setStatus(data.status)

            // Map items
            const poItems = data.items.map((item: any) => ({
                productId: item.productId,
                quantity: item.quantity,
                unitCost: item.unitCost,
                totalCost: item.totalCost,
                receivedQty: item.receivedQty
            }))
            setItems(poItems)

            // Check if items should be locked
            // If any item has receivedQty > 0 or status is not DRAFT, we might want to lock items
            // API logic: "Cannot edit items of a PO that has received stock."
            const hasReceived = poItems.some((i: any) => i.receivedQty > 0)
            if (hasReceived) { // || data.status !== 'DRAFT' // Relaxing Draft check to allow editing items if nothing received yet, unless API blocks it. API blocks if received > 0.
                setIsReadOnlyItems(true)
            }

        } catch (e) {
            setError("Failed to load Purchase Order")
            console.error(e)
        }
    }

    async function fetchProducts() {
        try {
            const res = await fetch('/api/products')
            if (res.ok) {
                const data = await res.json()
                setProducts(data)
            }
        } catch (error) {
            console.error("Failed to fetch products", error)
        }
    }

    function addItem() {
        setItems([...items, { productId: "", quantity: 1, unitCost: 0, totalCost: 0 }])
    }

    function removeItem(index: number) {
        setItems(items.filter((_, i) => i !== index))
    }

    function updateItem(index: number, field: keyof POItem, value: any) {
        const newItems = [...items]
        newItems[index] = { ...newItems[index], [field]: value }

        // Auto-calculate total cost
        if (field === 'quantity' || field === 'unitCost') {
            newItems[index].totalCost = newItems[index].quantity * newItems[index].unitCost
        }

        setItems(newItems)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setSaving(true)
        setError("")

        // Validation
        if (!supplier) {
            setError("Supplier is required")
            setSaving(false)
            return
        }

        const validItems = items.filter(item => item.productId && item.quantity > 0)

        // If not read-only, validate items
        if (!isReadOnlyItems && validItems.length === 0) {
            setError("Add at least one item to the purchase order")
            setSaving(false)
            return
        }

        try {
            const body: any = {
                supplier,
                notes,
                status // Preserve status or allow changing? Usually status change is a separate action, but here we keep it simple.
            }

            // Only send items if they are editable
            if (!isReadOnlyItems) {
                body.items = validItems
            }

            const res = await fetch(`/api/purchase-orders/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            })

            if (!res.ok) {
                const json = await res.json()
                throw new Error(json.error || "Failed to update purchase order")
            }

            router.push(`/dashboard/transactions/purchase-orders/${id}`)
            router.refresh()
        } catch (e) {
            setError(e instanceof Error ? e.message : "Something went wrong")
        } finally {
            setSaving(false)
        }
    }

    const totalAmount = items.reduce((sum, item) => sum + item.totalCost, 0)

    if (loading) return <div className="p-6">Loading...</div>

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href={`/dashboard/transactions/purchase-orders/${id}`} className="p-2 hover:bg-gray-200 rounded-full">
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Edit Purchase Order</h1>
                    <p className="text-sm text-gray-500">{poNumber}</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                    <div className="bg-red-50 border-l-4 border-red-400 p-4">
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                )}

                {isReadOnlyItems && (
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                        <p className="text-sm text-yellow-700">
                            <strong>Note:</strong> Items cannot be edited because this PO has received stock.
                            You can only update the Supplier and Notes.
                        </p>
                    </div>
                )}

                {/* Header Info */}
                <div className="bg-white shadow sm:rounded-lg p-6 space-y-4">
                    <h2 className="text-lg font-medium text-gray-900">Purchase Order Details</h2>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">PO Number</label>
                            <input
                                type="text"
                                disabled
                                value={poNumber}
                                className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm border p-2 text-sm cursor-not-allowed"
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
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Notes</label>
                        <textarea
                            rows={2}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm"
                        />
                    </div>
                </div>

                {/* Items */}
                <div className="bg-white shadow sm:rounded-lg p-6 space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-medium text-gray-900">Items</h2>
                        {!isReadOnlyItems && (
                            <button
                                type="button"
                                onClick={addItem}
                                className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                            >
                                <Plus className="w-4 h-4 mr-1" />
                                Add Item
                            </button>
                        )}
                    </div>

                    <div className="space-y-3">
                        {items.map((item, index) => (
                            <div key={index} className={`flex gap-2 items-start p-3 border rounded-md ${isReadOnlyItems ? 'bg-gray-50' : ''}`}>
                                <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2">
                                    <div className="sm:col-span-2">
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Product</label>
                                        <select
                                            value={item.productId}
                                            onChange={(e) => updateItem(index, 'productId', e.target.value)}
                                            disabled={isReadOnlyItems}
                                            className="block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm disabled:bg-gray-100"
                                        >
                                            <option value="">Select product...</option>
                                            {products.map(p => (
                                                <option key={p.id} value={p.id}>{p.sku} - {p.name} ({p.category})</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={item.quantity}
                                            onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                                            disabled={isReadOnlyItems}
                                            className="block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm disabled:bg-gray-100"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Unit Cost</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={item.unitCost}
                                            onChange={(e) => updateItem(index, 'unitCost', Number(e.target.value))}
                                            disabled={isReadOnlyItems}
                                            className="block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm disabled:bg-gray-100"
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col items-end gap-1">
                                    <span className="text-xs text-gray-500">Total</span>
                                    <Currency amount={item.totalCost} className="font-semibold text-sm text-right" />
                                    {!isReadOnlyItems && items.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeItem(index)}
                                            className="mt-1 p-1 text-red-600 hover:text-red-800"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-end pt-4 border-t">
                        <div className="text-right">
                            <p className="text-sm text-gray-500">Total Amount</p>
                            <Currency amount={totalAmount} className="text-2xl font-bold text-gray-900" />
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3">
                    <Link
                        href={`/dashboard/transactions/purchase-orders/${id}`}
                        className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                        Cancel
                    </Link>
                    <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                    >
                        <Save className="w-4 h-4 mr-2" />
                        {saving ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </form>
        </div>
    )
}
