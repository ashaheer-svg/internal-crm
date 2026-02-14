"use client"

import { use, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Save, Package, CheckCircle } from "lucide-react"
import { Currency } from "@/components/Currency"

type Invoice = {
    id: string
    invoiceNumber: string
    customerName: string
    customerEmail: string | null
    customerPhone: string | null
    notes: string | null
    totalAmount: number
    status: string
    hasBackorders: boolean
    salesRepId: string | null
    items: InvoiceItem[]
}

type InvoiceItem = {
    id: string
    productName: string
    serialNumber: string | null
    unitPrice: number
    quantity: number
    isFulfilled: boolean
    product: {
        id: string
        name: string
    }
}

export default function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [invoice, setInvoice] = useState<Invoice | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState("")

    const [customerName, setCustomerName] = useState("")
    const [customerEmail, setCustomerEmail] = useState("")
    const [customerPhone, setCustomerPhone] = useState("")
    const [notes, setNotes] = useState("")
    const [salesRepId, setSalesRepId] = useState("")
    const [salesReps, setSalesReps] = useState<any[]>([])

    useEffect(() => {
        fetchInvoice()
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

    async function fetchInvoice() {
        try {
            const res = await fetch(`/api/invoices/${id}`)
            const data = await res.json()
            setInvoice(data)
            setCustomerName(data.customerName)
            setCustomerEmail(data.customerEmail || "")
            setCustomerPhone(data.customerPhone || "")
            setNotes(data.notes || "")
            setSalesRepId(data.salesRepId || "")
        } catch (error) {
            console.error('Failed to fetch invoice:', error)
            setError("Failed to load invoice")
        } finally {
            setLoading(false)
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setSaving(true)
        setError("")

        try {
            const res = await fetch(`/api/invoices/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    customerName,
                    customerEmail,
                    customerPhone,
                    notes,
                    salesRepId: salesRepId || null
                }),
            })

            if (!res.ok) {
                const json = await res.json()
                throw new Error(json.error || "Failed to update invoice")
            }

            router.push(`/dashboard/transactions/invoices/${id}`)
        } catch (e) {
            setError(e instanceof Error ? e.message : "Something went wrong")
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto py-12 text-center">
                <p className="text-gray-500">Loading invoice...</p>
            </div>
        )
    }

    if (!invoice) {
        return (
            <div className="max-w-4xl mx-auto py-12 text-center">
                <p className="text-red-600">Delivery Order not found</p>
            </div>
        )
    }

    const fulfilledItems = invoice.items.filter(item => item.isFulfilled)
    const backorderItems = invoice.items.filter(item => !item.isFulfilled)

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href={`/dashboard/transactions/invoices/${invoice.id}`} className="p-2 hover:bg-gray-200 rounded-full">
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                        Edit Delivery Order {invoice.invoiceNumber}
                    </h1>
                    <p className="text-sm text-gray-500">
                        Update customer information and notes
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
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
                                rows={3}
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

                {/* Invoice Items (Read-only) */}
                <div className="bg-white shadow sm:rounded-lg p-6">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">Delivery Items</h2>
                    <p className="text-sm text-gray-500 mb-4">
                        Note: Items cannot be modified after invoice creation. Only customer information can be updated.
                    </p>

                    {fulfilledItems.length > 0 && (
                        <div className="mb-6">
                            <div className="flex items-center gap-2 mb-3">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <h3 className="text-sm font-medium text-gray-900">Fulfilled Items</h3>
                            </div>
                            <div className="space-y-2">
                                {fulfilledItems.map((item) => (
                                    <div key={item.id} className="flex justify-between items-center p-3 border rounded-md bg-gray-50">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{item.productName}</p>
                                            {item.serialNumber && (
                                                <p className="text-xs text-gray-500">S/N: {item.serialNumber}</p>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-medium text-gray-900 flex items-center justify-end gap-1">
                                                <Currency amount={item.unitPrice} className="min-w-0" /> × {item.quantity}
                                            </p>
                                            <div className="text-xs text-gray-500 flex items-center justify-end gap-1">
                                                Total: <Currency amount={item.unitPrice * item.quantity} className="min-w-0" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {backorderItems.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <Package className="h-4 w-4 text-amber-600" />
                                <h3 className="text-sm font-medium text-gray-900">Backorder Items</h3>
                            </div>
                            <div className="space-y-2">
                                {backorderItems.map((item) => (
                                    <div key={item.id} className="flex justify-between items-center p-3 border border-amber-200 rounded-md bg-amber-50">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{item.productName}</p>
                                            <p className="text-xs text-amber-600">Pending fulfillment</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-medium text-gray-900 flex items-center justify-end gap-1">
                                                <Currency amount={item.unitPrice} className="min-w-0" /> × {item.quantity}
                                            </p>
                                            <div className="text-xs text-gray-500 flex items-center justify-end gap-1">
                                                Total: <Currency amount={item.unitPrice * item.quantity} className="min-w-0" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3">
                    <Link
                        href={`/dashboard/transactions/invoices/${invoice.id}`}
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
