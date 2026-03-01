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

            {/* Header / Column Sorter Bar */}
            <div className="hidden lg:grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50/50 border-b border-gray-100 items-center">
                <div className="col-span-1">
                    <SortIcon sort={sort} column="projectCode" label="Code" onSort={handleSort} />
                </div>
                <div className="col-span-5">
                    <SortIcon sort={sort} column="title" label="Project / Identification" onSort={handleSort} />
                </div>
                <div className="col-span-2">
                    <SortIcon sort={sort} column="value" label="Expected Value" onSort={handleSort} />
                </div>
                <div className="col-span-2">
                    <SortIcon sort={sort} column="stage" label="Status" onSort={handleSort} />
                </div>
                <div className="col-span-2 text-right">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Last Updated</span>
                </div>
            </div>

            {/* List View Container */}
            <div className="flex-1 overflow-y-auto min-h-[500px] divide-y divide-gray-100">
                {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="p-6 space-y-3 animate-pulse">
                            <div className="h-4 bg-gray-50 rounded w-1/4"></div>
                            <div className="h-4 bg-gray-50 rounded w-1/2"></div>
                        </div>
                    ))
                ) : projects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-20 gap-3">
                        <Package className="h-10 w-10 text-gray-200" />
                        <p className="text-gray-400 font-medium tracking-tight">No pipeline records discovered</p>
                    </div>
                ) : (
                    projects.map((project) => (
                        <div
                            key={project.id}
                            onClick={() => router.push(`/dashboard/crm/projects/${project.id}`)}
                            className="p-4 sm:p-6 hover:bg-gray-50 transition-all cursor-pointer group flex flex-col gap-3"
                        >
                            {/* Line 1: Identity & Transactional Info */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <span className="text-xs font-bold text-gray-400 font-mono tracking-tight flex-shrink-0 bg-gray-50 px-2 py-1 rounded">
                                        {project.projectCode}
                                    </span>
                                    <div className="flex items-center gap-2 min-w-0">
                                        <h3 className="text-base font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors" title={project.title}>
                                            {project.title}
                                        </h3>
                                        {project.quotes && project.quotes.length > 0 && (
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 flex-shrink-0 justify-between sm:justify-end">
                                    <div className="text-right">
                                        <div className="text-sm font-bold text-gray-900 tabular-nums">
                                            {formatCurrency(project.expectedValue, project.currency)}
                                        </div>
                                    </div>

                                    {/* Stage / Status Label */}
                                    <div className="w-[120px] sm:w-[140px] flex justify-end">
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
                                                    DRAFT: { label: 'DO: Draft', icon: Package, cls: 'bg-gray-100 text-gray-600 border-gray-200' },
                                                    CONFIRMED: { label: 'DO: Confirmed', icon: CheckCircle2, cls: 'bg-blue-100 text-blue-700 border-blue-200' },
                                                    READY_FOR_BUILD: { label: 'Ready: Build', icon: Hammer, cls: 'bg-amber-100 text-amber-700 border-amber-200' },
                                                    BUILDING: { label: 'Building...', icon: Hammer, cls: 'bg-indigo-100 text-indigo-700 border-indigo-200 animate-pulse' },
                                                    COMPLETED: { label: 'Shipped ✓', icon: Truck, cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
                                                    CANCELLED: { label: 'DO Cancelled', icon: Package, cls: 'bg-red-100 text-red-500 border-red-200 opacity-50' },
                                                }
                                                const { label, icon: Icon, cls } = cfg[s] ?? { label: s, icon: Truck, cls: 'bg-gray-100 text-gray-600' }
                                                return (
                                                    <div className="flex flex-col items-end gap-1">
                                                        <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider", cls)}>
                                                            <Icon className="w-3 h-3 flex-shrink-0" />
                                                            {label}
                                                        </span>
                                                        {activeDO.orderNumber && <span className="text-[10px] text-gray-400 font-mono">#{activeDO.orderNumber}</span>}
                                                    </div>
                                                )
                                            }
                                            if (hasAccepted) {
                                                return (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-violet-50 text-violet-700 border border-violet-100 uppercase tracking-wider">
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        Approved
                                                    </span>
                                                )
                                            }
                                            const color = project.stage?.color || '#1f2937'
                                            return (
                                                <span className="px-3 py-1 inline-flex text-[10px] font-bold rounded-full uppercase tracking-wider border" style={{ backgroundColor: `${color}10`, color, borderColor: `${color}30` }}>
                                                    {project.stage?.name || 'Unknown'}
                                                </span>
                                            )
                                        })()}
                                    </div>
                                </div>
                            </div>

                            {/* Line 2: Relationship & Operational Context */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                                <div className="flex items-center gap-3 text-gray-400 font-medium flex-wrap overflow-hidden">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <span className="text-[10px] font-bold text-gray-300 uppercase tracking-tighter">Customer:</span>
                                        <span className="text-gray-900 font-bold truncate max-w-[200px]">{project.customer?.name}</span>
                                    </div>
                                    <span className="hidden sm:inline text-gray-200">/</span>
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <span className="text-[10px] font-bold text-gray-300 uppercase tracking-tighter">Partner:</span>
                                        <span className="text-gray-600 font-bold truncate max-w-[200px]">{project.partner?.name || 'DIRECT'}</span>
                                    </div>
                                    <span className="hidden sm:inline text-gray-200">/</span>
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <span className="text-[10px] font-bold text-gray-300 uppercase tracking-tighter">Rep:</span>
                                        <span className="text-blue-600 font-bold truncate">{project.salesRep?.name || '-'}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                                    <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wider">Last Activity</span>
                                    <span className="text-gray-400 font-bold uppercase tracking-tighter">
                                        {new Date(project.updatedAt).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <PaginationControls
                currentPage={meta.page}
                totalPages={meta.totalPages}
                onPageChange={fetchProjects}
                totalResults={meta.total}
                limit={meta.limit}
                className="bg-gray-50/50 border-t border-gray-100"
            />
        </div>
    )
}
