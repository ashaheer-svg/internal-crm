"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import Link from 'next/link'
import { ArrowLeft, Plus, Search, Trash2, Save, ScanLine, Box, AlertCircle, Loader2, X } from "lucide-react"
import ProductSelector from "@/components/selectors/ProductSelector"
import CustomerSelector from "@/components/selectors/CustomerSelector"
import BulkEntryModal from "@/app/dashboard/transactions/invoices/new/BulkEntryModal"
import FormattedNumberInput from "@/components/FormattedNumberInput"

interface PageProps {
    params: Promise<{ id: string }>
}

export default function EditDeliveryOrderPage({ params }: PageProps) {
    const { id } = use(params)
    const router = useRouter()

    // Header State
    const [orderNumber, setOrderNumber] = useState("")
    const [customer, setCustomer] = useState<any>(null) // Bill To
    const [saleType, setSaleType] = useState<"DIRECT" | "PARTNER">("DIRECT")
    const [endCustomer, setEndCustomer] = useState<any>(null) // Ship To (Partner only)

    const [notes, setNotes] = useState("")
    const [deliveryAddress, setDeliveryAddress] = useState("")
    const [deliveryAddressSource, setDeliveryAddressSource] = useState<"PARTNER" | "END_CUSTOMER">("END_CUSTOMER")
    const [availableAddresses, setAvailableAddresses] = useState<any[]>([])

    const [invoiceValue, setInvoiceValue] = useState<string>("")
    const [invoiceNumber, setInvoiceNumber] = useState<string>("")
    const [additionalCosts, setAdditionalCosts] = useState<string>("")
    const [salesRepId, setSalesRepId] = useState<string>("")
    const [salesReps, setSalesReps] = useState<any[]>([])

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
                setSaleType(data.saleType || "DIRECT")

                // Bill To Customer
                setCustomer({
                    id: data.customerId,
                    name: data.customerName,
                })

                // End Customer
                if (data.endCustomerId) {
                    setEndCustomer({
                        id: data.endCustomerId,
                        name: data.endCustomerName
                    })
                }

                setNotes(data.notes || "")
                setDeliveryAddress(data.deliveryAddress || "")
                setInvoiceValue(data.invoiceValue ? String(data.invoiceValue) : "")
                setInvoiceNumber(data.invoiceNumber || "")
                setAdditionalCosts(data.additionalCosts ? String(data.additionalCosts) : "")
                setSalesRepId(data.salesRepId || "")

                // Fetch Addresses based on context
                // If Partner sale, check where address likely came from?
                // We don't store "address source" in DB, but we can guess or just default?
                // Or we can just fetch both/relevant and see if current address matches one of them?
                // For simplicity, let's load based on saleType logic similar to New Page

                const targetId = (data.saleType === "PARTNER" && data.endCustomerId) ? data.endCustomerId : data.customerId
                if (targetId) {
                    fetch(`/api/customers/${targetId}/addresses`)
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
                    product: i.product, // full product if needed
                    details: i.details?.map((d: any) => ({
                        modelName: d.modelName,
                        serialNumbers: d.serialNumbers
                    })) || []
                }))
                setItems(formattedItems)
            } catch (e: any) {
                setError(e.message)
            } finally {
                setLoading(false)
            }
        }
        loadOrder()
        fetchSalesReps()
    }, [id])

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

    // Helper to fetch addresses
    function fetchAddresses(customerId: string) {
        fetch(`/api/customers/${customerId}/addresses`)
            .then(res => res.json())
            .then(addrs => {
                if (Array.isArray(addrs)) setAvailableAddresses(addrs)
                else setAvailableAddresses([])
            })
            .catch(() => setAvailableAddresses([]))
    }

    // Effect to handle address source switching during edit
    useEffect(() => {
        if (loading) return // Don't run this during initial load to avoid overwriting

        if (saleType === "DIRECT") {
            if (customer?.id) fetchAddresses(customer.id)
            else setAvailableAddresses([])
        } else {
            // Partner Sale
            if (deliveryAddressSource === "PARTNER") {
                if (customer?.id) fetchAddresses(customer.id)
                else setAvailableAddresses([])
            } else {
                // End Customer
                if (endCustomer?.id) fetchAddresses(endCustomer.id)
                else setAvailableAddresses([])
            }
        }
    }, [saleType, deliveryAddressSource, customer, endCustomer, loading])

    // Effect to keep invoiceValue in sync with items total
    const [prevItemsTotal, setPrevItemsTotal] = useState(0)

    useEffect(() => {
        if (loading) return
        const currentTotal = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0)

        if (invoiceValue === "" || Number(invoiceValue) === prevItemsTotal) {
            if (currentTotal > 0 || items.length > 0) {
                setInvoiceValue(currentTotal.toString())
            }
        }
        setPrevItemsTotal(currentTotal)
    }, [items, loading])


    const handleSubmit = async () => {
        if (!customer) {
            setError("Please select a customer (Partner/Direct)")
            return
        }

        if (saleType === "PARTNER" && !endCustomer) {
            setError("Please select an End Customer for Partner Sale")
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

                saleType,
                endCustomerId: saleType === "PARTNER" ? endCustomer?.id : null,
                endCustomerName: saleType === "PARTNER" ? endCustomer?.name : null,

                deliveryAddress,
                invoiceValue: Number(invoiceValue),
                invoiceNumber,
                additionalCosts: Number(additionalCosts),
                salesRepId: salesRepId || null,
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
            <div className="flex items-center justify-between border-b pb-6 mb-6">
                <div className="flex items-center gap-4">
                    <Link href={`/dashboard/transactions/delivery-orders/${id}`} className="p-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Edit Delivery Order</h1>
                        <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">{orderNumber}</p>
                    </div>
                </div>
                <button
                    onClick={handleSubmit}
                    disabled={saving || items.length === 0}
                    className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest text-xs"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {saving ? "Updating..." : "Update Order"}
                </button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                </div>
            )}

            <div className="flex flex-col gap-6">
                {/* Main Content Area */}
                <div className="space-y-6">
                    {/* Customer Section */}
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <h2 className="text-lg font-semibold mb-4">Customer Details</h2>

                        {/* Sale Type */}
                        <div className="flex gap-6 border-b pb-4 mb-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="saleType"
                                    value="DIRECT"
                                    checked={saleType === "DIRECT"}
                                    onChange={() => {
                                        setSaleType("DIRECT")
                                        setDeliveryAddressSource("END_CUSTOMER")
                                    }}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                />
                                <span className="text-sm font-medium text-gray-700">Direct Sale</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="saleType"
                                    value="PARTNER"
                                    checked={saleType === "PARTNER"}
                                    onChange={() => {
                                        setSaleType("PARTNER")
                                        setDeliveryAddressSource("END_CUSTOMER")
                                    }}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                />
                                <span className="text-sm font-medium text-gray-700">Partner Sale</span>
                            </label>
                        </div>

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

                            {/* Bill To */}
                            <div className="relative z-20">
                                <CustomerSelector
                                    label={saleType === "PARTNER" ? "Bill To (Partner)" : "Customer Entity"}
                                    onSelect={setCustomer}
                                    selectedCustomer={customer}
                                    type={saleType === "PARTNER" ? "PARTNER" : undefined}
                                />
                            </div>

                            {/* Ship To (End Customer) for Partner Sales */}
                            {saleType === "PARTNER" && (
                                <div className="col-span-2 relative z-10">
                                    <CustomerSelector
                                        label="Ship To (End Customer)"
                                        onSelect={setEndCustomer}
                                        selectedCustomer={endCustomer}
                                        type="CUSTOMER"
                                    />
                                </div>
                            )}


                            <div className="sm:col-span-1">
                                <label className="block text-sm font-medium text-gray-700">Invoice Value (Excl. Tax)</label>
                                <div className="relative mt-1 rounded-md shadow-sm">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <span className="text-gray-500 sm:text-sm">Rs.</span>
                                    </div>
                                    <FormattedNumberInput
                                        value={Number(invoiceValue) || 0}
                                        onChange={(val) => setInvoiceValue(val.toString())}
                                        className="block w-full rounded-lg border border-gray-200 pl-10 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                            <div className="sm:col-span-1">
                                <label className="block text-sm font-medium text-gray-700">Invoice Number</label>
                                <input
                                    type="text"
                                    value={invoiceNumber}
                                    onChange={(e) => setInvoiceNumber(e.target.value)}
                                    className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    placeholder="e.g. INV-1234"
                                />
                            </div>
                            <div className="sm:col-span-1">
                                <label className="block text-sm font-medium text-gray-700">Sales Representative</label>
                                <select
                                    value={salesRepId}
                                    onChange={(e) => setSalesRepId(e.target.value)}
                                    className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                >
                                    <option value="">Select Sales Rep</option>
                                    {salesReps.map(rep => (
                                        <option key={rep.id} value={rep.id}>{rep.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="sm:col-span-1">
                                <label className="block text-sm font-medium text-gray-700">Dispatch Notes</label>
                                <textarea
                                    className="w-full text-sm border rounded-md p-2 h-10 resize-none mt-1"
                                    placeholder="Order notes..."
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                />
                            </div>

                            {/* Delivery Address Selection */}
                            <div className="col-span-2 border-t pt-4">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Delivery Address
                                    </label>

                                    {saleType === "PARTNER" && (
                                        <div className="flex items-center space-x-2 bg-gray-100 p-1 rounded-lg">
                                            <button
                                                type="button"
                                                onClick={() => setDeliveryAddressSource("PARTNER")}
                                                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${deliveryAddressSource === "PARTNER"
                                                    ? "bg-white shadow text-gray-900"
                                                    : "text-gray-500 hover:text-gray-900"
                                                    }`}
                                            >
                                                Partner Address
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setDeliveryAddressSource("END_CUSTOMER")}
                                                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${deliveryAddressSource === "END_CUSTOMER"
                                                    ? "bg-white shadow text-gray-900"
                                                    : "text-gray-500 hover:text-gray-900"
                                                    }`}
                                            >
                                                End Customer Address
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {((saleType === "DIRECT" && customer) ||
                                    (saleType === "PARTNER" && ((deliveryAddressSource === "PARTNER" && customer) || (deliveryAddressSource === "END_CUSTOMER" && endCustomer)))) ? (
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
                                                            className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
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
                                                    className="mt-2 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                                />
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500 italic">
                                        Select a {saleType === "PARTNER" ? (deliveryAddressSource === "PARTNER" ? "Partner" : "End Customer") : "Customer"} to view delivery addresses.
                                    </p>
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
                                            {item.details && item.details.length > 0 && (
                                                <div className="mt-1 flex flex-wrap gap-2">
                                                    {item.details.map((d: any, di: number) => (
                                                        <div key={di} className="text-[10px] text-gray-500 bg-gray-50 px-2 py-0.5 rounded border border-gray-100 italic">
                                                            {d.modelName}: {d.serialNumbers}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div className="w-24">
                                            <input
                                                type="number"
                                                min="1"
                                                value={item.quantity}
                                                onChange={(e) => handleUpdateQuantity(idx, parseInt(e.target.value))}
                                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-center shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                                aria-label="Quantity"
                                            />
                                        </div>

                                        <div className="w-32">
                                            <div className="relative rounded-md shadow-sm">
                                                <FormattedNumberInput
                                                    value={item.unitPrice}
                                                    onChange={(val) => {
                                                        const newItems = [...items]
                                                        newItems[idx].unitPrice = val
                                                        setItems(newItems)
                                                    }}
                                                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-right shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none pr-6"
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
            </div>

            {/* Modals */}
            {showProductSelector && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50/50">
                            <h3 className="font-semibold text-gray-900">Select Product</h3>
                            <button 
                                onClick={() => setShowProductSelector(false)}
                                className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <div className="flex-1 p-6 min-h-[500px] overflow-visible">
                            <ProductSelector
                                onProductSelect={(p) => {
                                    handleAddItem(p)
                                    setShowProductSelector(false)
                                }}
                                excludeProductIds={[]}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
