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

            {/* Table */}
            <div className="overflow-x-auto min-h-[400px]">
                <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50/30">
                        <tr>
                            <th scope="col" className="px-3 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider leading-none">
                                <SortIcon sort={sort} column="projectCode" label="Code" onSort={handleSort} />
                            </th>
                            <th scope="col" className="px-3 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider leading-none">
                                <SortIcon sort={sort} column="title" label="Project Title" onSort={handleSort} />
                            </th>
                            <th scope="col" className="px-3 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider leading-none">
                                <SortIcon sort={sort} column="partner" label="Partner" onSort={handleSort} />
                            </th>
                            <th scope="col" className="px-3 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider leading-none">
                                <SortIcon sort={sort} column="customer" label="Customer" onSort={handleSort} />
                            </th>
                            <th scope="col" className="px-3 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider leading-none">
                                <SortIcon sort={sort} column="salesRep" label="Rep" onSort={handleSort} />
                            </th>
                            <th scope="col" className="px-3 py-3.5 text-right text-xs font-bold text-gray-500 uppercase tracking-wider leading-none">
                                <SortIcon sort={sort} column="value" label="Expected Value" onSort={handleSort} />
                            </th>
                            <th scope="col" className="px-3 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider leading-none">
                                <SortIcon sort={sort} column="stage" label="Current Stage" onSort={handleSort} />
                            </th>
                            <th scope="col" className="px-3 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider leading-none">Updated</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-50">
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td colSpan={8} className="px-3 py-4">
                                        <div className="h-4 bg-gray-50 rounded-lg w-full"></div>
                                    </td>
                                </tr>
                            ))
                        ) : projects.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-6 py-20 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <Package className="h-10 w-10 text-gray-200" />
                                        <p className="text-gray-400 font-medium">No pipeline records discovered</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            projects.map((project) => (
                                <tr
                                    key={project.id}
                                    className="hover:bg-gray-50/50 cursor-pointer transition-colors group"
                                    onClick={() => router.push(`/dashboard/crm/projects/${project.id}`)}
                                >
                                    <td className="px-3 py-4 whitespace-nowrap text-xs font-bold text-gray-900 font-mono tracking-tight">
                                        {project.projectCode}
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 font-medium" title={project.title}>
                                        <div className="flex items-center gap-1.5">
                                            <span className="truncate max-w-[200px]">{project.title}</span>
                                            {project.quotes && project.quotes.length > 0 && (
                                                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap text-xs font-medium text-gray-500 truncate max-w-[120px]" title={project.partner?.name}>
                                        {project.partner?.name || '-'}
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-600 font-medium truncate max-w-[120px]" title={project.customer?.name}>
                                        {project.customer?.name || 'Unknown'}
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap text-xs text-blue-600 font-semibold truncate max-w-[80px]" title={project.salesRep?.name}>
                                        {project.salesRep?.name || '-'}
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold text-right tabular-nums">
                                        {formatCurrency(project.expectedValue, project.currency)}
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap">
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
                                                    READY_FOR_BUILD: { label: 'Ready to Build', icon: Hammer, cls: 'bg-amber-100 text-amber-700 border-amber-200' },
                                                    BUILDING: { label: 'Building', icon: Hammer, cls: 'bg-indigo-100 text-indigo-700 border-indigo-200 animate-pulse' },
                                                    COMPLETED: { label: 'Shipped ✓', icon: Truck, cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
                                                    CANCELLED: { label: 'DO Cancelled', icon: Package, cls: 'bg-red-100 text-red-500 border-red-200 opacity-50' },
                                                }
                                                const { label, icon: Icon, cls } = cfg[s] ?? { label: s, icon: Truck, cls: 'bg-gray-100 text-gray-600' }
                                                return (
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-tight", cls)}>
                                                            <Icon className="w-3 h-3 flex-shrink-0" />
                                                            {label}
                                                        </span>
                                                        {activeDO.orderNumber && <span className="text-[8px] text-gray-400 pl-1 font-mono">#{activeDO.orderNumber}</span>}
                                                    </div>
                                                )
                                            }
                                            if (hasAccepted) {
                                                return (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 text-violet-700 border border-violet-200 uppercase tracking-tight">
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        Approved
                                                    </span>
                                                )
                                            }
                                            const color = project.stage?.color || '#1f2937'
                                            return (
                                                <span className="px-2 py-0.5 inline-flex text-[10px] font-bold rounded-full uppercase tracking-wider border" style={{ backgroundColor: `${color}10`, color, borderColor: `${color}30` }}>
                                                    {project.stage?.name || 'Unknown'}
                                                </span>
                                            )
                                        })()}
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap text-xs font-medium text-gray-400 uppercase tracking-wider">
                                        {new Date(project.updatedAt).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
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
