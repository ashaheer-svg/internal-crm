"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Save, Calendar as CalendarIcon, Search, Plus, X } from "lucide-react"
import Link from "next/link"

import CustomerSelector from "@/components/selectors/CustomerSelector"
import ProductSelector from "@/components/selectors/ProductSelector"
import SalesRepSelector from "@/components/selectors/SalesRepSelector"

type Customer = {
    id: string
    name: string
    email?: string
}

type ServiceProduct = {
    id: string
    name: string
    sku: string
    serviceDefinition?: {
        durationValue: number
        durationUnit: string
    }
}

type SalesRep = {
    id: string
    name: string
}

export default function NewServiceAgreementPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    // Data Sources
    const [salesReps, setSalesReps] = useState<SalesRep[]>([])

    // Selection States (Objects)
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
    const [selectedPartner, setSelectedPartner] = useState<Customer | null>(null)
    const [selectedProduct, setSelectedProduct] = useState<ServiceProduct | null>(null)

    // Form State
    const [salesRepId, setSalesRepId] = useState("")
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
    const [contractNumber, setContractNumber] = useState("")
    const [contractValue, setContractValue] = useState(0)
    const [invoiceReference, setInvoiceReference] = useState("")
    const [description, setDescription] = useState("")
    const [productModel, setProductModel] = useState("")
    const [coveredSerials, setCoveredSerials] = useState("")

    // Duration Logic
    const [durationValue, setDurationValue] = useState(1)
    const [durationUnit, setDurationUnit] = useState("YEAR")

    // Multi-Item Coverage
    const [items, setItems] = useState<{ modelName: string; serialNumbers: string }[]>([
        { modelName: "", serialNumbers: "" }
    ])

    const addItem = () => setItems([...items, { modelName: "", serialNumbers: "" }])
    const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index))
    const updateItem = (index: number, field: 'modelName' | 'serialNumbers', value: string) => {
        const newItems = [...items]
        newItems[index][field] = value
        setItems(newItems)
    }

    useEffect(() => {
        // Fetch Sales Reps
        fetch("/api/sales-reps")
            .then(res => res.json())
            .then(data => {
                const reps = data.salesReps || (Array.isArray(data) ? data : [])
                setSalesReps(reps)
            })
            .catch(err => console.error("Failed to fetch sales reps", err))
    }, [])

    // Update duration defaults when product selected
    useEffect(() => {
        if (selectedProduct && selectedProduct.serviceDefinition) {
            setDurationValue(selectedProduct.serviceDefinition.durationValue)
            setDurationUnit(selectedProduct.serviceDefinition.durationUnit)
        }
    }, [selectedProduct])

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault()

        if (!selectedCustomer) {
            setError("Please select a customer")
            return
        }
        if (!selectedProduct) {
            setError("Please select a service plan")
            return
        }

        setLoading(true)
        setError("")

        try {
            const res = await fetch("/api/services/contracts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    customerId: selectedCustomer.id,
                    productId: selectedProduct.id,
                    startDate,
                    durationValue,
                    durationUnit,
                    description,
                    contractNumber,
                    partnerId: selectedPartner?.id || undefined,
                    salesRepId: salesRepId || undefined,
                    contractValue,
                    invoiceReference,
                    items
                })
            })

            if (!res.ok) {
                const json = await res.json()
                throw new Error(json.error || "Failed to create agreement")
            }

            router.push("/dashboard/services")
            router.refresh()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/services" className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </Link>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">New Service Agreement</h1>
            </div>

            <form onSubmit={onSubmit} className="bg-white shadow sm:rounded-lg p-6 space-y-6">
                {error && (
                    <div className="bg-red-50 border-l-4 border-red-400 p-4">
                        <div className="flex">
                            <div className="ml-3">
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                    {/* Customer Selection */}
                    <div className="sm:col-span-1">
                        <CustomerSelector
                            selectedCustomer={selectedCustomer as any}
                            onSelect={(c) => setSelectedCustomer(c as any)}
                            type="CUSTOMER"
                        />
                    </div>

                    {/* Sales Rep Selection */}
                    <div className="sm:col-span-1">
                        <SalesRepSelector
                            label="Sales Representative"
                            onSelect={(rep) => setSalesRepId(rep?.id ?? "")}
                            selectedId={salesRepId || null}
                        />
                    </div>

                    {/* Partner Selection */}
                    <div className="sm:col-span-1">
                        <CustomerSelector
                            selectedCustomer={selectedPartner as any}
                            onSelect={(p) => setSelectedPartner(p as any)}
                            type="PARTNER"
                        />
                    </div>

                    {/* Service Selection */}
                    <div className="sm:col-span-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Service Plan *</label>
                        <ProductSelector
                            onProductSelect={(p) => setSelectedProduct(p as any)}
                            type="service"
                        />
                        {selectedProduct && (
                            <div className="mt-2 p-2 bg-blue-50 rounded-md border border-blue-100">
                                <p className="text-xs font-medium text-blue-900">{selectedProduct.name}</p>
                                <p className="text-[10px] text-blue-700 font-bold uppercase tracking-tighter">{selectedProduct.sku}</p>
                            </div>
                        )}
                    </div>

                    {/* Contract Details */}
                    <div className="sm:col-span-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Agreement / Contract No.</label>
                        <input
                            type="text"
                            value={contractNumber}
                            onChange={(e) => setContractNumber(e.target.value)}
                            className="w-full border border-gray-300 rounded-md p-3 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none"
                            placeholder="e.g. CTR-2024-001"
                        />
                    </div>

                    <div className="sm:col-span-1">
                        <label className="block text-sm font-medium text-gray-700">Invoice Reference</label>
                        <input
                            type="text"
                            value={invoiceReference}
                            onChange={(e) => setInvoiceReference(e.target.value)}
                            className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            placeholder="e.g. INV-1023"
                        />
                    </div>

                    <div className="sm:col-span-1">
                        <label className="block text-sm font-medium text-gray-700">Contract Value</label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="text-gray-500 sm:text-sm">Rs.</span>
                            </div>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={contractValue}
                                onChange={(e) => setContractValue(Number(e.target.value))}
                                className="block w-full pl-10 rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    <div className="sm:col-span-1">
                        <label className="block text-sm font-medium text-gray-700">Start Date *</label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                            <input
                                required
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* Duration Overrides */}
                    <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Duration</label>
                        <div className="mt-1 flex rounded-md shadow-sm">
                            <input
                                type="number"
                                value={durationValue}
                                onChange={(e) => setDurationValue(Number(e.target.value))}
                                min={1}
                                className="block w-full min-w-0 flex-1 rounded-none rounded-l-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                            />
                            <select
                                value={durationUnit}
                                onChange={(e) => setDurationUnit(e.target.value)}
                                className="inline-flex items-center rounded-r-md border border-l-0 border-gray-300 bg-gray-50 px-3 text-gray-500 sm:text-sm border-l"
                            >
                                <option value="DAY">Days</option>
                                <option value="WEEK">Weeks</option>
                                <option value="MONTH">Months</option>
                                <option value="YEAR">Years</option>
                            </select>
                        </div>
                    </div>

                    {/* Multiple Covered Equipment Items */}
                    <div className="sm:col-span-2 space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="block text-sm font-medium text-gray-700">Covered Equipment</label>
                            <button
                                type="button"
                                onClick={addItem}
                                className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                <Plus className="w-3 h-3 mr-1" /> Add Item
                            </button>
                        </div>

                        {items.map((item, index) => (
                            <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4 relative group">
                                {items.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => removeItem(index)}
                                        className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div className="sm:col-span-2">
                                        <label className="block text-xs font-medium text-gray-500 uppercase">Product / Equipment Model</label>
                                        <input
                                            type="text"
                                            value={item.modelName}
                                            onChange={(e) => updateItem(index, 'modelName', e.target.value)}
                                            className="mt-1 block w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                            placeholder="e.g. Synology DS920+, Seagate 10TB HDD"
                                        />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="block text-xs font-medium text-gray-500 uppercase">Serial Numbers</label>
                                        <textarea
                                            rows={2}
                                            value={item.serialNumbers}
                                            onChange={(e) => updateItem(index, 'serialNumbers', e.target.value)}
                                            className="mt-1 block w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                            placeholder="Enter serial numbers, one per line or separated by commas"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Description / Notes</label>
                        <textarea
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                    </div>
                </div>

                <div className="pt-5 flex justify-end">
                    <Link
                        href="/dashboard/services"
                        className="rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                        Cancel
                    </Link>
                    <button
                        type="submit"
                        disabled={loading}
                        className="ml-3 inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                    >
                        <Save className="w-4 h-4 mr-2" />
                        {loading ? "Creating..." : "Create Agreement"}
                    </button>
                </div>
            </form>
        </div>
    )
}
