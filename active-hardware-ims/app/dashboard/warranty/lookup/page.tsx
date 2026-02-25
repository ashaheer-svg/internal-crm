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
        invoiceNumber: string | null
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
    candidates?: Array<{
        id: string
        serialNumber: string
        status: string
        product: {
            sku: string
            name: string
            brand: string
            model: string
        }
    }>
}

export default function WarrantyLookupPage() {
    const [serial, setSerial] = useState("")
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<WarrantyInfo | null>(null)
    const [candidates, setCandidates] = useState<any[] | null>(null)
    const [error, setError] = useState("")

    // Project Search State
    const [projectQuery, setProjectQuery] = useState("")
    const [projects, setProjects] = useState<any[] | null>(null)
    const [projectLoading, setProjectLoading] = useState(false)
    const [projectError, setProjectError] = useState("")

    async function handleSearch(e: React.FormEvent) {
        e.preventDefault()
        if (!serial.trim()) return

        setLoading(true)
        setError("")
        setResult(null)
        setCandidates(null)

        try {
            const searchSerial = typeof e === 'string' ? e : serial.trim()
            const res = await fetch(`/api/warranty/lookup?serial=${encodeURIComponent(searchSerial)}`)
            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || "Search failed")
            }

            if (data.candidates) {
                setCandidates(data.candidates)
            } else {
                setResult(data)
                setSerial(data.item.serialNumber) // Update input to exact serial if found
            }
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    function selectCandidate(s: string) {
        setSerial(s)
        handleSearch(s as any)
    }

    async function handleProjectSearch(e: React.FormEvent) {
        e.preventDefault()
        if (!projectQuery.trim()) return

        setProjectLoading(true)
        setProjectError("")
        setProjects(null)
        setResult(null) // Clear serial results when searching projects
        setCandidates(null)

        try {
            const res = await fetch(`/api/crm/projects?search=${encodeURIComponent(projectQuery.trim())}`)
            const data = await res.json()

            if (!res.ok) throw new Error(data.error || "Project search failed")
            setProjects(data.projects || [])
        } catch (err: any) {
            setProjectError(err.message)
        } finally {
            setProjectLoading(false)
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
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">General Lookup</h1>
                <p className="mt-1 text-sm text-gray-500">
                    Search for inventory items by serial number or find CRM projects by customer, partner, or project name.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Serial Search Box */}
                <div className="bg-white shadow rounded-lg p-6 print:hidden">
                    <h2 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        Inventory Item (Serial Number)
                    </h2>
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
                                className="block w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-200 text-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                            {loading ? 'Searching...' : 'Search'}
                        </button>
                    </form>
                </div>

                {/* Project Search Box */}
                <div className="bg-white shadow rounded-lg p-6 print:hidden">
                    <h2 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        CRM Projects (Name, Customer, Partner)
                    </h2>
                    <form onSubmit={handleProjectSearch} className="flex gap-4">
                        <div className="relative flex-grow">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                value={projectQuery}
                                onChange={(e) => setProjectQuery(e.target.value)}
                                placeholder="Search Projects..."
                                className="block w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-200 text-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={projectLoading}
                            className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                        >
                            {projectLoading ? 'Searching...' : 'Search'}
                        </button>
                    </form>
                </div>
            </div>

            {/* Serial Search Error */}
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

            {/* Project Search Error */}
            {projectError && (
                <div className="mt-4 p-4 bg-red-50 border-l-4 border-red-400 rounded-md">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <AlertTriangle className="h-5 w-5 text-red-400" />
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-red-700">{projectError}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Project Search Results */}
            {projects && (
                <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200 mt-6 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="px-6 py-4 border-b border-gray-200 bg-indigo-50 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Project Matches ({projects.length})
                        </h3>
                    </div>
                    {projects.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 italic">
                            No projects found matching "{projectQuery}"
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200">
                            {projects.map((proj) => (
                                <Link
                                    key={proj.id}
                                    href={`/dashboard/crm/projects/${proj.id}`}
                                    className="block px-6 py-5 hover:bg-indigo-50 transition-colors"
                                >
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="space-y-1">
                                            <p className="text-xs font-mono font-bold text-indigo-600">{proj.projectCode}</p>
                                            <h4 className="text-lg font-bold text-gray-900 leading-tight">{proj.title}</h4>
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                                                <span className="text-sm text-gray-600 flex items-center gap-1">
                                                    <User className="w-3.5 h-3.5 text-gray-400" />
                                                    {proj.customer?.name || 'No Customer'}
                                                </span>
                                                {proj.partner && (
                                                    <span className="text-sm text-gray-500 border-l pl-4 flex items-center gap-1">
                                                        <span className="font-semibold text-gray-400">Partner:</span> {proj.partner.name}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-2 shrink-0">
                                            <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 rounded-full border border-indigo-200">
                                                {proj.stage?.name || proj.status}
                                            </span>
                                            <div className="text-right">
                                                <p className="text-xs text-gray-500 flex items-center justify-end gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {proj.expectedCloseDate ? formatDate(proj.expectedCloseDate) : formatDate(proj.createdAt)}
                                                </p>
                                                <p className="text-xs font-medium text-gray-700 mt-1">
                                                    Rep: {proj.salesRep?.name || 'Unassigned'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Candidate Selection List */}
            {
                candidates && candidates.length > 0 && (
                    <div className="bg-white shadow rounded-lg overflow-hidden border-2 border-blue-100 no-print">
                        <div className="px-6 py-4 border-b border-gray-200 bg-blue-50">
                            <h3 className="text-lg font-medium text-blue-900 flex items-center gap-2">
                                <Search className="h-5 w-5" />
                                Multiple matches found. Please select:
                            </h3>
                        </div>
                        <div className="divide-y divide-gray-200">
                            {candidates.map((cand) => (
                                <button
                                    key={cand.id}
                                    onClick={() => selectCandidate(cand.serialNumber)}
                                    className="w-full text-left px-6 py-4 hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-1">
                                            <p className="font-bold text-xl text-gray-900 font-mono">{cand.serialNumber}</p>
                                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                                                <span className="text-gray-600 flex items-center gap-1">
                                                    <Package className="w-3.5 h-3.5" />
                                                    {cand.product.brand} {cand.product.model}
                                                </span>
                                                <span className="text-gray-500 font-mono text-xs flex items-center gap-1 border-l pl-4">
                                                    {cand.product.sku}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cand.status === 'AVAILABLE' ? 'bg-green-100 text-green-800' :
                                                cand.status === 'SOLD' ? 'bg-blue-100 text-blue-800' :
                                                    'bg-gray-100 text-gray-800'
                                                }`}>
                                                {cand.status}
                                            </span>
                                            <p className="text-blue-600 text-sm font-medium mt-1">View Details →</p>
                                        </div>
                                    </div>

                                    {/* Extra Details Grid */}
                                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-3 rounded-md text-xs">
                                        <div>
                                            <p className="text-gray-500 font-medium">Location</p>
                                            <p className="text-gray-900 font-semibold mt-0.5">{cand.location}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500 font-medium">Partner / Customer</p>
                                            <p className="text-gray-900 font-semibold mt-0.5 truncate max-w-[150px]" title={cand.partner}>
                                                {cand.partner}
                                                {cand.endCustomer && <span className="text-gray-400 font-normal"> → {cand.endCustomer}</span>}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500 font-medium">Delivery Order</p>
                                            <p className="text-gray-900 font-semibold mt-0.5">
                                                {cand.deliveryOrder.number ? (
                                                    <>#{cand.deliveryOrder.number} <span className="text-gray-400 font-normal">({formatDate(cand.deliveryOrder.date)})</span></>
                                                ) : 'N/A'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500 font-medium">Invoice Number</p>
                                            <p className="text-gray-900 font-semibold mt-0.5">{cand.deliveryOrder.invoiceNumber || 'N/A'}</p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )
            }

            {/* Results */}
            {
                result && (
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
                                                    <div>
                                                        <p className="text-xs text-gray-500">Invoice Number</p>
                                                        <p className="font-medium text-gray-900">{result.saleParams.invoiceNumber || 'N/A'}</p>
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
