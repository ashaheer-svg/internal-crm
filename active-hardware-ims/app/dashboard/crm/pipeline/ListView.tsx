'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ChevronLeft, ChevronRight, Filter, CheckCircle2 } from 'lucide-react'
import { formatCurrency } from '@/lib/format'

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
        deliveryOrder?: { status: string } | null
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

export default function ListView({ scope = 'all', onCanViewAllLoaded }: {
    scope?: 'all' | 'mine'
    onCanViewAllLoaded?: (val: boolean) => void
}) {
    const router = useRouter()
    const [projects, setProjects] = useState<Project[]>([])
    const [meta, setMeta] = useState<Meta>({ total: 0, page: 1, limit: 10, totalPages: 1 })
    const [loading, setLoading] = useState(true)

    // Filters
    const [search, setSearch] = useState('')
    const [status, setStatus] = useState('ALL')
    const [salesRepId, setSalesRepId] = useState('ALL')
    const [hideWon, setHideWon] = useState(false)
    const [hideApproved, setHideApproved] = useState(false)
    const [hideShipped, setHideShipped] = useState(false)

    const [salesReps, setSalesReps] = useState<SalesRep[]>([])

    // Debounce Search
    const [debouncedSearch, setDebouncedSearch] = useState('')

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 500)
        return () => clearTimeout(timer)
    }, [search])

    useEffect(() => {
        // Fetch Sales Reps for filter
        fetch('/api/sales-reps')
            .then(res => res.ok ? res.json() : [])
            .then(data => setSalesReps(Array.isArray(data) ? data : []))
            .catch(() => setSalesReps([]))
    }, [])

    useEffect(() => {
        fetchProjects(1)
    }, [debouncedSearch, status, salesRepId, scope, hideWon, hideApproved, hideShipped])

    async function fetchProjects(page: number) {
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
                hideShipped: hideShipped.toString()
            })

            const res = await fetch(`/api/crm/projects?${params}`)
            if (res.ok) {
                const data = await res.json()
                setProjects(data.projects)
                setMeta(data.meta)
                // Notify parent about view_all capability
                if (typeof data.canViewAll === 'boolean' && onCanViewAllLoaded) {
                    onCanViewAllLoaded(data.canViewAll)
                }
            }
        } catch (error) {
            console.error('Failed to fetch projects', error)
        } finally {
            setLoading(false)
        }
    }

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= meta.totalPages) {
            fetchProjects(newPage)
        }
    }

    return (
        <div className="bg-white rounded-lg shadow border border-gray-200 flex flex-col">
            {/* Toolbar */}
            <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50 rounded-t-lg">
                <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Search projects, customers, reps..."
                        className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500 hidden sm:inline">Rep:</span>
                        <select
                            className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
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
                        <Filter className="w-4 h-4 text-gray-500" />
                        <select
                            className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                        >
                            <option value="ALL">All Status</option>
                            <option value="OPEN">Open</option>
                            <option value="WON">Won</option>
                            <option value="LOST">Lost</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-3 ml-2 border-l pl-4 border-gray-200 py-1">
                        <label className="flex items-center gap-1.5 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={hideWon}
                                onChange={(e) => setHideWon(e.target.checked)}
                                className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-[11px] font-medium text-gray-600 group-hover:text-gray-900 transition-colors">Hide Won</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={hideApproved}
                                onChange={(e) => setHideApproved(e.target.checked)}
                                className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-[11px] font-medium text-gray-600 group-hover:text-gray-900 transition-colors">Hide Approved</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={hideShipped}
                                onChange={(e) => setHideShipped(e.target.checked)}
                                className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-[11px] font-medium text-gray-600 group-hover:text-gray-900 transition-colors">Hide Shipped</span>
                        </label>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0 bg-gray-50 z-10">
                        <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-18">Code</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider max-w-xs">Title</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider max-w-[150px]">Partner</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider max-w-[150px]">Customer</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider max-w-[75px]">Rep</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stage</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i}>
                                    <td colSpan={8} className="px-3 py-2 whitespace-nowrap">
                                        <div className="h-4 bg-gray-100 rounded w-full animate-pulse"></div>
                                    </td>
                                </tr>
                            ))
                        ) : projects.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                                    No projects found matching your criteria.
                                </td>
                            </tr>
                        ) : (
                            projects.map((project) => (
                                <tr
                                    key={project.id}
                                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                                    onClick={() => router.push(`/dashboard/crm/projects/${project.id}`)}
                                >
                                    <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-gray-900">
                                        {project.projectCode}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900 truncate max-w-xs" title={project.title}>
                                        <div className="flex items-center gap-1.5">
                                            {project.title}
                                            {project.quotes && project.quotes.length > 0 && (
                                                <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500 truncate max-w-[150px]" title={project.partner?.name}>
                                        {project.partner?.name || '-'}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500 truncate max-w-[150px]" title={project.customer?.name}>
                                        {project.customer?.name || 'Unknown'}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500 truncate max-w-[100px]" title={project.salesRep?.name}>
                                        {project.salesRep?.name || '-'}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900 font-medium text-right">
                                        {formatCurrency(project.expectedValue, project.currency)}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap">
                                        {(() => {
                                            const quotes = project.quotes || []
                                            const isShipped = quotes.some(q => q.deliveryOrder?.status === 'COMPLETED')
                                            const isApproved = quotes.some(q => q.status === 'APPROVED' || q.status === 'ACCEPTED')

                                            let label = project.stage?.name || 'Unknown'
                                            let color = project.stage?.color || '#1f2937'

                                            if (isShipped) {
                                                label = 'SHIPPED'
                                                color = '#10b981'
                                            } else if (isApproved) {
                                                label = 'APPROVED'
                                                color = '#6366f1'
                                            }

                                            return (
                                                <span
                                                    className="px-2 inline-flex text-[10px] leading-4 font-semibold rounded-full uppercase tracking-wider"
                                                    style={{ backgroundColor: `${color}15`, color: color }}
                                                >
                                                    {label}
                                                </span>
                                            )
                                        })()}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                                        {new Date(project.updatedAt).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 bg-white border-t border-gray-200 flex items-center justify-between rounded-b-lg">
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm text-gray-700">
                            Showing <span className="font-medium">{((meta.page - 1) * meta.limit) + 1}</span> to <span className="font-medium">{Math.min(meta.page * meta.limit, meta.total)}</span> of <span className="font-medium">{meta.total}</span> results
                        </p>
                    </div>
                    <div>
                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                            <button
                                onClick={() => handlePageChange(meta.page - 1)}
                                disabled={meta.page === 1}
                                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <span className="sr-only">Previous</span>
                                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                            </button>
                            <button
                                onClick={() => handlePageChange(meta.page + 1)}
                                disabled={meta.page === meta.totalPages}
                                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <span className="sr-only">Next</span>
                                <ChevronRight className="h-5 w-5" aria-hidden="true" />
                            </button>
                        </nav>
                    </div>
                </div>
            </div>
        </div>
    )
}
