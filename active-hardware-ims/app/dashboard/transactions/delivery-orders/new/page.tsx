"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Currency } from "@/components/Currency"
import ProductSelector from "@/components/selectors/ProductSelector"
import CustomerSelector from "@/components/selectors/CustomerSelector"
import SalesRepSelector from "@/components/selectors/SalesRepSelector"
import BulkSerialEntryModal from "@/components/BulkSerialEntryModal"
import FormattedNumberInput from "@/components/FormattedNumberInput"
import { ArrowLeft, Trash2, Save, Package, ScanLine, Search, Truck, DollarSign, FileText, User, Users, CheckCircle2, AlertCircle } from "lucide-react"

type DeliveryOrderItem = {
    productId: string
    productName: string
    quantity: number
    unitPrice: number
    isBackorder: boolean // For display only in draft
    details?: { modelName: string; serialNumbers: string }[]
}

export default function NewDeliveryOrderPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    // Backorder linking
    const [backorderId, setBackorderId] = useState<string | null>(null)

    const [orderNumber, setOrderNumber] = useState("")

    useEffect(() => {
        fetchNextOrderNumber()
    }, [])

    async function fetchNextOrderNumber() {
        try {
            const res = await fetch("/api/sequences", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "DO" })
            })
            if (res.ok) {
                const data = await res.json()
                setOrderNumber(data.number)
            }
        } catch (error) {
            console.error("Failed to fetch DO sequence", error)
        }
    }

    // Sale Type State
    const [saleType, setSaleType] = useState<"DIRECT" | "PARTNER">("DIRECT")

    // Bill To (Partner or Direct Customer)
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
    const [customerId, setCustomerId] = useState<string | null>(null)
    const [customerName, setCustomerName] = useState("")

    // Ship To (End Customer - for Partner sales)
    const [selectedEndCustomer, setSelectedEndCustomer] = useState<any>(null)
    const [endCustomerId, setEndCustomerId] = useState<string | null>(null)
    const [endCustomerName, setEndCustomerName] = useState("")

    const [notes, setNotes] = useState("")
    const [invoiceValue, setInvoiceValue] = useState<number>(0)
    const [invoiceNumber, setInvoiceNumber] = useState<string>("")
    const [poNumber, setPoNumber] = useState<string>("")
    const [additionalCosts, setAdditionalCosts] = useState<number>(0)
    const [salesRepId, setSalesRepId] = useState<string>("")
    
    // Additional Build Sheet Fields
    const [buildInstructions, setBuildInstructions] = useState("")
    const [deliveryInstructions, setDeliveryInstructions] = useState("")
    const [additionalContact, setAdditionalContact] = useState("")
    const [deliveryCharges, setDeliveryCharges] = useState<number>(0)
    const [salesReps, setSalesReps] = useState<any[]>([])

    // Address Selection
    const [availableAddresses, setAvailableAddresses] = useState<any[]>([])
    const [deliveryAddress, setDeliveryAddress] = useState("")
    const [deliveryAddressSource, setDeliveryAddressSource] = useState<"PARTNER" | "END_CUSTOMER">("END_CUSTOMER")

    // Items
    const [items, setItems] = useState<DeliveryOrderItem[]>([])

    // Serial Entry State
    const [serialInput, setSerialInput] = useState("")
    const [findingSerial, setFindingSerial] = useState(false)

    // Bulk Entry State
    const [isBulkEntryOpen, setIsBulkEntryOpen] = useState(false)

    // Clear state when switching sale types? Maybe not strictly necessary but cleaner
    function handleSaleTypeChange(type: "DIRECT" | "PARTNER") {
        setSaleType(type)
        // Reset address source to default
        setDeliveryAddressSource("END_CUSTOMER")

        // Optional: clear selections to avoid confusion
        setSelectedCustomer(null)
        setCustomerId(null)
        setCustomerName("")
        setSelectedEndCustomer(null)
        setEndCustomerId(null)
        setEndCustomerName("")
        setAvailableAddresses([])
        setDeliveryAddress("")
    }

    useEffect(() => {
        fetchSalesReps()

        const boId = searchParams.get('backorderId')
        const custId = searchParams.get('customerId')
        const custName = searchParams.get('customerName')
        const prodId = searchParams.get('productId')
        const qty = searchParams.get('qty')
        const quoteId = searchParams.get('quoteId')

        if (quoteId) {
            // Load Quote Data for DO conversion
            fetch(`/api/crm/quotes/${quoteId}`)
                .then(res => res.json())
                .then(quote => {
                    if (quote.project?.customer) {
                        handleCustomerSelect(quote.project.customer)
                    }
                    if (quote.saleType) {
                        setSaleType(quote.saleType as "DIRECT" | "PARTNER")
                    }
                    if (quote.billToId && quote.saleType === "PARTNER") {
                        fetch(`/api/customers/${quote.billToId}`)
                            .then(r => r.json())
                            .then(customer => handleCustomerSelect(customer))
                            .catch(e => console.error(e))

                        // the main customer in quote is the project customer, which for partner deal is the end customer
                        if (quote.project?.customer) {
                            handleEndCustomerSelect(quote.project.customer)
                        }
                    }

                    setInvoiceValue(quote.subTotal)
                    
                    if (quote.poNumber) setPoNumber(quote.poNumber)
                    if (quote.deliveryOrder?.buildInstructions) setBuildInstructions(quote.deliveryOrder.buildInstructions)
                    if (quote.deliveryOrder?.deliveryInstructions) setDeliveryInstructions(quote.deliveryOrder.deliveryInstructions)
                    if (quote.deliveryOrder?.additionalContact) setAdditionalContact(quote.deliveryOrder.additionalContact)
                    if (quote.deliveryOrder?.deliveryCharges) setDeliveryCharges(quote.deliveryOrder.deliveryCharges)

                    let newNotes = `Converted from Quote #${quote.quoteNumber}`
                    if (quote.poNumber) newNotes += `\nPO: ${quote.poNumber}`
                    if (quote.urgency) newNotes += `\nUrgency: ${quote.urgency}`
                    setNotes(newNotes)

                    if (quote.items && Array.isArray(quote.items)) {
                        const quoteItems: DeliveryOrderItem[] = quote.items.map((qi: any) => ({
                            productId: qi.productId || '',
                            productName: qi.product ? `${qi.product.brand || ''} ${qi.product.name}`.trim() : qi.description,
                            quantity: qi.quantity,
                            unitPrice: qi.unitPrice,
                            isBackorder: false,
                            details: qi.details?.map((d: any) => ({
                                modelName: d.modelName,
                                serialNumbers: d.serialNumbers
                            })) || []
                        }))
                        setItems(quoteItems)
                    }
                })
                .catch(err => console.error("Failed to load quote details", err))
        } else if (boId && custId && prodId && qty) {
            setBackorderId(boId)
            // Pre-load customer if ID available
            // We need to fetch customer details to populate selectedCustomer object properly for the selector
            fetch(`/api/customers/${custId}`)
                .then(res => res.json())
                .then(customer => {
                    handleCustomerSelect(customer)
                })
                .catch(err => console.error("Failed to load customer", err))

            // Pre-load product
            fetch(`/api/products/${prodId}`)
                .then(res => res.json())
                .then(product => {
                    const newItem: DeliveryOrderItem = {
                        productId: product.id,
                        productName: `${product.brand} ${product.name}`,
                        quantity: Number(qty),
                        unitPrice: product.resellerPrice || 0,
                        isBackorder: true
                    }
                    setItems([newItem])
                })
                .catch(err => console.error("Failed to load product", err))

            setNotes(`Allocation for Backorder`)

            // Initialize invoice value for backorder if not already set
            if (invoiceValue === 0) {
                fetch(`/api/products/${prodId}`)
                    .then(res => res.json())
                    .then(product => {
                        const price = product.resellerPrice || 0
                        setInvoiceValue(price * Number(qty))
                    })
            }
        }
    }, [searchParams])

    async function fetchSalesReps() {
        // We now use SalesRepSelector
    }

    // Effect to update addresses when source changes or relevant customer changes
    useEffect(() => {
        if (saleType === "DIRECT") {
            if (customerId) fetchAddresses(customerId)
            else setAvailableAddresses([])
        } else {
            // Partner Sale
            if (deliveryAddressSource === "PARTNER") {
                if (customerId) fetchAddresses(customerId)
                else setAvailableAddresses([])
            } else {
                // End Customer
                if (endCustomerId) fetchAddresses(endCustomerId)
                else setAvailableAddresses([])
            }
        }
    }, [saleType, deliveryAddressSource, customerId, endCustomerId])

    // Effect to keep invoiceValue in sync with items total
    // We only auto-sync if invoiceValue is empty or if it was previously equal to the old total
    // to avoid overwriting manual changes.
    const [prevItemsTotal, setPrevItemsTotal] = useState(0)

    useEffect(() => {
        const currentTotal = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0)

        if (invoiceValue === 0 || invoiceValue === prevItemsTotal) {
            if (currentTotal > 0) {
                setInvoiceValue(currentTotal)
            }
        }
        setPrevItemsTotal(currentTotal)
    }, [items])

    // Handle "Bill To" Customer Selection
    function handleCustomerSelect(customer: any) {
        if (customer) {
            setSelectedCustomer(customer)
            setCustomerId(customer.id)
            setCustomerName(customer.name)

            // If Direct Sale, this is also the Ship To customer, so fetch addresses
            if (saleType === "DIRECT") {
                fetchAddresses(customer.id)
            }

            // Auto-populate Sales Rep
            if (customer.salesRepId) {
                setSalesRepId(customer.salesRepId)
            }
        } else {
            setSelectedCustomer(null)
            setCustomerId(null)
            setCustomerName("")
            if (saleType === "DIRECT") {
                setAvailableAddresses([])
                setDeliveryAddress("")
            }
        }
    }

    // Handle "Ship To" Customer Selection (Partner Sales only)
    function handleEndCustomerSelect(customer: any) {
        if (customer) {
            setSelectedEndCustomer(customer)
            setEndCustomerId(customer.id)
            setEndCustomerName(customer.name)

            // For Partner sales, addresses come from the End Customer
            fetchAddresses(customer.id)
        } else {
            setSelectedEndCustomer(null)
            setEndCustomerId(null)
            setEndCustomerName("")
            setAvailableAddresses([])
            setDeliveryAddress("")
        }
    }

    function fetchAddresses(id: string) {
        fetch(`/api/customers/${id}/addresses`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setAvailableAddresses(data)
                    // Auto-select default
                    const defaultAddr = data.find((a: any) => a.isDefault)
                    if (defaultAddr) {
                        setDeliveryAddress(defaultAddr.address)
                    } else if (data.length > 0) {
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
    }

    function handleProductSelect(product: any) {
        // Check if already exists
        const existingInfo = items.find(i => i.productId === product.id)
        if (existingInfo) {
            // Logic for duplicate handling if needed
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
            const res = await fetch(`/api/inventory/cost-adjustment?serials=${encodeURIComponent(serialInput)}`)
            if (!res.ok) throw new Error("Search failed")
            const data = await res.json()

            if (data.length === 0) {
                setError("Serial number not found in inventory")
            } else {
                const item = data[0]
                const newItem: DeliveryOrderItem = {
                    productId: item.productId,
                    productName: `${item.product.brand} ${item.product.name} (S/N: ${item.serialNumber})`,
                    quantity: 1,
                    unitPrice: item.product.resellerPrice || 0,
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

    function handleBulkAdd(newItems: any[]) {
        const itemsToAdd: DeliveryOrderItem[] = newItems.map(item => ({
            productId: item.product.id,
            productName: `${item.product.brand} ${item.product.name} (S/N: ${item.serialNumber})`,
            quantity: 1,
            unitPrice: item.product.resellerPrice || 0,
            isBackorder: false,
        }))
        setItems(prev => [...prev, ...itemsToAdd])
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

        if (!orderNumber) {
            setError("Order Number is required")
            setLoading(false)
            return
        }

        if (!customerId) {
            setError(saleType === "PARTNER" ? "Partner selection is required" : "Customer selection is required")
            setLoading(false)
            return
        }

        if (saleType === "PARTNER" && !endCustomerId) {
            setError("End Customer selection is required for Partner Sales")
            setLoading(false)
            return
        }

        if (items.length === 0) {
            setError("Add at least one item")
            setLoading(false)
            return
        }

        try {
            const payload = {
                orderNumber,
                customerId,
                customerName,
                // Add End Customer info
                endCustomerId: saleType === "PARTNER" ? endCustomerId : null,
                endCustomerName: saleType === "PARTNER" ? endCustomerName : null,
                saleType,
                deliveryAddress,
                invoiceValue: Number(invoiceValue),
                invoiceNumber,
                additionalCosts: Number(additionalCosts),
                salesRepId: salesRepId || null,
                notes,
                poNumber,
                buildInstructions,
                deliveryInstructions,
                additionalContact,
                deliveryCharges,
                backorderId, // Include backorder ID
                quoteReference: searchParams.get('quoteId'), // Include origin quote reference
                items
            }

            const res = await fetch("/api/delivery-orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
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
        <div className="min-h-screen bg-[#f8fafc] pb-12">
            {/* Premium Header */}
            <div className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-30 px-8 py-5">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard/transactions?tab=do" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Issue Delivery Order</h1>
                            <p className="text-sm text-gray-500 font-medium tracking-tight uppercase">Logistics & Fulfillment Pipeline</p>
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
                            disabled={loading || items.length === 0}
                            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/20 text-sm font-bold hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {loading ? (
                                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            {loading ? `Dispatching...` : `Create Draft Order`}
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto mt-8 px-4 relative z-0">
                <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        {error && (
                            <div className="bg-red-50 border-l-4 border-red-400 p-4">
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        )}

                        {/* Order Details */}
                        <div className="bg-white shadow sm:rounded-xl p-6 space-y-4 relative z-10">
                            <h2 className="text-lg font-medium text-gray-900">Order Details</h2>

                            <div className="flex p-1 bg-gray-100/50 rounded-xl w-fit mb-6">
                                <button
                                    type="button"
                                    onClick={() => handleSaleTypeChange("DIRECT")}
                                    className={cn(
                                        "px-6 py-2 rounded-lg text-sm font-bold transition-all",
                                        saleType === "DIRECT"
                                            ? "bg-white text-blue-600 shadow-sm ring-1 ring-black/5"
                                            : "text-gray-500 hover:text-gray-700"
                                    )}
                                >
                                    Direct Sales
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleSaleTypeChange("PARTNER")}
                                    className={cn(
                                        "px-6 py-2 rounded-lg text-sm font-bold transition-all",
                                        saleType === "PARTNER"
                                            ? "bg-white text-blue-600 shadow-sm ring-1 ring-black/5"
                                            : "text-gray-500 hover:text-gray-700"
                                    )}
                                >
                                    Partner Channel
                                </button>
                            </div>

                            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                <div className="sm:col-span-1">
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Order Number</label>
                                    <input
                                        type="text"
                                        required
                                        value={orderNumber}
                                        onChange={(e) => setOrderNumber(e.target.value)}
                                        className="w-full rounded-xl border-gray-200 px-4 py-3 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none border shadow-sm font-mono font-bold"
                                    />
                                </div>

                                <div className="sm:col-span-2 relative z-20">
                                    <CustomerSelector
                                        label={saleType === "PARTNER" ? "Partner Entity (Bill To)" : "Customer Entity"}
                                        required
                                        onSelect={handleCustomerSelect}
                                        selectedCustomer={selectedCustomer}
                                        type={saleType === "PARTNER" ? "PARTNER" : "CUSTOMER"}
                                        placeholder={saleType === "PARTNER" ? "Search for selling partner..." : "Search for end customer..."}
                                    />
                                </div>

                                {saleType === "PARTNER" && (
                                    <div className="sm:col-span-2 relative z-10">
                                        <CustomerSelector
                                            label="End Customer (Ship To)"
                                            required
                                            onSelect={handleEndCustomerSelect}
                                            selectedCustomer={selectedEndCustomer}
                                            type="CUSTOMER"
                                            placeholder="Identification of the delivery destination..."
                                        />
                                    </div>
                                )}

                                <div className="sm:col-span-1">
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Revenue Value (Excl. Tax)</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <span className="text-gray-400 text-xs font-bold">Rs.</span>
                                        </div>
                                        <FormattedNumberInput
                                            value={invoiceValue}
                                            onChange={setInvoiceValue}
                                            className="w-full rounded-xl border-gray-200 pl-11 pr-4 py-3 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none border font-bold"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                                <div className="sm:col-span-1">
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Associated Invoice #</label>
                                    <input
                                        type="text"
                                        value={invoiceNumber}
                                        onChange={(e) => setInvoiceNumber(e.target.value)}
                                        className="w-full rounded-xl border-gray-200 px-4 py-3 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none border shadow-sm font-medium"
                                        placeholder="e.g. INV-2024-001"
                                    />
                                </div>
                                <div className="sm:col-span-1">
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">PO Number</label>
                                    <input
                                        type="text"
                                        value={poNumber}
                                        onChange={(e) => setPoNumber(e.target.value)}
                                        className="w-full rounded-xl border-gray-200 px-4 py-3 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none border shadow-sm font-medium"
                                        placeholder="e.g. PO-2024-001"
                                    />
                                </div>
                                <div className="sm:col-span-1">
                                    <SalesRepSelector
                                        label="Assigned Representative"
                                        onSelect={(rep) => setSalesRepId(rep?.id ?? "")}
                                        selectedId={salesRepId || null}
                                    />
                                </div>
                                <div className="sm:col-span-1">
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Dispatch Notes</label>
                                    <textarea
                                        rows={1}
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        className="w-full rounded-xl border-gray-200 px-4 py-3 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none border bg-gray-50/30"
                                        placeholder="Special handling instructions..."
                                    />
                                </div>

                                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <div className="sm:col-span-1">
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Build Instructions</label>
                                        <textarea
                                            rows={2}
                                            value={buildInstructions}
                                            onChange={(e) => setBuildInstructions(e.target.value)}
                                            className="w-full rounded-lg border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none border"
                                            placeholder="Assembly requirements..."
                                        />
                                    </div>
                                    <div className="sm:col-span-1">
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Delivery Instructions</label>
                                        <textarea
                                            rows={2}
                                            value={deliveryInstructions}
                                            onChange={(e) => setDeliveryInstructions(e.target.value)}
                                            className="w-full rounded-lg border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none border"
                                            placeholder="Drop-off details..."
                                        />
                                    </div>
                                    <div className="sm:col-span-1">
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Additional Contact</label>
                                        <input
                                            type="text"
                                            value={additionalContact}
                                            onChange={(e) => setAdditionalContact(e.target.value)}
                                            className="w-full rounded-lg border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none border"
                                            placeholder="Name / Phone"
                                        />
                                    </div>
                                    <div className="sm:col-span-1">
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Delivery Charges</label>
                                        <FormattedNumberInput
                                            value={deliveryCharges}
                                            onChange={setDeliveryCharges}
                                            className="w-full rounded-lg border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none border"
                                            placeholder="0"
                                        />
                                    </div>
                                </div>

                                {/* Delivery Address Selection */}
                                <div className="sm:col-span-2 border-t pt-4">
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

                                    {((saleType === "DIRECT" && customerId) ||
                                        (saleType === "PARTNER" && ((deliveryAddressSource === "PARTNER" && customerId) || (deliveryAddressSource === "END_CUSTOMER" && endCustomerId)))) ? (
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
                                                            checked={deliveryAddress === ''}
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
                                            className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleSerialAdd}
                                            disabled={findingSerial || !serialInput}
                                            className="p-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-50"
                                        >
                                            <ScanLine className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="mt-2">
                                        <button
                                            type="button"
                                            onClick={() => setIsBulkEntryOpen(true)}
                                            className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center"
                                        >
                                            + Bulk Add via Serial List
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">Directly adds valid item to order</p>
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
                                                {item.details && item.details.length > 0 && (
                                                    <div className="mt-1 space-y-1">
                                                        {item.details.map((d, di) => (
                                                            <div key={di} className="text-[11px] text-gray-500 bg-white/50 px-2 py-0.5 rounded border border-gray-100 inline-block mr-2 mt-1">
                                                                <span className="font-semibold">{d.modelName}</span>: {d.serialNumbers}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="w-24">
                                                <FormattedNumberInput
                                                    value={item.quantity}
                                                    onChange={(val) => updateItemQuantity(idx, val)}
                                                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-center shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                                    aria-label="Quantity"
                                                />
                                            </div>
                                            <div className="w-32">
                                                <div className="relative rounded-md shadow-sm">
                                                    <FormattedNumberInput
                                                        value={item.unitPrice}
                                                        onChange={(val) => updateItemPrice(idx, val)}
                                                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-right shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none pr-6"
                                                        aria-label="Price"
                                                    />
                                                    <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                                                        <span className="text-gray-400 text-[10px]">Rs.</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeItem(idx)}
                                                className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                                title="Remove item"
                                            >
                                                <Trash2 className="w-4 h-4" />
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
                                    className="inline-flex justify-center items-center gap-1.5 w-full px-3 py-2 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Save className="w-4 h-4" />
                                    {loading ? "Creating..." : "Create Draft Order"}
                                </button>
                                <Link
                                    href="/dashboard/transactions"
                                    className="inline-flex justify-center items-center gap-1.5 w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                                >
                                    Cancel
                                </Link>
                            </div>
                        </div>
                    </div>
                </form>

                <BulkSerialEntryModal
                    isOpen={isBulkEntryOpen}
                    onClose={() => setIsBulkEntryOpen(false)}
                    onAdd={handleBulkAdd}
                    title="Bulk Add Items to Order"
                />
            </div>
        </div>
    )
}
