"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Trash2, Save } from "lucide-react"
import { Currency } from "@/components/Currency"
import ProductSelector from "../../../invoices/new/ProductSelector"

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
    receivedQty?: number
    product: Product
}

type Props = {
    params: Promise<{ id: string }>
}

export default function EditPurchaseOrderPage({ params }: Props) {
    const { id } = use(params)
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState("")

    const [poNumber, setPoNumber] = useState("")
    const [supplier, setSupplier] = useState("")
    const [notes, setNotes] = useState("")
    const [items, setItems] = useState<POItem[]>([])
    const [isReadOnlyItems, setIsReadOnlyItems] = useState(false)

    useEffect(() => {
        fetchPoDetails()
    }, [])

    async function fetchPoDetails() {
        try {
            const res = await fetch(`/api/purchase-orders/${id}`)
            if (!res.ok) throw new Error("Failed to fetch PO details")
            const data = await res.json()

            setPoNumber(data.poNumber)
            setSupplier(data.supplier)
            setNotes(data.notes || "")

            // Map items
            const poItems = data.items.map((item: any) => ({
                productId: item.productId,
                quantity: item.quantity,
                unitCost: item.unitCost,
                totalCost: item.totalCost,
                receivedQty: item.receivedQty,
                product: item.product
            }))
            setItems(poItems)

            // Check if items should be locked
            const hasReceived = poItems.some((i: any) => i.receivedQty > 0)
            if (hasReceived) {
                setIsReadOnlyItems(true)
            }

        } catch (e) {
            setError("Failed to load Purchase Order")
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    function handleProductSelect(product: Product) {
        if (isReadOnlyItems) return

        // Check if already added
        if (items.some(i => i.productId === product.id)) {
            setError(`Product ${product.sku} is already in the list`)
            setTimeout(() => setError(""), 3000)
            return
        }

        const newItem: POItem = {
            productId: product.id,
            quantity: 1,
            unitCost: 0,
            totalCost: 0,
            receivedQty: 0,
            product: product
        }
        setItems([...items, newItem])
    }

    function removeItem(index: number) {
        if (isReadOnlyItems) return
        setItems(items.filter((_, i) => i !== index))
    }

    function updateItem(index: number, field: keyof POItem, value: any) {
        if (isReadOnlyItems) return

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
            }

            // Only send items if they are editable
            if (!isReadOnlyItems) {
                body.items = validItems.map(i => ({
                    productId: i.productId,
                    quantity: i.quantity,
                    unitCost: i.unitCost,
                    totalCost: i.totalCost
                }))
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
    const usedProductIds = items.map(i => i.productId)

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
                    <div>
                        <h2 className="text-lg font-medium text-gray-900 mb-4">Items</h2>
                        {!isReadOnlyItems && (
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Add Product</label>
                                <ProductSelector
                                    onProductSelect={handleProductSelect}
                                    excludeProductIds={usedProductIds}
                                />
                            </div>
                        )}
                    </div>

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
                            <div key={index} className={`flex gap-4 items-center p-3 border rounded-md text-sm ${isReadOnlyItems || item.receivedQty && item.receivedQty > 0 ? 'bg-gray-50' : ''}`}>
                                <div className="flex-[2]">
                                    <p className="font-medium text-gray-900">
                                        {item.product?.brand} {item.product?.name}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        SKU: {item.product?.sku} {item.receivedQty ? `| Received: ${item.receivedQty}` : ''}
                                    </p>
                                </div>

                                <div className="w-24">
                                    <input
                                        type="number"
                                        min="1"
                                        value={item.quantity}
                                        onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                                        disabled={isReadOnlyItems}
                                        className="block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm text-center disabled:bg-gray-100"
                                    />
                                </div>

                                <div className="w-32">
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={item.unitCost}
                                        onChange={(e) => updateItem(index, 'unitCost', Number(e.target.value))}
                                        disabled={isReadOnlyItems}
                                        className="block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm text-right disabled:bg-gray-100"
                                    />
                                </div>

                                <div className="w-32 text-right font-semibold">
                                    <Currency amount={item.totalCost} className="text-gray-900" />
                                </div>

                                <div className="w-8 flex justify-end">
                                    {!isReadOnlyItems && (
                                        <button
                                            type="button"
                                            onClick={() => removeItem(index)}
                                            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                                            title="Remove item"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

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
