"use client"

import { useState, useEffect, useCallback } from "react"
import { FileText, Search, Filter, Clock } from "lucide-react"
import { formatDateTime, cn } from "@/lib/utils"
import BackButton from "@/components/BackButton"
import SortIcon from "@/components/SortIcon"
import PaginationControls from "@/components/PaginationControls"

type AuditLog = {
    id: string
    action: string
    entityType: string
    entityId: string | null
    userName: string
    changes: string | null
    createdAt: string
}

type Meta = {
    total: number
    page: number
    limit: number
    totalPages: number
}

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<AuditLog[]>([])
    const [meta, setMeta] = useState<Meta>({ total: 0, page: 1, limit: 50, totalPages: 1 })
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [debouncedSearch, setDebouncedSearch] = useState("")
    const [actionFilter, setActionFilter] = useState("ALL")
    const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' })

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500)
        return () => clearTimeout(timer)
    }, [searchTerm])

    const fetchLogs = useCallback(async (page: number = 1) => {
        setLoading(true)
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '50',
                search: debouncedSearch,
                action: actionFilter,
                sortKey: sort.key,
                sortDir: sort.direction
            })
            const res = await fetch(`/api/audit-logs?${params}`)
            if (res.ok) {
                const data = await res.json()
                setLogs(data.logs || [])
                setMeta(data.meta || { total: data.logs.length, page: 1, limit: 50, totalPages: 1 })
            }
        } catch (error) {
            console.error('Failed to fetch audit logs:', error)
        } finally {
            setLoading(false)
        }
    }, [debouncedSearch, actionFilter, sort])

    useEffect(() => {
        fetchLogs()
    }, [fetchLogs])

    const handleSort = (key: string) => {
        setSort(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }))
    }

    function getActionBadgeColor(action: string) {
        switch (action) {
            case 'CREATE': return 'bg-green-100 text-green-700 ring-1 ring-green-600/20'
            case 'UPDATE': return 'bg-blue-100 text-blue-700 ring-1 ring-blue-600/20'
            case 'DELETE': return 'bg-red-100 text-red-700 ring-1 ring-red-600/20'
            case 'LOGIN': return 'bg-purple-100 text-purple-700 ring-1 ring-purple-600/20'
            case 'LOGOUT': return 'bg-gray-100 text-gray-700 ring-1 ring-gray-600/20'
            default: return 'bg-gray-100 text-gray-700 ring-1 ring-gray-600/20'
        }
    }

    return (
        <div className="space-y-6 flex flex-col min-h-screen pb-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <BackButton className="mb-4" />
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">System Audit Trail</h1>
                    <p className="text-sm text-gray-500 font-medium">Monitoring all administrative activities and record mutations</p>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by user or entity ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm border-gray-200 rounded-xl focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-400" />
                    <select
                        value={actionFilter}
                        onChange={(e) => setActionFilter(e.target.value)}
                        className="bg-white border-gray-200 rounded-xl text-xs font-bold px-3 py-2 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="ALL">All Actions</option>
                        <option value="CREATE">Create</option>
                        <option value="UPDATE">Update</option>
                        <option value="DELETE">Delete</option>
                        <option value="LOGIN">Login</option>
                        <option value="LOGOUT">Logout</option>
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col flex-1 min-h-[500px]">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-widest leading-none">
                                    <SortIcon sort={sort} column="date" label="Timestamp" onSort={handleSort} />
                                </th>
                                <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-widest leading-none">
                                    <SortIcon sort={sort} column="user" label="User" onSort={handleSort} />
                                </th>
                                <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-widest leading-none">
                                    <SortIcon sort={sort} column="action" label="Action" onSort={handleSort} />
                                </th>
                                <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-widest leading-none">
                                    <SortIcon sort={sort} column="entity" label="Entity" onSort={handleSort} />
                                </th>
                                <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-widest leading-none">Details</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-50">
                            {loading ? (
                                Array.from({ length: 8 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="px-6 py-4">
                                            <div className="h-4 bg-gray-50 rounded-lg w-full"></div>
                                        </td>
                                    </tr>
                                ))
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <FileText className="h-10 w-10 text-gray-200" />
                                            <p className="text-gray-400 font-medium">No audit logs discovered</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                                            {formatDateTime(log.createdAt)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                                            {log.userName}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={cn("px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-tighter", getActionBadgeColor(log.action))}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                            <span className="font-bold text-gray-900">{log.entityType}</span>
                                            {log.entityId && (
                                                <span className="text-gray-400 text-xs ml-1 font-mono">
                                                    #{log.entityId.substring(0, 8)}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            {log.changes ? (
                                                <details className="cursor-pointer group/details">
                                                    <summary className="text-blue-600 hover:text-blue-800 font-bold text-xs uppercase tracking-wider flex items-center gap-1 outline-none list-none">
                                                        <Clock className="w-3 h-3" />
                                                        View Mutations
                                                    </summary>
                                                    <pre className="mt-2 text-[10px] bg-gray-50 p-3 rounded-xl border border-gray-100 overflow-x-auto font-mono text-gray-700 leading-relaxed shadow-inner animate-in slide-in-from-top-1">
                                                        {JSON.stringify(JSON.parse(log.changes), null, 2)}
                                                    </pre>
                                                </details>
                                            ) : (
                                                <span className="text-gray-300 font-medium">-</span>
                                            )}
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
                    onPageChange={(p) => fetchLogs(p)}
                    totalResults={meta.total}
                    limit={meta.limit}
                    className="bg-gray-50/50 border-t border-gray-100"
                />
            </div>
        </div>
    )
}
