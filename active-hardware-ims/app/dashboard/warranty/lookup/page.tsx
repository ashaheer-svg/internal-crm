"use client"

import { useState } from "react"
import { Search, Package, Calendar, Clock, AlertTriangle, CheckCircle, FileText, User, Printer, RefreshCw } from "lucide-react"
import Link from "next/link"
import { formatDate } from "@/lib/utils"
import DocumentHeader from "@/components/DocumentHeader"
import DocumentFooter from "@/components/DocumentFooter"

type WarrantyInfo = {
    item: {
        id: string
        serialNumber: string
        status: string
        warrantyExpiry: string | null
        product: {
            sku: string
            name: string
            brand: string
            model: string
            warrantyMonths: number
        }
    }
    saleParams: {
        date: string
        orderNumber: string
        customer: string
        endCustomer: string | null
        type: string
    } | null
    history: Array<{
        id: string
        type: string
        date: string
        notes: string
        performedBy: string
    }>
    replacementInfo: {
        replacedBy: {
            serialNumber: string | null
            externalInfo: string | null
            date: string
            type: string
            claimId: string
        } | null
        replaces: {
            serialNumber: string
            date: string
            type: string
            claimId: string
        } | null
    } | null
}

export default function WarrantyLookupPage() {
    const [serial, setSerial] = useState("")
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<WarrantyInfo | null>(null)
    const [error, setError] = useState("")

    async function handleSearch(e: React.FormEvent) {
        e.preventDefault()
        if (!serial.trim()) return

        setLoading(true)
        setError("")
        setResult(null)

        try {
            const res = await fetch(`/api/warranty/lookup?serial=${encodeURIComponent(serial.trim())}`)
            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || "Search failed")
            }

            setResult(data)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    function getWarrantyStatus(expiryDate: string | null) {
        if (!expiryDate) return { status: 'UNKNOWN', color: 'text-gray-500', bg: 'bg-gray-100', text: 'No Warranty Date' }

        const now = new Date()
        const expiry = new Date(expiryDate)
        const diffTime = expiry.getTime() - now.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        if (diffDays < 0) {
            return { status: 'EXPIRED', color: 'text-red-700', bg: 'bg-red-100', text: `Expired on ${formatDate(expiry)}` }
        } else if (diffDays <= 30) {
            return { status: 'EXPIRING_SOON', color: 'text-yellow-700', bg: 'bg-yellow-100', text: `Expires in ${diffDays} days (${formatDate(expiry)})` }
        } else {
            return { status: 'ACTIVE', color: 'text-green-700', bg: 'bg-green-100', text: `Valid until ${formatDate(expiry)}` }
        }
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <style jsx global>{`
                @page {
                    size: A4;
                    margin: 15mm;
                }
                @media print {
                    body { -webkit-print-color-adjust: exact; }
                    .no-print { display: none !important; }
                }
            `}</style>
            <div className="no-print">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">Warranty Lookup</h1>
                <p className="mt-1 text-sm text-gray-500">
                    Check warranty status and transaction history by serial number.
                </p>
            </div>

            {/* Search Box */}
            <div className="bg-white shadow rounded-lg p-6 print:hidden">
                <form onSubmit={handleSearch} className="flex gap-4">
                    <div className="relative flex-grow">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            value={serial}
                            onChange={(e) => setSerial(e.target.value)}
                            placeholder="Enter Serial Number..."
                            className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-lg"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                        {loading ? 'Searching...' : 'Search'}
                    </button>
                </form>

                {error && (
                    <div className="mt-4 p-4 bg-red-50 border-l-4 border-red-400 rounded-md">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <AlertTriangle className="h-5 w-5 text-red-400" />
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Results */}
            {result && (
                <div className="space-y-6">
                    <div className="hidden print:block">
                        <DocumentHeader title="WARRANTY REPORT" subtitle="Service History & Coverage" />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:block print:space-y-6">
                        {/* Left Col: Product & Status */}
                        <div className="lg:col-span-2 space-y-6 print:mb-6">
                            {/* Product Card */}
                            <div className="bg-white shadow rounded-lg overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                                    <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                                        <Package className="h-5 w-5 text-gray-500" />
                                        Product Details
                                    </h3>
                                </div>
                                <div className="p-6">
                                    <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                                        <div>
                                            <dt className="text-sm font-medium text-gray-500">Product Name</dt>
                                            <dd className="mt-1 text-lg font-semibold text-gray-900">{result.item.product.name}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-sm font-medium text-gray-500">Brand & Model</dt>
                                            <dd className="mt-1 text-md text-gray-900">{result.item.product.brand} {result.item.product.model}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-sm font-medium text-gray-500">SKU</dt>
                                            <dd className="mt-1 text-sm font-mono text-gray-700">{result.item.product.sku}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-sm font-medium text-gray-500">Serial Number</dt>
                                            <dd className="mt-1 text-sm font-mono text-gray-700 bg-gray-100 inline-block px-2 py-1 rounded">
                                                {result.item.serialNumber}
                                            </dd>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Warranty Status Card */}
                            <div className="bg-white shadow rounded-lg overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                                    <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                                        <ShieldIcon status={getWarrantyStatus(result.item.warrantyExpiry).status} />
                                        Warranty Status
                                    </h3>
                                </div>
                                <div className="p-6">
                                    <div className={`rounded-md p-4 mb-4 flex items-start gap-3 ${getWarrantyStatus(result.item.warrantyExpiry).bg}`}>
                                        <Clock className={`h-6 w-6 ${getWarrantyStatus(result.item.warrantyExpiry).color}`} />
                                        <div>
                                            <h4 className={`text-lg font-bold ${getWarrantyStatus(result.item.warrantyExpiry).color}`}>
                                                {getWarrantyStatus(result.item.warrantyExpiry).text}
                                            </h4>
                                            <p className={`mt-1 text-sm ${getWarrantyStatus(result.item.warrantyExpiry).color}`}>
                                                Standard Warranty: {result.item.product.warrantyMonths} Months
                                            </p>
                                        </div>
                                    </div>

                                    {result.saleParams ? (
                                        <div className="border-t pt-4 mt-4">
                                            <h4 className="text-sm font-medium text-gray-600 mb-3">Original Sale Details</h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-xs text-gray-500">Date Sold</p>
                                                    <p className="font-medium text-gray-900">{formatDate(result.saleParams.date)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500">Order Number</p>
                                                    <Link href={`/dashboard/transactions/delivery-orders/${result.saleParams.orderNumber}`} className="text-blue-600 hover:underline font-medium">
                                                        #{result.saleParams.orderNumber}
                                                    </Link>
                                                </div>
                                                <div className="col-span-2">
                                                    <p className="text-xs text-gray-500">Customer</p>
                                                    <div className="font-medium text-gray-900 flex items-center gap-1">
                                                        <User className="h-3 w-3 text-gray-400" />
                                                        {result.saleParams.customer}
                                                        {result.saleParams.endCustomer && (
                                                            <span className="text-gray-500 font-normal ml-1">
                                                                → {result.saleParams.endCustomer}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="border-t pt-4 mt-4 bg-gray-50 p-4 rounded text-sm text-gray-500 italic">
                                            Sales record not found in system (possibly imported or legacy item)
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right Col: Timeline */}
                        <div className="bg-white shadow rounded-lg overflow-hidden flex flex-col h-full">
                            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                                <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-gray-500" />
                                    History Log
                                </h3>
                                <button
                                    onClick={() => window.print()}
                                    className="print:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                                    title="Print Warranty Report"
                                >
                                    <Printer className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6 max-h-[600px] print:max-h-none print:overflow-visible">
                                {result.history.length === 0 ? (
                                    <p className="text-sm text-gray-500 italic text-center py-4">No history logged.</p>
                                ) : (
                                    <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                                        {result.history.map((log) => (
                                            <div key={log.id} className="relative flex items-center justify-between group is-active">
                                                {/* Icon */}
                                                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-200 group-[.is-active]:bg-blue-500 text-slate-500 group-[.is-active]:text-white shadow shrink-0">
                                                    <Clock className="w-5 h-5" />
                                                </div>

                                                {/* Card */}
                                                <div className="w-[calc(100%-3rem)] ml-4 bg-white p-4 rounded border border-slate-200 shadow">
                                                    <div className="flex items-center justify-between space-x-2 mb-1">
                                                        <div className="font-bold text-slate-900 text-sm">{log.type}</div>
                                                        <time className="font-caveat font-medium text-indigo-500 text-xs">{formatDate(log.date)}</time>
                                                    </div>
                                                    <div className="text-slate-500 text-xs">
                                                        {log.notes}
                                                    </div>
                                                    <div className="mt-1 text-xs text-gray-400">
                                                        by {log.performedBy}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <DocumentFooter />
                </div>
            )}
        </div>
    )
}


function ShieldIcon({ status }: { status: string }) {
    if (status === 'ACTIVE') return <CheckCircle className="h-5 w-5 text-green-600" />
    if (status === 'EXPIRED') return <AlertTriangle className="h-5 w-5 text-red-600" />
    return <Clock className="h-5 w-5 text-yellow-600" />
}
