"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import Link from 'next/link'
import { ArrowLeft, Plus, Search, Trash2, Save, ScanLine, Box, AlertCircle, Loader2 } from "lucide-react"
import ProductSelector from "@/app/dashboard/transactions/invoices/new/ProductSelector"
import CustomerSelector from "@/app/dashboard/transactions/invoices/new/CustomerSelector"
import BulkEntryModal from "@/app/dashboard/transactions/invoices/new/BulkEntryModal"

interface PageProps {
    params: Promise<{ id: string }>
}

export default function EditDeliveryOrderPage({ params }: PageProps) {
    const { id } = use(params)
    const router = useRouter()

    // Header State
    const [orderNumber, setOrderNumber] = useState("")
    const [customer, setCustomer] = useState<any>(null)
    const [notes, setNotes] = useState("")
    const [deliveryAddress, setDeliveryAddress] = useState("")
    const [availableAddresses, setAvailableAddresses] = useState<any[]>([])
    const [invoiceValue, setInvoiceValue] = useState<string>("")
    const [additionalCosts, setAdditionalCosts] = useState<string>("")

    // Items State
    const [items, setItems] = useState<any[]>([])

    // UI State
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [showProductSelector, setShowProductSelector] = useState(false)
    const [showBulkModal, setShowBulkModal] = useState(false)
    const [error, setError] = useState("")

    // Load Data
    useEffect(() => {
        async function loadOrder() {
            try {
                const res = await fetch(`/api/delivery-orders/${id}`)
                if (!res.ok) throw new Error("Failed to load order")
                const data = await res.json()

                if (!data.isActive) {
                    router.push(`/dashboard/transactions/delivery-orders/${id}`)
                    return
                }

                if (data.status !== 'DRAFT') {
                    setError(`Warning: You are editing a ${data.status} order. Changes will affect inventory immediately.`)
                }

                setOrderNumber(data.orderNumber)
                setCustomer({
                    id: data.customerId,
                    name: data.customerName,
                    // other fields not stored on DO but that's okay
                })
                setNotes(data.notes || "")
                setDeliveryAddress(data.deliveryAddress || "")
                setInvoiceValue(data.invoiceValue ? String(data.invoiceValue) : "")
                setAdditionalCosts(data.additionalCosts ? String(data.additionalCosts) : "")

                if (data.customerId) {
                    fetch(`/api/customers/${data.customerId}/addresses`)
                        .then(res => res.json())
                        .then(addrs => {
                            if (Array.isArray(addrs)) setAvailableAddresses(addrs)
                        })
                        .catch(err => console.error("Failed to load addresses", err))
                }

                // transform items
                const formattedItems = data.items.map((i: any) => ({
                    id: i.id, // Keep ID to update existing
                    productId: i.productId,
                    productName: `${i.product.brand} ${i.product.name} ${i.product.model}`,
                    quantity: i.quantity,
                    unitPrice: i.unitPrice,
                    isBackorder: i.isBackorder,
                    product: i.product // full product if needed
                }))
                setItems(formattedItems)
            } catch (e: any) {
                setError(e.message)
            } finally {
                setLoading(false)
            }
        }
        loadOrder()
    }, [id])

    // --- Same Handlers as New Page ---

    const handleAddItem = (product: any) => {
        // Check if item exists
        const existing = items.find(i => i.productId === product.id)
        if (existing) {
            // Increment
            setItems(items.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i))
        } else {
            // Add new
            setItems([...items, {
                productId: product.id,
                productName: `${product.brand} ${product.name} ${product.model}`,
                quantity: 1,
                unitPrice: product.price,
                isBackorder: product.stockCount <= 0, // Auto-flag if out of stock
                product: product
            }])
        }
    }

    const handleUpdateQuantity = (index: number, newQty: number) => {
        if (newQty < 1) return
        const newItems = [...items]
        newItems[index].quantity = newQty

        // Re-check backorder status if needed? 
        // Logic: if Qty > stock, it might be partial backorder. 
        // But for simplicity, we just toggle isBackorder manually or based on initial stock.
        // Let's leave isBackorder as is or manual toggle.

        setItems(newItems)
    }

    const handleRemoveItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index))
    }

    const handleBulkAdd = async (lines: string[]) => {
        // Same logic as New Page...
        // Fetch products by Serial?
        // Reuse logic from New Page if possible? 
        // Since we are code duplicating, let's copy the logic.

        try {
            // Need API to find product by serial
            // We can reuse the inventory lookup API
            const res = await fetch('/api/inventory/lookup-bulk', {
                method: 'POST',
                body: JSON.stringify({ serials: lines })
            })
            const data = await res.json()

            // Add found items...
            // This part is complex to duplicate. User didn't explicitly ask for serial scanning on Edit, 
            // but it's good to have.
            // For now, let's skip Bulk Add on Edit to keep it simple, OR implement if easy.
            // Let's skipping Bulk Add to reduce complexity for this step, 
            // relying on Manual Product Add.
        } catch (e) {
            console.error(e)
        }
    }

    const handleSubmit = async () => {
        if (!customer) {
            setError("Please select a customer")
            return
        }
        if (items.length === 0) {
            setError("Please add at least one item")
            return
        }

        setSaving(true)
        setError("")

        try {
            const payload = {
                orderNumber,
                customerId: customer.id,
                customerName: customer.name,
                deliveryAddress,
                invoiceValue: Number(invoiceValue),
                additionalCosts: Number(additionalCosts),
                notes,
                items: items.map(i => ({
                    id: i.id, // Send ID if it exists
                    productId: i.productId,
                    productName: i.productName,
                    quantity: i.quantity,
                    unitPrice: i.unitPrice,
                    isBackorder: i.isBackorder
                }))
            }

            const res = await fetch(`/api/delivery-orders/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || "Failed to update order")
            }

            router.push(`/dashboard/transactions/delivery-orders/${id}`)
        } catch (e: any) {
            setError(e.message)
            setSaving(false)
        }
    }

    if (loading) return <div className="p-8 text-center text-gray-500"><Loader2 className="w-8 h-8 animate-spin mx-auto" /> Loading...</div>

    return (
        <div className="max-w-[1600px] mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href={`/dashboard/transactions/delivery-orders/${id}`} className="p-2 hover:bg-gray-200 rounded-full">
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </Link>
                <h1 className="text-2xl font-bold text-gray-900">Edit Delivery Order</h1>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Form */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Customer Section */}
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <h2 className="text-lg font-semibold mb-4">Customer Details</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Order #</label>
                                <input
                                    type="text"
                                    value={orderNumber}
                                    onChange={e => setOrderNumber(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-md"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                                {customer ? (
                                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                                        <span className="font-medium">{customer.name}</span>
                                        <button onClick={() => setCustomer(null)} className="text-red-500 text-xs hover:underline">Change</button>
                                    </div>
                                ) : (
                                    <CustomerSelector onSelect={setCustomer} selectedCustomer={null} />
                                )}
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

                            {/* Delivery Address Selection */}
                            <div className="col-span-2 border-t pt-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Address</label>
                                {customer ? (
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
                                                        </div>
                                                    </label>
                                                ))}
                                                <label className="flex items-center space-x-2 mt-2">
                                                    <input
                                                        type="radio"
                                                        name="deliveryAddress"
                                                        checked={deliveryAddress === '' || (deliveryAddress !== '' && !availableAddresses.some(a => a.address === deliveryAddress))}
                                                        onChange={() => {
                                                            // If currently selected is custom, keep it, otherwise clear? 
                                                            // Logic: If clicking "Custom", we start blank or keep whatever custom text was there?
                                                            // Actually, if we switch from Preset to Custom, we might want to keep the text or clear it. 
                                                            // Let's assume clear if it was a Preset.
                                                            if (availableAddresses.some(a => a.address === deliveryAddress)) {
                                                                setDeliveryAddress("")
                                                            }
                                                        }}
                                                        className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                                    />
                                                    <span className="text-sm text-gray-700">Custom / None</span>
                                                </label>
                                                {((deliveryAddress === '') || (!availableAddresses.some(a => a.address === deliveryAddress))) && (
                                                    <div className="mt-2">
                                                        <textarea
                                                            value={deliveryAddress}
                                                            onChange={(e) => setDeliveryAddress(e.target.value)}
                                                            rows={2}
                                                            placeholder="Enter custom delivery address..."
                                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="text-sm text-gray-500 italic">
                                                No saved addresses found.
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

                    {/* Items Section */}
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold">Order Items</h2>
                            <div className="flex gap-2">
                                {/* <button 
                                    onClick={() => setShowBulkModal(true)}
                                    className="px-3 py-1.5 text-sm bg-purple-50 text-purple-700 border border-purple-200 rounded-md hover:bg-purple-100 flex items-center gap-1"
                                >
                                    <ScanLine className="w-3 h-3" />
                                    Scan / Bulk
                                </button> */}
                                <button
                                    onClick={() => setShowProductSelector(true)}
                                    className="px-3 py-1.5 text-sm bg-blue-50 text-blue-700 border border-blue-200 rounded-md hover:bg-blue-100 flex items-center gap-1"
                                >
                                    <Plus className="w-3 h-3" />
                                    Add Product
                                </button>
                            </div>
                        </div>

                        {items.length === 0 ? (
                            <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                                <Box className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                <p>No items added yet</p>
                                <p className="text-xs">Add products or scan serials to build the order</p>
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
                                    <div key={idx} className="flex items-center gap-4 p-3 bg-white border rounded-md shadow-sm text-sm">
                                        <div className="flex-1">
                                            <div className="font-medium text-gray-900">{item.productName}</div>
                                        </div>

                                        <div className="w-24">
                                            <input
                                                type="number"
                                                min="1"
                                                value={item.quantity}
                                                onChange={(e) => handleUpdateQuantity(idx, parseInt(e.target.value))}
                                                className="w-full p-2 border border-gray-300 rounded-md text-center focus:ring-blue-500 focus:border-blue-500"
                                                aria-label="Quantity"
                                            />
                                        </div>

                                        <div className="w-32">
                                            <div className="relative rounded-md shadow-sm">
                                                <input
                                                    type="number"
                                                    value={item.unitPrice}
                                                    onChange={(e) => {
                                                        const newItems = [...items]
                                                        newItems[idx].unitPrice = Number(e.target.value)
                                                        setItems(newItems)
                                                    }}
                                                    className="w-full p-2 border border-gray-300 rounded-md text-right pr-6 focus:ring-blue-500 focus:border-blue-500"
                                                    aria-label="Price"
                                                />
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleRemoveItem(idx)}
                                            className="text-gray-400 hover:text-red-500 transition-colors p-2"
                                            title="Remove item"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Summary */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 sticky top-6">
                        <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
                        <div className="space-y-3 mb-6">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Subtotal</span>
                                <span className="font-medium">
                                    Rs. {items.reduce((s, i) => s + (i.quantity * i.unitPrice), 0).toLocaleString()}
                                </span>
                            </div>
                            <div className="pt-3 border-t">
                                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                                <textarea
                                    className="w-full text-sm border rounded-md p-2 h-24 resize-none"
                                    placeholder="Add delivery instructions or notes..."
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={saving || items.length === 0}
                            className="w-full py-2.5 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Update Order
                        </button>
                        <div className="mt-4 text-xs text-gray-500 text-center">
                            Note: Removing items will release any allocated inventory.
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            {showProductSelector && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-4 border-b flex justify-between items-center">
                            <h3 className="font-semibold">Select Product</h3>
                            <button onClick={() => setShowProductSelector(false)}><ArrowLeft className="w-5 h-5" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4">
                            <ProductSelector onProductSelect={(p) => {
                                handleAddItem(p)
                                setShowProductSelector(false)
                            }} excludeProductIds={[]} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
