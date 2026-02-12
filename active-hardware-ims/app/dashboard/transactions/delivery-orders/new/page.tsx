"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Trash2, Save, Package, ScanLine, Search } from "lucide-react"
import { Currency } from "@/components/Currency"
import ProductSelector from "@/app/dashboard/transactions/invoices/new/ProductSelector"
import CustomerSelector from "@/app/dashboard/transactions/invoices/new/CustomerSelector"
import BulkEntryModal from "@/app/dashboard/transactions/invoices/new/BulkEntryModal"

type DeliveryOrderItem = {
    productId: string
    productName: string
    quantity: number
    unitPrice: number
    isBackorder: boolean // For display only in draft
}

export default function NewDeliveryOrderPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const [orderNumber, setOrderNumber] = useState("DO-" + new Date().toISOString().slice(2, 7).replace(/-/g, "") + Math.floor(Math.random() * 1000))
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
    const [customerId, setCustomerId] = useState<string | null>(null)
    const [customerName, setCustomerName] = useState("")
    const [notes, setNotes] = useState("")
    const [invoiceValue, setInvoiceValue] = useState<string>("")
    const [additionalCosts, setAdditionalCosts] = useState<string>("")

    // Address Selection
    const [availableAddresses, setAvailableAddresses] = useState<any[]>([])
    const [deliveryAddress, setDeliveryAddress] = useState("")

    // Items
    const [items, setItems] = useState<DeliveryOrderItem[]>([])

    // Serial Entry State
    const [serialInput, setSerialInput] = useState("")
    const [findingSerial, setFindingSerial] = useState(false)

    function handleCustomerSelect(customer: any) {
        if (customer) {
            setSelectedCustomer(customer)
            setCustomerId(customer.id)
            setCustomerName(customer.name)

            // Fetch addresses
            fetch(`/api/customers/${customer.id}/addresses`)
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) {
                        setAvailableAddresses(data)
                        // Auto-select default
                        const defaultAddr = data.find((a: any) => a.isDefault)
                        if (defaultAddr) {
                            setDeliveryAddress(defaultAddr.address)
                        } else if (data.length > 0) {
                            // Or maybe don't auto select? Let's auto select first one if no default
                            setDeliveryAddress(data[0].address)
                        } else {
                            setDeliveryAddress("")
                        }
                    } else {
                        setAvailableAddresses([])
                        setDeliveryAddress("")
                    }
                })
                .catch(() => {
                    setAvailableAddresses([])
                    setDeliveryAddress("")
                })

        } else {
            setSelectedCustomer(null)
            setCustomerId(null)
            setAvailableAddresses([])
            setDeliveryAddress("")
        }
    }

    function handleProductSelect(product: any) {
        // Check if already exists
        const existingInfo = items.find(i => i.productId === product.id)
        if (existingInfo) {
            // increment or just alert? Let's just alert for now or add new line? 
            // Better to allow duplicates? No, unique lines per product usually better but...
            // Let's just add a new line for simplicity
        }

        const newItem: DeliveryOrderItem = {
            productId: product.id,
            productName: `${product.brand} ${product.name}`,
            quantity: 1,
            unitPrice: product.resellerPrice || 0,
            isBackorder: false
        }
        setItems([...items, newItem])
    }

    async function handleSerialAdd() {
        if (!serialInput.trim()) return
        setFindingSerial(true)
        setError("")

        try {
            // Find inventory item by serial
            // We can reuse the cost-adjustment API or create a specific lookup
            const res = await fetch(`/api/inventory/cost-adjustment?serials=${encodeURIComponent(serialInput)}`)
            if (!res.ok) throw new Error("Search failed")
            const data = await res.json()

            if (data.length === 0) {
                setError("Serial number not found in inventory")
            } else {
                const item = data[0]
                // Add as item
                const newItem: DeliveryOrderItem = {
                    productId: item.product.id,
                    productName: `${item.product.brand} ${item.product.name} (S/N: ${item.serialNumber})`,
                    quantity: 1,
                    unitPrice: item.product.resellerPrice || 0, // Fallback to product price? Or item cost? Delivery usually uses sell price
                    isBackorder: false
                }
                setItems([...items, newItem])
                setSerialInput("")
            }
        } catch (e) {
            setError("Failed to look up serial number")
        } finally {
            setFindingSerial(false)
        }
    }

    function removeItem(index: number) {
        setItems(items.filter((_, i) => i !== index))
    }

    function updateItemQuantity(index: number, qty: number) {
        const newItems = [...items]
        newItems[index].quantity = Math.max(1, qty)
        setItems(newItems)
    }

    function updateItemPrice(index: number, price: number) {
        const newItems = [...items]
        newItems[index].unitPrice = price
        setItems(newItems)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError("")

        if (!orderNumber || !customerName) {
            setError("Order Number and Customer Name are required")
            setLoading(false)
            return
        }

        if (items.length === 0) {
            setError("Add at least one item")
            setLoading(false)
            return
        }

        try {
            const res = await fetch("/api/delivery-orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    orderNumber,
                    customerId,
                    customerName,
                    deliveryAddress,
                    invoiceValue: Number(invoiceValue),
                    additionalCosts: Number(additionalCosts),
                    notes,
                    items
                }),
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Failed to create order")

            router.push(`/dashboard/transactions/delivery-orders/${data.id}`)
        } catch (e) {
            setError(e instanceof Error ? e.message : "Something went wrong")
        } finally {
            setLoading(false)
        }
    }

    const totalAmount = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0)

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/transactions?tab=do" className="p-2 hover:bg-gray-200 rounded-full">
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </Link>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">New Delivery Order (Draft)</h1>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-400 p-4">
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    )}

                    {/* Customer Info */}
                    <div className="bg-white shadow sm:rounded-lg p-6 space-y-4">
                        <h2 className="text-lg font-medium text-gray-900">Order Details</h2>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="sm:col-span-1">
                                <label className="block text-sm font-medium text-gray-700">Order Number *</label>
                                <input
                                    type="text"
                                    required
                                    value={orderNumber}
                                    onChange={(e) => setOrderNumber(e.target.value)}
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
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm"
                                />
                            </div>
                            <div className="sm:col-span-1">
                                <label className="block text-sm font-medium text-gray-700">Invoice Value (Excl. Tax)</label>
                                <div className="relative mt-1 rounded-md shadow-sm">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <span className="text-gray-500 sm:text-sm">Rs.</span>
                                    </div>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={invoiceValue}
                                        onChange={(e) => setInvoiceValue(e.target.value)}
                                        className="block w-full rounded-md border-gray-300 pl-10 focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                            <div className="sm:col-span-1">
                                <label className="block text-sm font-medium text-gray-700">Additional Costs (Overhead)</label>
                                <div className="relative mt-1 rounded-md shadow-sm">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <span className="text-gray-500 sm:text-sm">Rs.</span>
                                    </div>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={additionalCosts}
                                        onChange={(e) => setAdditionalCosts(e.target.value)}
                                        className="block w-full rounded-md border-gray-300 pl-10 focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                                        placeholder="0.00"
                                    />
                                </div>
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

                            {/* Delivery Address Selection */}
                            <div className="sm:col-span-2 border-t pt-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Address</label>
                                {customerId ? (
                                    <div className="space-y-3">
                                        {availableAddresses.length > 0 ? (
                                            <div className="grid grid-cols-1 gap-2">
                                                {availableAddresses.map((addr) => (
                                                    <label key={addr.id} className={`flex items-start p-3 border rounded-md cursor-pointer hover:bg-gray-50 ${deliveryAddress === addr.address ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50' : ''}`}>
                                                        <input
                                                            type="radio"
                                                            name="deliveryAddress"
                                                            checked={deliveryAddress === addr.address}
                                                            onChange={() => setDeliveryAddress(addr.address)}
                                                            className="mt-1 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                                        />
                                                        <div className="ml-3">
                                                            <span className="block text-sm font-medium text-gray-900">{addr.label}</span>
                                                            <span className="block text-sm text-gray-500">{addr.address}</span>
                                                            {(addr.contactName || addr.phone) && (
                                                                <span className="block text-xs text-gray-400 mt-1">
                                                                    {addr.contactName} {addr.phone && `• ${addr.phone}`}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </label>
                                                ))}
                                                <label className="flex items-center space-x-2 mt-2">
                                                    <input
                                                        type="radio"
                                                        name="deliveryAddress"
                                                        checked={deliveryAddress === ''} // Or separate "Custom" state? simplified: if not matching any known address
                                                        onChange={() => setDeliveryAddress("")}
                                                        className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                                    />
                                                    <span className="text-sm text-gray-700">Custom / None</span>
                                                </label>
                                                {(!availableAddresses.some(a => a.address === deliveryAddress) && deliveryAddress !== "") && (
                                                    <div className="mt-2">
                                                        <label className="block text-xs text-gray-500">Custom Address</label>
                                                        <textarea
                                                            value={deliveryAddress}
                                                            onChange={(e) => setDeliveryAddress(e.target.value)}
                                                            rows={2}
                                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="text-sm text-gray-500 italic">
                                                No saved addresses found for this partner.
                                                <textarea
                                                    value={deliveryAddress}
                                                    onChange={(e) => setDeliveryAddress(e.target.value)}
                                                    rows={2}
                                                    placeholder="Enter delivery address..."
                                                    className="mt-2 block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm"
                                                />
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500 italic">Select a customer to view delivery addresses.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Add Items */}
                    <div className="bg-white shadow sm:rounded-lg p-6 space-y-4">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-medium text-gray-900">Add Items</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Method 1: Product SKU */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">Add by Product (SKU)</label>
                                <ProductSelector
                                    onProductSelect={handleProductSelect}
                                    excludeProductIds={[]}
                                />
                                <p className="text-xs text-gray-500">Search by name, brand, or model</p>
                            </div>

                            {/* Method 2: Serial Number */}
                            <div className="space-y-2 border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6 border-gray-200">
                                <label className="block text-sm font-medium text-gray-700">Add by Serial Number</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={serialInput}
                                        onChange={(e) => setSerialInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSerialAdd())}
                                        placeholder="Scan or enter S/N"
                                        className="block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleSerialAdd}
                                        disabled={findingSerial || !serialInput}
                                        className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 disabled:opacity-50"
                                    >
                                        <ScanLine className="w-4 h-4" />
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500">Directly adds valid item to order</p>
                            </div>
                        </div>
                    </div>

                    {/* Items List */}
                    <div className="bg-white shadow sm:rounded-lg p-6">
                        <h2 className="text-lg font-medium text-gray-900 mb-4">Order Items</h2>
                        {items.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                No items added. Add products or scan serials above.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {/* Header Row */}
                                <div className="hidden sm:flex gap-4 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    <div className="flex-1">Product</div>
                                    <div className="w-24 text-center">Qty</div>
                                    <div className="w-32 text-right pr-6">Price</div>
                                    <div className="w-8"></div>
                                </div>

                                {items.map((item, idx) => (
                                    <div key={idx} className="flex gap-4 items-center p-3 border rounded-md bg-gray-50 text-sm">
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-900">{item.productName}</p>
                                        </div>
                                        <div className="w-24">
                                            <input
                                                type="number"
                                                min="1"
                                                value={item.quantity}
                                                onChange={(e) => updateItemQuantity(idx, Number(e.target.value))}
                                                className="w-full p-2 border border-gray-300 rounded-md text-center focus:ring-blue-500 focus:border-blue-500"
                                                aria-label="Quantity"
                                            />
                                        </div>
                                        <div className="w-32">
                                            <div className="relative rounded-md shadow-sm">
                                                <input
                                                    type="number"
                                                    value={item.unitPrice}
                                                    onChange={(e) => updateItemPrice(idx, Number(e.target.value))}
                                                    className="w-full p-2 border border-gray-300 rounded-md text-right pr-6 focus:ring-blue-500 focus:border-blue-500"
                                                    aria-label="Price"
                                                />
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeItem(idx)}
                                            className="text-gray-400 hover:text-red-500 transition-colors p-2"
                                            title="Remove item"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                ))}
                                <div className="pt-4 border-t flex justify-end items-center gap-4">
                                    <span className="font-medium text-gray-700">Total Amount:</span>
                                    <Currency amount={totalAmount} className="text-xl font-bold text-gray-900" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar Actions */}
                <div className="space-y-4">
                    <div className="bg-white shadow sm:rounded-lg p-6 sticky top-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Actions</h3>
                        <p className="text-sm text-gray-500 mb-4">
                            Save as draft to reserve inventory later.
                        </p>
                        <div className="flex flex-col gap-3">
                            <button
                                type="submit"
                                disabled={loading || items.length === 0}
                                className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                            >
                                <Save className="w-4 h-4 mr-2" />
                                {loading ? "Creating..." : "Create Draft Order"}
                            </button>
                            <Link
                                href="/dashboard/transactions"
                                className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                            >
                                Cancel
                            </Link>
                        </div>
                    </div>
                </div>
            </form >
        </div >
    )
}
