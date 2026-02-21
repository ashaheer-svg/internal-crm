"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Save, Calendar as CalendarIcon, Search } from "lucide-react"
import Link from "next/link"

type Customer = {
    id: string
    name: string
    email: string
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
    const [customers, setCustomers] = useState<Customer[]>([])
    const [products, setProducts] = useState<ServiceProduct[]>([])
    const [salesReps, setSalesReps] = useState<SalesRep[]>([])

    // Form State
    const [customerId, setCustomerId] = useState("")
    const [partnerId, setPartnerId] = useState("")
    const [salesRepId, setSalesRepId] = useState("")
    const [productId, setProductId] = useState("")
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
    const [contractNumber, setContractNumber] = useState("")
    const [contractValue, setContractValue] = useState(0)
    const [invoiceReference, setInvoiceReference] = useState("")
    const [description, setDescription] = useState("")

    // Duration Logic
    const [durationValue, setDurationValue] = useState(1)
    const [durationUnit, setDurationUnit] = useState("YEAR")

    useEffect(() => {
        // Fetch Customers
        fetch("/api/customers?type=ALL")
            .then(res => res.json())
            .then(data => {
                // API returns { customers: [], totalCount, ... }
                if (data.customers && Array.isArray(data.customers)) {
                    setCustomers(data.customers)
                } else if (Array.isArray(data)) {
                    setCustomers(data)
                } else {
                    console.error("Unexpected customer data format", data)
                    setCustomers([])
                }
            })
            .catch(err => console.error("Failed to fetch customers", err))

        // Fetch Service Products
        fetch("/api/products?type=service")
            .then(res => res.json())
            .then(data => setProducts(data))
            .catch(err => console.error("Failed to fetch services", err))

        // Fetch Sales Reps
        fetch("/api/sales-reps")
            .then(res => res.json())
            .then(data => setSalesReps(data))
            .catch(err => console.error("Failed to fetch sales reps", err))
    }, [])

    // Update duration defaults when product selected
    useEffect(() => {
        const product = products.find(p => p.id === productId)
        if (product && product.serviceDefinition) {
            setDurationValue(product.serviceDefinition.durationValue)
            setDurationUnit(product.serviceDefinition.durationUnit)
        }
    }, [productId, products])

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError("")

        try {
            const res = await fetch("/api/services/contracts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    customerId,
                    productId,
                    startDate,
                    durationValue,
                    durationUnit,
                    description,
                    contractNumber,
                    partnerId: partnerId || undefined,
                    salesRepId: salesRepId || undefined,
                    contractValue,
                    invoiceReference
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
                        <label className="block text-sm font-medium text-gray-700">Customer *</label>
                        <select
                            required
                            value={customerId}
                            onChange={(e) => setCustomerId(e.target.value)}
                            className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        >
                            <option value="">Select a Customer</option>
                            {customers.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Sales Rep Selection */}
                    <div className="sm:col-span-1">
                        <label className="block text-sm font-medium text-gray-700">Sales Representative</label>
                        <select
                            value={salesRepId}
                            onChange={(e) => setSalesRepId(e.target.value)}
                            className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        >
                            <option value="">Select a Sales Rep</option>
                            {salesReps.map(rep => (
                                <option key={rep.id} value={rep.id}>{rep.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Partner Selection */}
                    <div className="sm:col-span-1">
                        <label className="block text-sm font-medium text-gray-700">Partner (Optional)</label>
                        <select
                            value={partnerId}
                            onChange={(e) => setPartnerId(e.target.value)}
                            className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        >
                            <option value="">Select a Partner</option>
                            {customers.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Service Selection */}
                    <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Service Plan *</label>
                        <select
                            required
                            value={productId}
                            onChange={(e) => setProductId(e.target.value)}
                            className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        >
                            <option value="">Select a Service</option>
                            {products.map(p => (
                                <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                            ))}
                        </select>
                    </div>

                    {/* Contract Details */}
                    <div className="sm:col-span-1">
                        <label className="block text-sm font-medium text-gray-700">Agreement / Contract No.</label>
                        <input
                            type="text"
                            value={contractNumber}
                            onChange={(e) => setContractNumber(e.target.value)}
                            className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
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
