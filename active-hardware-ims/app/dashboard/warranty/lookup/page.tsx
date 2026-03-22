"use client"

import { useState } from "react"
import { Search, Package, Calendar, Clock, AlertTriangle, CheckCircle, FileText, User, Printer, RefreshCw } from "lucide-react"
import Link from "next/link"
import { formatDate } from "@/lib/utils"
import DocumentHeader from "@/components/DocumentHeader"
import DocumentFooter from "@/components/DocumentFooter"

type WarrantyInfo = {
    item: {
        id?: string
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
        status: string
        customer: string
        endCustomer: string | null
        invoiceNumber: string | null
    } | null
    amcs: Array<{
        id: string
        contractNumber: string | null
        status: string
        startDate: string
        endDate: string | null
        productName: string
    }>
    history: Array<{
        id: string
        type: string
        date: string
        notes: string
        performedBy: string
        source: string
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
        type: string
        status: string
        location: string
        partner: string
        endCustomer: string | null
        deliveryOrder: {
            number: string | null
            date: string | null
            invoiceNumber: string | null
        }
        product: {
            sku: string
            name: string
            brand: string
            model: string
        }
    }>
}

function WorkflowStepper({ status }: { status?: string }) {
    if (!status) return null

    const steps = [
        { key: 'DRAFT', label: 'Draft', role: 'Sales' },
        { key: 'CONFIRMED', label: 'Confirmed', role: 'Acc-Mgr' },
        { key: 'READY_FOR_BUILD', label: 'Ready', role: 'Technical' },
        { key: 'BUILDING', label: 'Building', role: 'Technical' },
        { key: 'BUILT', label: 'Built', role: 'Technical' },
        { key: 'COMPLETED', label: 'Completed', role: 'Acc-Mgr' },
    ]

    const currentIdx = steps.findIndex(s => s.key === status)
    if (currentIdx === -1 && status !== 'CANCELLED') return null

    return (
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm no-print">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-6">Delivery Order Workflow</h3>
            <div className="flex items-center w-full">
                {steps.map((step, index) => {
                    const isCompleted = index < currentIdx
                    const isActive = index === currentIdx
                    const isLast = index === steps.length - 1

                    return (
                        <div key={step.key} className={`flex items-center ${!isLast ? 'flex-1' : ''}`}>
                            <div className="relative flex flex-col items-center">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300
                                    ${isCompleted ? 'bg-green-500 border-green-500 text-white shadow-sm' : ''}
                                    ${isActive ? 'bg-blue-50 border-blue-500 text-blue-600 font-bold ring-4 ring-blue-100' : ''}
                                    ${!isCompleted && !isActive ? 'bg-gray-50 border-gray-200 text-gray-400' : ''}
                                `}>
                                    {isCompleted ? (
                                        <CheckCircle className="w-4 h-4" />
                                    ) : (
                                        <span className="text-xs">{index + 1}</span>
                                    )}
                                </div>
                                <div className={`absolute top-10 text-center text-[11px] font-semibold w-max transition-colors flex flex-col items-center
                                    ${isActive ? 'text-blue-600 font-bold' : isCompleted ? 'text-green-600' : 'text-gray-400'}
                                `}>
                                    <span>{step.label}</span>
                                    <span className="text-[8px] font-medium mt-0.5 tracking-tight text-gray-400">
                                        ({step.role})
                                    </span>
                                </div>
                            </div>
                            {!isLast && (
                                <div className={`flex-1 h-1 mx-2 rounded-full transition-all duration-500 ${isCompleted ? 'bg-green-500' : 'bg-gray-100'}`} />
                            )}
                        </div>
                    )
                })}
            </div>
            <div className="h-4"></div>
        </div>
    )
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

    async function handleSearch(e: React.FormEvent | string) {
        if (typeof e !== 'string') e.preventDefault()
        if (typeof e === 'string' ? !e.trim() : !serial.trim()) return

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
        handleSearch(s)
    }

    async function handleProjectSearch(e: React.FormEvent) {
        e.preventDefault()
        if (!projectQuery.trim()) return

        if (projectQuery.trim().length < 2) {
            setProjectError("Search query must be at least 2 characters long")
            return
        }

        setProjectLoading(true)
        setProjectError("")
        setProjects(null)
        setResult(null) // Clear serial results when searching projects
        setCandidates(null)

        try {
            const res = await fetch(`/api/crm/projects?search=${encodeURIComponent(projectQuery.trim())}&lookup=true`)
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
        <div className="space-y-6 max-w-5xl mx-auto pb-12">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 no-print">
                {/* Serial Search Box */}
                <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        Inventory Item / AMC Serial
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
                                className="block w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-200 text-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none h-[48px]"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 h-[48px]"
                        >
                            {loading ? 'Searching...' : 'Search'}
                        </button>
                    </form>
                </div>

                {/* Project Search Box */}
                <div className="bg-white shadow rounded-lg p-6">
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
                                className="block w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-200 text-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none h-[48px]"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={projectLoading}
                            className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 h-[48px]"
                        >
                            {projectLoading ? 'Searching...' : 'Search'}
                        </button>
                    </form>
                </div>
            </div>

            {/* Serial Search Error */}
            {error && (
                <div className="mt-4 p-4 bg-red-50 border-l-4 border-red-400 rounded-md no-print">
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
                <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200 mt-6 no-print animate-in fade-in slide-in-from-top-4">
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
            {candidates && candidates.length > 0 && (
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
                                            <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600 font-bold uppercase tracking-wider ml-2">
                                                {cand.type}
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
                                        <p className="text-blue-600 text-sm font-medium mt-1 uppercase tracking-tight">View Details →</p>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Results */}
            {result && (
                <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
                    <div className="hidden print:block">
                        <DocumentHeader title="WARRANTY & SERVICE REPORT" subtitle="Complete Item Lifecycle History" />
                    </div>

                    {result.saleParams && result.saleParams.orderNumber && (
                        <WorkflowStepper status={result.saleParams.status} />
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:block print:space-y-6">
                        {/* Left/Main Col */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Status Banner */}
                            <div className={`p-4 rounded-lg flex items-center justify-between shadow-sm border ${result.item.status === 'AMC_ONLY' ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-200'}`}>
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-full ${result.item.status === 'AMC_ONLY' ? 'bg-indigo-100 text-indigo-600' : 'bg-blue-50 text-blue-600'}`}>
                                        <Package className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Current Status</p>
                                        <h2 className="text-xl font-black text-gray-900 leading-none">{result.item.status}</h2>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-none mb-1 text-right">Serial Number</p>
                                    <h2 className="text-xl font-mono font-bold text-gray-900 leading-none">{result.item.serialNumber}</h2>
                                </div>
                            </div>

                            {/* Product & Sale Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
                                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                                        <Package className="w-4 h-4 text-gray-400" />
                                        <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Product Specification</span>
                                    </div>
                                    <div className="p-4 space-y-4">
                                        <div>
                                            <p className="text-lg font-bold text-gray-900 leading-tight">{result.item.product.name}</p>
                                            <p className="text-sm text-gray-500 mt-1">{result.item.product.brand} {result.item.product.model}</p>
                                        </div>
                                        <div className="flex justify-between items-end border-t pt-3">
                                            <div>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase">Part Number/SKU</p>
                                                <p className="text-xs font-mono font-bold text-gray-700">{result.item.product.sku}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase">Std. Warranty</p>
                                                <p className="text-xs font-bold text-gray-700">{result.item.product.warrantyMonths} Months</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
                                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-gray-400" />
                                        <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Sale & Fulfillment</span>
                                    </div>
                                    <div className="p-4">
                                        {result.saleParams ? (
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase">Client / End Customer</p>
                                                        <p className="text-sm font-bold text-gray-900">{result.saleParams.customer}</p>
                                                        {result.saleParams.endCustomer && <p className="text-xs text-blue-600 font-medium italic mt-0.5">Ship To: {result.saleParams.endCustomer}</p>}
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase">Sale Date</p>
                                                        <p className="text-sm font-bold text-gray-900">{formatDate(result.saleParams.date)}</p>
                                                    </div>
                                                </div>
                                                <div className="flex justify-between border-t pt-3">
                                                    <div>
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase">DO Number</p>
                                                        <p className="text-xs font-bold text-indigo-600">#{result.saleParams.orderNumber}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase">Invoice Ref</p>
                                                        <p className="text-xs font-bold text-gray-700">{result.saleParams.invoiceNumber || 'NOT INVOICED'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center text-center py-4">
                                                <AlertTriangle className="w-8 h-8 text-yellow-400 mb-2" />
                                                <p className="text-sm font-bold text-gray-800">No Direct Sale Record</p>
                                                <p className="text-[11px] text-gray-500 max-w-[180px]">Item may be legacy, imported, or only covered under AMC/Service.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Warranty & AMC Status Box */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Warranty Card */}
                                <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-5">
                                    <div className="flex items-center gap-3 mb-4">
                                        <ShieldIcon status={getWarrantyStatus(result.item.warrantyExpiry || null).status} />
                                        <h3 className="text-sm font-bold text-gray-900">Original Warranty</h3>
                                    </div>
                                    <div className={`p-4 rounded-md border ${getWarrantyStatus(result.item.warrantyExpiry || null).bg} ${getWarrantyStatus(result.item.warrantyExpiry || null).color.replace('text', 'border')}`}>
                                        <p className="text-xs font-bold uppercase tracking-widest opacity-60">Status</p>
                                        <p className="text-lg font-black">{getWarrantyStatus(result.item.warrantyExpiry || null).status}</p>
                                        <p className="text-xs mt-1 font-medium italic opacity-80">{getWarrantyStatus(result.item.warrantyExpiry || null).text}</p>
                                    </div>
                                </div>

                                {/* AMC Highlights */}
                                <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-5">
                                    <div className="flex items-center gap-3 mb-4">
                                        <RefreshCw className="w-5 h-5 text-indigo-500" />
                                        <h3 className="text-sm font-bold text-gray-900">AMC / Support Coverage</h3>
                                    </div>
                                    {result.amcs.length > 0 ? (
                                        <div className="space-y-3">
                                            {result.amcs.map(amc => (
                                                <div key={amc.id} className="p-3 bg-indigo-50 rounded border border-indigo-100">
                                                    <div className="flex justify-between items-start">
                                                        <p className="text-xs font-bold text-indigo-900 tracking-tight">{amc.contractNumber || 'AMC AGREEMENT'}</p>
                                                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${amc.status === 'ACTIVE' ? 'bg-green-600 text-white' : 'bg-gray-400 text-white'}`}>
                                                            {amc.status}
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] text-indigo-700 mt-1 font-medium">{amc.productName}</p>
                                                    <p className="text-[10px] text-indigo-500 mt-1">
                                                        Valid: {formatDate(amc.startDate)} to {amc.endDate ? formatDate(amc.endDate) : 'Indefinite'}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="h-[84px] flex flex-col items-center justify-center border-2 border-dashed border-gray-100 rounded bg-gray-50">
                                            <p className="text-xs text-gray-400 font-medium">No Active AMC</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right Col: Timeline History */}
                        <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden flex flex-col">
                            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-widest">Item History</h3>
                                <button
                                    onClick={() => window.print()}
                                    className="no-print p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all"
                                >
                                    <Printer className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="p-6 overflow-y-auto max-h-[800px] print:max-h-none relative">
                                {result.history.length === 0 ? (
                                    <p className="text-sm text-gray-500 italic text-center py-4">No events recorded.</p>
                                ) : (
                                    <div className="space-y-6 relative before:absolute before:left-2.5 before:top-0 before:h-full before:w-0.5 before:bg-gray-100">
                                        {result.history.map((log) => (
                                            <div key={log.id} className="relative pl-8">
                                                {/* Dot/Icon */}
                                                <div className={`absolute left-0 top-1 w-5 h-5 rounded-full border-2 border-white shadow-sm flex items-center justify-center z-10 
                                                    ${log.source === 'transaction' ? 'bg-blue-500' : log.source === 'amc' ? 'bg-indigo-500' : 'bg-gray-400'}`}>
                                                    <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                                                </div>
                                                <div className="bg-white border border-gray-100 p-3 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{log.type}</span>
                                                        <span className="text-[10px] font-mono text-gray-400 font-medium">{formatDate(log.date)}</span>
                                                    </div>
                                                    <p className="text-xs text-gray-800 leading-relaxed font-medium">{log.notes}</p>
                                                    <div className="mt-2 text-[9px] text-gray-400 flex items-center gap-1 font-bold">
                                                        <User className="w-2.5 h-2.5" />
                                                        {log.performedBy ? log.performedBy.toUpperCase() : 'SYSTEM'}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <DocumentFooter />
        </div>
    )
}


function ShieldIcon({ status }: { status: string }) {
    if (status === 'ACTIVE') return <CheckCircle className="h-5 w-5 text-green-600" />
    if (status === 'EXPIRED') return <AlertTriangle className="h-5 w-5 text-red-600" />
    return <Clock className="h-5 w-5 text-yellow-600" />
}
