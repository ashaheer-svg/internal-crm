"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Save } from "lucide-react"
import Link from "next/link"

interface ContractData {
    id: string
    contractNumber: string | null
    contractValue: number
    invoiceReference: string | null
    description: string | null
    startDate: string
    endDate: string | null
    partnerId: string | null
    salesRepId: string | null
    customer: { name: string }
    product: { name: string, sku: string }
}

export default function EditServiceContractPage() {
    const router = useRouter()
    const params = useParams()
    const id = params.id as string

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState("")

    // Data Sources
    const [partners, setPartners] = useState<{ id: string, name: string }[]>([])
    const [salesReps, setSalesReps] = useState<{ id: string, name: string }[]>([])

    // Form State
    const [contract, setContract] = useState<ContractData | null>(null)
    const [contractNumber, setContractNumber] = useState("")
    const [contractValue, setContractValue] = useState(0)
    const [invoiceReference, setInvoiceReference] = useState("")
    const [description, setDescription] = useState("")
    const [partnerId, setPartnerId] = useState("")
    const [salesRepId, setSalesRepId] = useState("")
    const [endDate, setEndDate] = useState("")

    useEffect(() => {
        if (!id) return

        Promise.all([
            fetch(`/api/services/contracts/${id}`).then(res => res.json()),
            fetch("/api/customers?type=PARTNER").then(res => res.json()), // Assuming this filter works or fetches all
            fetch("/api/sales-reps").then(res => res.json())
        ]).then(([contractData, partnersData, salesRepsData]) => {
            if (contractData.error) throw new Error(contractData.error)

            setContract(contractData)
            setContractNumber(contractData.contractNumber || "")
            setContractValue(contractData.contractValue || 0)
            setInvoiceReference(contractData.invoiceReference || "")
            setDescription(contractData.description || "")
            setPartnerId(contractData.partnerId || "")
            setSalesRepId(contractData.salesRepId || "")
            setEndDate(contractData.endDate ? new Date(contractData.endDate).toISOString().split('T')[0] : "")

            // Handle Partner/Customer data structure differences if any
            if (partnersData.customers) setPartners(partnersData.customers)
            else if (Array.isArray(partnersData)) setPartners(partnersData)

            setSalesReps(salesRepsData)
            setLoading(false)
        }).catch(err => {
            console.error("Failed to load data", err)
            setError(err.message || "Failed to load contract details")
            setLoading(false)
        })
    }, [id])

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault()
        setSaving(true)
        setError("")

        try {
            const res = await fetch(`/api/services/contracts/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contractNumber,
                    contractValue,
                    invoiceReference,
                    description,
                    partnerId: partnerId || null,
                    salesRepId: salesRepId || null,
                    endDate: endDate || null
                })
            })

            if (!res.ok) {
                const json = await res.json()
                throw new Error(json.error || "Failed to update contract")
            }

            router.push("/dashboard/services")
            router.refresh()
        } catch (err: any) {
            setError(err.message)
            setSaving(false)
        }
    }

    if (loading) return <div className="p-8 text-center text-gray-500">Loading contract details...</div>
    if (!contract) return <div className="p-8 text-center text-red-500">Contract not found</div>

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/services" className="p-2 hover:bg-gray-200 rounded-full">
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Edit Service Contract</h1>
                    <p className="text-sm text-gray-500">
                        {contract.customer.name} - {contract.product.name}
                    </p>
                </div>
            </div>

            <form onSubmit={onSubmit} className="bg-white shadow sm:rounded-lg p-6 space-y-6">
                {error && (
                    <div className="bg-red-50 border-l-4 border-red-400 p-4">
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                )}

                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">

                    {/* Read-Only Info */}
                    <div className="sm:col-span-1">
                        <label className="block text-sm font-medium text-gray-500">Customer</label>
                        <div className="mt-1 block w-full rounded-md border-gray-200 bg-gray-50 p-2 text-gray-700 sm:text-sm border">
                            {contract.customer.name}
                        </div>
                    </div>

                    <div className="sm:col-span-1">
                        <label className="block text-sm font-medium text-gray-500">Service Product</label>
                        <div className="mt-1 block w-full rounded-md border-gray-200 bg-gray-50 p-2 text-gray-700 sm:text-sm border">
                            {contract.product.name} ({contract.product.sku})
                        </div>
                    </div>

                    <div className="sm:col-span-1">
                        <label className="block text-sm font-medium text-gray-700">Contract Number</label>
                        <input
                            type="text"
                            value={contractNumber}
                            onChange={(e) => setContractNumber(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                        />
                    </div>

                    <div className="sm:col-span-1">
                        <label className="block text-sm font-medium text-gray-700">Invoice Reference</label>
                        <input
                            type="text"
                            value={invoiceReference}
                            onChange={(e) => setInvoiceReference(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
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
                                className="block w-full pl-10 rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                            />
                        </div>
                    </div>

                    <div className="sm:col-span-1">
                        <label className="block text-sm font-medium text-gray-700">End Date</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                        />
                        <p className="mt-1 text-xs text-gray-500">Changing this will override the calculated duration.</p>
                    </div>

                    <div className="sm:col-span-1">
                        <label className="block text-sm font-medium text-gray-700">Partner</label>
                        <select
                            value={partnerId}
                            onChange={(e) => setPartnerId(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                        >
                            <option value="">None</option>
                            {partners.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="sm:col-span-1">
                        <label className="block text-sm font-medium text-gray-700">Sales Representative</label>
                        <select
                            value={salesRepId}
                            onChange={(e) => setSalesRepId(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                        >
                            <option value="">None</option>
                            {salesReps.map(rep => (
                                <option key={rep.id} value={rep.id}>{rep.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Description / Notes</label>
                        <textarea
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
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
                        disabled={saving}
                        className="ml-3 inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                    >
                        <Save className="w-4 h-4 mr-2" />
                        {saving ? "Saving..." : "Update Contract"}
                    </button>
                </div>
            </form>
        </div>
    )
}
