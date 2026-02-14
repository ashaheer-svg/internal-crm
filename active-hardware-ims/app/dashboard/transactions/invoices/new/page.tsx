"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Trash2, Save, Package, Upload } from "lucide-react"
import { Currency } from "@/components/Currency"
import ProductSelector from "./ProductSelector"
import StockDisplay from "./StockDisplay"
import BulkEntryModal from "./BulkEntryModal"
import CustomerSelector from "./CustomerSelector"

type Product = {
    id: string
    sku: string
    name: string
    brand: string
    model: string
}

type InventoryItem = {
    id: string
    serialNumber: string
    unitCost: number
    location: {
        id: string
        name: string
    }
}

type InvoiceItem = {
    inventoryItemId?: string
    productId: string
    productName: string
    serialNumber?: string
    unitPrice: number
    quantity: number
    isBackorder: boolean
}

export default function NewInvoicePage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const [invoiceNumber, setInvoiceNumber] = useState("DO-200001")
    const [invoiceRef, setInvoiceRef] = useState("")
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
    const [customerId, setCustomerId] = useState<string | null>(null)
    const [customerName, setCustomerName] = useState("")
    const [customerEmail, setCustomerEmail] = useState("")
    const [customerPhone, setCustomerPhone] = useState("")
    const [notes, setNotes] = useState("")
    const [salesRepId, setSalesRepId] = useState("")
    const [salesReps, setSalesReps] = useState<any[]>([])
    const [selectedItems, setSelectedItems] = useState<InvoiceItem[]>([])

    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
    const [showStockDisplay, setShowStockDisplay] = useState(false)
    const [showBulkEntry, setShowBulkEntry] = useState(false)

    useEffect(() => {
        fetchSalesReps()
    }, [])

    async function fetchSalesReps() {
        try {
            const res = await fetch("/api/sales-reps")
            if (res.ok) {
                const data = await res.json()
                setSalesReps(data.filter((r: any) => r.isActive))
            }
        } catch (error) {
            console.error("Failed to fetch sales reps")
        }
    }

    function handleCustomerSelect(customer: any) {
        if (customer) {
            setSelectedCustomer(customer)
            setCustomerId(customer.id)
            setCustomerName(customer.name)
            setCustomerEmail(customer.email || "")
            setCustomerPhone(customer.phone || "")
            if (customer.salesRepId) {
                setSalesRepId(customer.salesRepId)
            }
        } else {
            setSelectedCustomer(null)
            setCustomerId(null)
            // Keep manual entries if user clears customer
        }
    }

    function handleProductSelect(product: Product) {
        setSelectedProduct(product)
        setShowStockDisplay(true)
        setError("")
    }

    function handleSelectInventoryItem(item: InventoryItem) {
        if (!selectedProduct) return

        const newItem: InvoiceItem = {
            inventoryItemId: item.id,
            productId: selectedProduct.id,
            productName: `${selectedProduct.brand} ${selectedProduct.name}`,
            serialNumber: item.serialNumber,
            unitPrice: item.unitCost,
            quantity: 1,
            isBackorder: false
        }

        setSelectedItems([...selectedItems, newItem])
        setShowStockDisplay(false)
        setSelectedProduct(null)
        setError("")
    }

    function handleAddBackorder() {
        if (!selectedProduct) return

        const newItem: InvoiceItem = {
            productId: selectedProduct.id,
            productName: `${selectedProduct.brand} ${selectedProduct.name}`,
            unitPrice: 0,
            quantity: 1,
            isBackorder: true
        }

        setSelectedItems([...selectedItems, newItem])
        setShowStockDisplay(false)
        setSelectedProduct(null)
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

    function updateItemQuantity(index: number, quantity: number) {
        const newItems = [...selectedItems]
        newItems[index].quantity = Math.max(1, quantity)
        setSelectedItems(newItems)
    }

    function handleBulkAdd(items: any[]) {
        const newItems = items.map(item => ({
            inventoryItemId: item.id,
            productId: item.product.id,
            productName: `${item.product.brand} ${item.product.name}`,
            serialNumber: item.serialNumber,
            unitPrice: item.unitCost,
            quantity: 1,
            isBackorder: false
        }))
        setSelectedItems([...selectedItems, ...newItems])
        setShowBulkEntry(false)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError("")

        if (!invoiceNumber || !customerName) {
            setError("Delivery Order Number and Customer Name are required")
            setLoading(false)
            return
        }

        if (selectedItems.length === 0) {
            setError("Add at least one item to the delivery order")
            setLoading(false)
            return
        }

        try {
            const res = await fetch("/api/invoices", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    invoiceNumber,
                    customerInvoiceRef: invoiceRef,
                    customerId,
                    customerName,
                    customerEmail,
                    customerPhone,
                    notes,
                    salesRepId: salesRepId || null,
                    items: selectedItems
                }),
            })

            if (!res.ok) {
                const json = await res.json()
                throw new Error(json.error || "Failed to create delivery order")
            }

            const data = await res.json()
            router.push(`/dashboard/transactions/invoices/${data.id}`)
        } catch (e) {
            setError(e instanceof Error ? e.message : "Something went wrong")
        } finally {
            setLoading(false)
        }
    }

    const totalAmount = selectedItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0)
    const selectedItemIds = selectedItems
        .filter(item => item.inventoryItemId)
        .map(item => item.inventoryItemId!)
    const usedProductIds = selectedItems.map(item => item.productId)

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/transactions" className="p-2 hover:bg-gray-200 rounded-full">
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </Link>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">New Delivery Order</h1>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Delivery Order Details */}
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
                                <label className="block text-sm font-medium text-gray-700">Delivery Order Number *</label>
                                <input
                                    type="text"
                                    required
                                    value={invoiceNumber}
                                    onChange={(e) => setInvoiceNumber(e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm"
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-gray-700">Invoice Number</label>
                                <input
                                    type="text"
                                    value={invoiceRef}
                                    onChange={(e) => setInvoiceRef(e.target.value)}
                                    placeholder="Optional - Enter invoice number if applicable"
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm"
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <CustomerSelector
                                    onSelect={handleCustomerSelect}
                                    selectedCustomer={selectedCustomer}
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-gray-700">Customer Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    disabled={!!selectedCustomer}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm disabled:bg-gray-100 disabled:text-gray-600"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Email</label>
                                <input
                                    type="email"
                                    value={customerEmail}
                                    onChange={(e) => setCustomerEmail(e.target.value)}
                                    disabled={!!selectedCustomer}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm disabled:bg-gray-100 disabled:text-gray-600"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Phone</label>
                                <input
                                    type="tel"
                                    value={customerPhone}
                                    onChange={(e) => setCustomerPhone(e.target.value)}
                                    disabled={!!selectedCustomer}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm disabled:bg-gray-100 disabled:text-gray-600"
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

                            <div className="sm:col-span-1">
                                <label className="block text-sm font-medium text-gray-700">Sales Representative</label>
                                <select
                                    value={salesRepId}
                                    onChange={(e) => setSalesRepId(e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                                >
                                    <option value="">Select Sales Rep</option>
                                    {salesReps.map(rep => (
                                        <option key={rep.id} value={rep.id}>{rep.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Add Items */}
                    <div className="bg-white shadow sm:rounded-lg p-6 space-y-4">
                        <h2 className="text-lg font-medium text-gray-900">Add Items</h2>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Select Product
                            </label>
                            <ProductSelector
                                onProductSelect={handleProductSelect}
                                excludeProductIds={usedProductIds}
                            />
                        </div>

                        {showStockDisplay && selectedProduct && (
                            <div className="mt-4 p-4 border border-blue-200 rounded-lg bg-blue-50">
                                <StockDisplay
                                    productId={selectedProduct.id}
                                    productName={`${selectedProduct.brand} ${selectedProduct.name}`}
                                    onSelectItem={handleSelectInventoryItem}
                                    onAddOutOfStock={handleAddBackorder}
                                    selectedItemIds={selectedItemIds}
                                />
                            </div>
                        )}
                    </div>

                    {/* Selected Items */}
                    <div className="bg-white shadow sm:rounded-lg p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-medium text-gray-900">Delivery Items</h2>
                            <button
                                type="button"
                                onClick={() => setShowBulkEntry(true)}
                                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                            >
                                <Upload className="w-4 h-4 mr-2" />
                                Bulk Entry
                            </button>
                        </div>

                        {selectedItems.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-8">
                                No items added yet. Select a product above to add items.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {/* Header Row */}
                                <div className="hidden sm:flex gap-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    <div className="flex-1">Product Items</div>
                                    <div className="w-24 text-center">Qty</div>
                                    <div className="w-32 text-right">Price</div>
                                    <div className="w-8"></div>
                                </div>

                                {selectedItems.map((item, index) => (
                                    <div key={index} className={`flex gap-3 items-center p-3 border rounded-md text-sm ${item.isBackorder ? 'bg-amber-50 border-amber-200' : ''}`}>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium text-gray-900">{item.productName}</p>
                                                {item.isBackorder && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                                                        <Package className="w-3 h-3 mr-1" />
                                                        Backorder
                                                    </span>
                                                )}
                                            </div>
                                            {item.serialNumber && (
                                                <p className="text-xs text-gray-500">S/N: {item.serialNumber}</p>
                                            )}
                                        </div>

                                        <div className="w-24 text-center">
                                            {item.isBackorder ? (
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={item.quantity}
                                                    onChange={(e) => updateItemQuantity(index, Number(e.target.value))}
                                                    className="block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm text-center"
                                                    aria-label="Quantity"
                                                />
                                            ) : (
                                                <span className="text-gray-600 block py-2">{item.quantity}</span>
                                            )}
                                        </div>

                                        <div className="w-32">
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={item.unitPrice}
                                                onChange={(e) => updateItemPrice(index, Number(e.target.value))}
                                                className="block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm text-right"
                                                aria-label="Price"
                                            />
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => removeItem(index)}
                                            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                                            title="Remove item"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}

                                <div className="flex justify-end pt-4 border-t">
                                    <div className="text-right flex items-center gap-4">
                                        <p className="text-sm font-medium text-gray-700">Total Amount:</p>
                                        <Currency amount={totalAmount} className="text-xl font-bold text-gray-900" />
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
                            {loading ? "Creating..." : "Create Delivery Order"}
                        </button>
                    </div>
                </div>

                {/* Right Column - Summary */}
                <div className="space-y-4">
                    <div className="bg-white shadow sm:rounded-lg p-4 sticky top-4">
                        <h3 className="text-sm font-medium text-gray-900 mb-3">Order Summary</h3>

                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Total Items:</span>
                                <span className="font-medium">{selectedItems.length}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">In Stock:</span>
                                <span className="font-medium">{selectedItems.filter(i => !i.isBackorder).length}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Backorders:</span>
                                <span className="font-medium text-amber-600">{selectedItems.filter(i => i.isBackorder).length}</span>
                            </div>
                            <div className="pt-2 border-t flex justify-between">
                                <span className="text-gray-900 font-medium">Total:</span>
                                <Currency amount={totalAmount} className="text-lg font-bold text-gray-900" />
                            </div>
                        </div>
                    </div>
                </div>
            </form>

            {/* Bulk Entry Modal */}
            {showBulkEntry && (
                <BulkEntryModal
                    onAdd={handleBulkAdd}
                    onClose={() => setShowBulkEntry(false)}
                    excludedItemIds={selectedItemIds}
                />
            )}
        </div>
    )
}
