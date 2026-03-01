'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Filter, CheckCircle2, Truck, Hammer, Package } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'
import SortIcon from '@/components/SortIcon'
import PaginationControls from '@/components/PaginationControls'

interface Project {
    id: string
    projectCode: string
    title: string
    expectedValue: number
    currency: string
    status: string
    customer: { name: string }
    partner: { name: string } | null
    salesRep: { name: string } | null
    stage: { name: string; color: string }
    updatedAt: string
    quotes?: {
        id: string;
        status: string;
        deliveryOrder?: {
            orderNumber?: string;
            status: string;
        } | null
    }[]
}

interface Meta {
    total: number
    page: number
    limit: number
    totalPages: number
}

interface SalesRep {
    id: string
    name: string
}

export default function ListView({
    scope = 'all',
    onCanViewAllLoaded,
    hideWon = false,
    hideApproved = false,
    hideShipped = false,
    doStatus = null
}: {
    scope?: 'all' | 'mine'
    onCanViewAllLoaded?: (val: boolean) => void
    hideWon?: boolean
    hideApproved?: boolean
    hideShipped?: boolean
    doStatus?: string | null
}) {
    const router = useRouter()
    const [projects, setProjects] = useState<Project[]>([])
    const [meta, setMeta] = useState<Meta>({ total: 0, page: 1, limit: 10, totalPages: 1 })
    const [loading, setLoading] = useState(true)
    const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'projectCode', direction: 'desc' })

    // Filters
    const [search, setSearch] = useState('')
    const [status, setStatus] = useState('ALL')
    const [salesRepId, setSalesRepId] = useState('ALL')
    const [salesReps, setSalesReps] = useState<SalesRep[]>([])

    // Debounce Search
    const [debouncedSearch, setDebouncedSearch] = useState('')

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 500)
        return () => clearTimeout(timer)
    }, [search])

    useEffect(() => {
        fetch('/api/sales-reps')
            .then(res => res.ok ? res.json() : [])
            .then(data => setSalesReps(Array.isArray(data) ? data : []))
            .catch(() => setSalesReps([]))
    }, [])

    const fetchProjects = useCallback(async (page: number = 1) => {
        setLoading(true)
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '10',
                search: debouncedSearch,
                status: status,
                salesRepId: salesRepId,
                scope: scope,
                hideWon: hideWon.toString(),
                hideApproved: hideApproved.toString(),
                hideShipped: hideShipped.toString(),
                sortKey: sort.key,
                sortDir: sort.direction,
                ...(doStatus ? { doStatus } : {})
            })

            const res = await fetch(`/api/crm/projects?${params}`)
            if (res.ok) {
                const data = await res.json()
                setProjects(data.projects)
                setMeta(data.meta || { total: data.projects.length, page: 1, limit: 10, totalPages: 1 })
                if (typeof data.canViewAll === 'boolean' && onCanViewAllLoaded) {
                    onCanViewAllLoaded(data.canViewAll)
                }
            }
        } catch (error) {
            console.error('Failed to fetch projects', error)
        } finally {
            setLoading(false)
        }
    }, [debouncedSearch, status, salesRepId, scope, hideWon, hideApproved, hideShipped, doStatus, sort, onCanViewAllLoaded])

    useEffect(() => {
        fetchProjects()
    }, [fetchProjects])

    const handleSort = (key: string) => {
        setSort(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }))
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
            {/* Toolbar */}
            <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center bg-gray-50/50">
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Search projects, customers, partners..."
                        className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Rep</span>
                        <select
                            className="text-xs font-bold border-gray-200 rounded-xl px-3 py-2 bg-white shadow-sm focus:ring-blue-500"
                            value={salesRepId}
                            onChange={(e) => setSalesRepId(e.target.value)}
                        >
                            <option value="ALL">All Reps</option>
                            {salesReps.map(rep => (
                                <option key={rep.id} value={rep.id}>{rep.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <Filter className="w-3.5 h-3.5 text-gray-400" />
                        <select
                            className="text-xs font-bold border-gray-200 rounded-xl px-3 py-2 bg-white shadow-sm focus:ring-blue-500"
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                        >
                            <option value="ALL">All Status</option>
                            <option value="OPEN">Open</option>
                            <option value="WON">Won</option>
                            <option value="LOST">Lost</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Header / Column Sorter Bar - Styled as active buttons */}
            <div className="hidden lg:flex items-center gap-2 px-6 py-4 bg-gray-50/20 border-b border-gray-100 overflow-x-auto">
                <SortIcon sort={sort} column="projectCode" label="Code" onSort={handleSort} />
                <SortIcon sort={sort} column="title" label="Project / Identification" onSort={handleSort} />
                <SortIcon sort={sort} column="value" label="Expected Value" onSort={handleSort} />
                <SortIcon sort={sort} column="stage" label="Status" onSort={handleSort} />
                <div className="ml-auto pr-2">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Last Updated</span>
                </div>
            </div>

            {/* List View Container */}
            <div className="flex-1 overflow-y-auto min-h-[500px] p-4 sm:p-5 bg-gray-50/30">
                {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="mb-4 bg-white rounded-2xl p-5 shadow-sm border border-gray-100 animate-pulse">
                            <div className="flex justify-between items-start mb-4">
                                <div className="h-6 bg-gray-50 rounded w-1/2"></div>
                                <div className="h-6 bg-gray-50 rounded w-1/4"></div>
                            </div>
                            <div className="grid grid-cols-4 gap-4">
                                <div className="h-8 bg-gray-50 rounded"></div>
                                <div className="h-8 bg-gray-50 rounded"></div>
                                <div className="h-8 bg-gray-50 rounded"></div>
                                <div className="h-8 bg-gray-50 rounded"></div>
                            </div>
                        </div>
                    ))
                ) : projects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-20 gap-3">
                        <Package className="h-10 w-10 text-gray-200" />
                        <p className="text-gray-400 font-medium tracking-tight">No pipeline records discovered</p>
                    </div>
                ) : (
                    <div className="space-y-3 max-w-7xl mx-auto">
                        {projects.map((project) => (
                            <div
                                key={project.id}
                                onClick={() => router.push(`/dashboard/crm/projects/${project.id}`)}
                                className="group relative bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200/50 transition-all cursor-pointer flex flex-col gap-4"
                            >
                                {/* Row 1: High Prominence identity & Financials */}
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="flex items-baseline gap-2 min-w-0">
                                            <span className="text-lg font-extrabold text-gray-900 tracking-tight font-mono whitespace-nowrap">
                                                {project.projectCode}
                                            </span>
                                            <span className="text-gray-200 text-xl font-light">|</span>
                                            <h3 className="text-base font-bold text-gray-800 truncate group-hover:text-blue-600 transition-colors" title={project.title}>
                                                {project.title}
                                            </h3>
                                        </div>
                                        {project.quotes && project.quotes.length > 0 && (
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                        )}
                                    </div>

                                    <div className="flex items-center gap-5 flex-shrink-0">
                                        <div className="text-right">
                                            <div className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest leading-none mb-1">Expected Value</div>
                                            <div className="text-xl font-black text-gray-900 tabular-nums tracking-tighter">
                                                {formatCurrency(project.expectedValue, project.currency)}
                                            </div>
                                        </div>

                                        {/* Status Badge */}
                                        <div className="min-w-[110px] flex justify-end">
                                            {(() => {
                                                const quotes = project.quotes || []
                                                const doStatusPriority: Record<string, number> = {
                                                    COMPLETED: 6,
                                                    BUILDING: 5,
                                                    READY_FOR_BUILD: 4,
                                                    CONFIRMED: 3,
                                                    DRAFT: 2,
                                                    CANCELLED: 0
                                                }
                                                const allDOs = quotes.map(q => q.deliveryOrder).filter(Boolean) as { orderNumber?: string; status: string }[]
                                                const activeDO = allDOs.filter(d => d.status !== 'CANCELLED').sort((a, b) => (doStatusPriority[b.status] ?? 0) - (doStatusPriority[a.status] ?? 0))[0]
                                                const hasAccepted = quotes.some(q => q.status === 'APPROVED' || q.status === 'ACCEPTED')

                                                if (activeDO) {
                                                    const s = activeDO.status
                                                    const cfg: Record<string, { label: string; icon: any; cls: string }> = {
                                                        DRAFT: { label: 'DO: Draft', icon: Package, cls: 'bg-gray-100 text-gray-700 border-gray-200' },
                                                        CONFIRMED: { label: 'DO: Confirmed', icon: CheckCircle2, cls: 'bg-blue-50 text-blue-700 border-blue-100' },
                                                        READY_FOR_BUILD: { label: 'Ready: Build', icon: Hammer, cls: 'bg-amber-50 text-amber-700 border-amber-100' },
                                                        BUILDING: { label: 'Building...', icon: Hammer, cls: 'bg-indigo-50 text-indigo-700 border-indigo-100 animate-pulse' },
                                                        COMPLETED: { label: 'Shipped ✓', icon: Truck, cls: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
                                                        CANCELLED: { label: 'DO Cancelled', icon: Package, cls: 'bg-red-100 text-red-500 border-red-200 opacity-50' },
                                                    }
                                                    const { label, icon: Icon, cls } = cfg[s] ?? { label: s, icon: Truck, cls: 'bg-gray-100 text-gray-700' }
                                                    return (
                                                        <span className={cn("inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-[11px] font-bold border uppercase tracking-wider shadow-sm", cls)}>
                                                            <Icon className="w-3 h-3 flex-shrink-0" />
                                                            {label}
                                                        </span>
                                                    )
                                                }
                                                if (hasAccepted) {
                                                    return (
                                                        <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-[11px] font-bold bg-violet-50 text-violet-700 border border-violet-100 shadow-sm uppercase tracking-wider">
                                                            <CheckCircle2 className="w-3 h-3" />
                                                            Approved
                                                        </span>
                                                    )
                                                }
                                                const color = project.stage?.color || '#1f2937'
                                                return (
                                                    <span className="px-3.5 py-1.5 inline-flex text-[11px] font-bold rounded-xl shadow-sm uppercase tracking-wider border" style={{ backgroundColor: `${color}15`, color, borderColor: `${color}30` }}>
                                                        {project.stage?.name || 'Unknown'}
                                                    </span>
                                                )
                                            })()}
                                        </div>
                                    </div>
                                </div>

                                {/* Row 2: Structured Metadata with Identifiers */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end pt-4 border-t border-gray-50 mt-0.5">
                                    {/* Customer */}
                                    <div className="flex items-center gap-3 min-w-0 relative">
                                        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-xs flex-shrink-0 shadow-inner border border-blue-100/30">
                                            {project.customer?.name?.charAt(0) || 'C'}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Customer Name</span>
                                            <span className="text-[13px] text-gray-900 font-bold truncate" title={project.customer?.name}>
                                                {project.customer?.name}
                                            </span>
                                        </div>
                                        <div className="hidden md:block absolute -right-2 top-0 bottom-0 w-px bg-gray-100/80" />
                                    </div>

                                    {/* Partner */}
                                    <div className="flex items-center gap-3 min-w-0 relative sm:pl-2">
                                        <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 font-bold text-xs flex-shrink-0 shadow-inner border border-purple-100/30">
                                            {project.partner?.name?.charAt(0) || project.customer?.name?.charAt(0) || 'P'}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Partner Name</span>
                                            <span className="text-[13px] text-gray-700 font-bold truncate" title={project.partner?.name}>
                                                {project.partner?.name || 'DIRECT'}
                                            </span>
                                        </div>
                                        <div className="hidden md:block absolute -right-2 top-0 bottom-0 w-px bg-gray-100/80" />
                                    </div>

                                    {/* Sales Rep */}
                                    <div className="flex items-center gap-3 min-w-0 relative sm:pl-2">
                                        <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold text-xs flex-shrink-0 shadow-inner border border-emerald-100/30">
                                            {project.salesRep?.name?.charAt(0) || 'S'}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Sales Rep</span>
                                            <span className="text-[13px] text-gray-700 font-bold truncate" title={project.salesRep?.name}>
                                                {project.salesRep?.name || '-'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Timestamp */}
                                    <div className="flex flex-col items-end gap-1 ml-auto">
                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">Last Updated</span>
                                        <span className="text-[11px] text-gray-400 font-bold uppercase tracking-tighter">
                                            {new Date(project.updatedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <PaginationControls
                currentPage={meta.page}
                totalPages={meta.totalPages}
                onPageChange={fetchProjects}
                totalResults={meta.total}
                limit={meta.limit}
                className="bg-white border-t border-gray-100"
            />
        </div>
    )
}
