"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Plus, Trash2, Save, Search } from "lucide-react"

type AvailableItem = {
    id: string
    serialNumber: string
    unitCost: number
    product: {
        id: string
        sku: string
        name: string
        brand: string
    }
    location: {
        name: string
    }
}

type InvoiceItem = {
    inventoryItemId: string
    productName: string
    serialNumber: string
    unitPrice: number
}

export default function NewInvoicePage() {
    const router = useRouter()
    const [availableItems, setAvailableItems] = useState<AvailableItem[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const [invoiceNumber, setInvoiceNumber] = useState("")
    const [customerName, setCustomerName] = useState("")
    const [customerEmail, setCustomerEmail] = useState("")
    const [customerPhone, setCustomerPhone] = useState("")
    const [notes, setNotes] = useState("")
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedItems, setSelectedItems] = useState<InvoiceItem[]>([])

    useEffect(() => {
        fetchAvailableInventory()
        // Generate invoice number
        setInvoiceNumber(`INV-${Date.now()}`)
    }, [])

    async function fetchAvailableInventory() {
        try {
            const res = await fetch('/api/inventory/available')
            const data = await res.json()
            setAvailableItems(data)
        } catch (error) {
            console.error(error)
        }
    }

    function addItemToInvoice(item: AvailableItem) {
        // Check if already added
        if (selectedItems.find(i => i.inventoryItemId === item.id)) {
            setError("Item already added to invoice")
            return
        }

        setSelectedItems([...selectedItems, {
            inventoryItemId: item.id,
            productName: `${item.product.brand} ${item.product.name}`,
            serialNumber: item.serialNumber,
            unitPrice: item.unitCost || 0
        }])
        setSearchTerm("")
        setError("")
    }

    function removeItem(index: number) {
        setSelectedItems(selectedItems.filter((_, i) => i !== index))
    }

    function updateItemPrice(index: number, price: number) {
        const newItems = [...selectedItems]
        newItems[index].unitPrice = price
        setSelectedItems(newItems)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError("")

        if (!invoiceNumber || !customerName) {
            setError("Invoice Number and Customer Name are required")
            setLoading(false)
            return
        }

        if (selectedItems.length === 0) {
            setError("Add at least one item to the invoice")
            setLoading(false)
            return
        }

        try {
            const res = await fetch("/api/invoices", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    invoiceNumber,
                    customerName,
                    customerEmail,
                    customerPhone,
                    notes,
                    items: selectedItems
                }),
            })

            if (!res.ok) {
                const json = await res.json()
                throw new Error(json.error || "Failed to create invoice")
            }

            const data = await res.json()
            router.push(`/dashboard/transactions/invoices/${data.id}`)
        } catch (e) {
            setError(e instanceof Error ? e.message : "Something went wrong")
        } finally {
            setLoading(false)
        }
    }

    const totalAmount = selectedItems.reduce((sum, item) => sum + item.unitPrice, 0)
    const filteredItems = availableItems.filter(item =>
        item.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.product.sku.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/transactions" className="p-2 hover:bg-gray-200 rounded-full">
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </Link>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">New Invoice</h1>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Invoice Details */}
                <div className="lg:col-span-2 space-y-6">
                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-400 p-4">
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    )}

                    {/* Customer Info */}
                    <div className="bg-white shadow sm:rounded-lg p-6 space-y-4">
                        <h2 className="text-lg font-medium text-gray-900">Customer Information</h2>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-gray-700">Invoice Number *</label>
                                <input
                                    type="text"
                                    required
                                    value={invoiceNumber}
                                    onChange={(e) => setInvoiceNumber(e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm"
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-gray-700">Customer Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Email</label>
                                <input
                                    type="email"
                                    value={customerEmail}
                                    onChange={(e) => setCustomerEmail(e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Phone</label>
                                <input
                                    type="tel"
                                    value={customerPhone}
                                    onChange={(e) => setCustomerPhone(e.target.value)}
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

                    {/* Selected Items */}
                    <div className="bg-white shadow sm:rounded-lg p-6 space-y-4">
                        <h2 className="text-lg font-medium text-gray-900">Invoice Items</h2>

                        {selectedItems.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-8">
                                No items added yet. Search and select items from the inventory panel →
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {selectedItems.map((item, index) => (
                                    <div key={index} className="flex gap-3 items-center p-3 border rounded-md">
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-gray-900">{item.productName}</p>
                                            <p className="text-xs text-gray-500">S/N: {item.serialNumber}</p>
                                        </div>
                                        <div className="w-32">
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Price</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={item.unitPrice}
                                                onChange={(e) => updateItemPrice(index, Number(e.target.value))}
                                                className="block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeItem(index)}
                                            className="p-2 text-red-600 hover:text-red-800"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}

                                <div className="flex justify-end pt-4 border-t">
                                    <div className="text-right">
                                        <p className="text-sm text-gray-500">Total Amount</p>
                                        <p className="text-2xl font-bold text-gray-900">Rs. {totalAmount.toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3">
                        <Link
                            href="/dashboard/transactions"
                            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={loading || selectedItems.length === 0}
                            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            {loading ? "Creating..." : "Create Invoice"}
                        </button>
                    </div>
                </div>

                {/* Right Column - Available Inventory */}
                <div className="space-y-4">
                    <div className="bg-white shadow sm:rounded-lg p-4 sticky top-4">
                        <h3 className="text-sm font-medium text-gray-900 mb-3">Available Inventory</h3>

                        <div className="relative mb-3">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by serial, product..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm"
                            />
                        </div>

                        <div className="max-h-96 overflow-y-auto space-y-2">
                            {filteredItems.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => addItemToInvoice(item)}
                                    className="w-full text-left p-3 border rounded-md hover:bg-gray-50 transition-colors"
                                    disabled={selectedItems.some(i => i.inventoryItemId === item.id)}
                                >
                                    <p className="text-sm font-medium text-gray-900">{item.product.name}</p>
                                    <p className="text-xs text-gray-500">S/N: {item.serialNumber}</p>
                                    <p className="text-xs text-gray-500">SKU: {item.product.sku} | Rs. {item.unitCost.toFixed(2)}</p>
                                    <p className="text-xs text-blue-600">{item.location.name}</p>
                                </button>
                            ))}
                            {filteredItems.length === 0 && (
                                <p className="text-sm text-gray-500 text-center py-4">No available items found</p>
                            )}
                        </div>
                    </div>
                </div>
            </form>
        </div>
    )
}
