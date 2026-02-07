"use client"

import { useState, useEffect } from "react"
import { FileText, Search, Download, Filter } from "lucide-react"

type AuditLog = {
    id: string
    action: string
    entityType: string
    entityId: string | null
    userName: string
    changes: string | null
    createdAt: string
}

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<AuditLog[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState("")
    const [actionFilter, setActionFilter] = useState("ALL")

    useEffect(() => {
        fetchLogs()
    }, [])

    async function fetchLogs() {
        try {
            const res = await fetch('/api/audit-logs')
            if (res.ok) {
                const data = await res.json()
                setLogs(data.logs || [])
            }
        } catch (error) {
            console.error('Failed to fetch audit logs:', error)
        } finally {
            setLoading(false)
        }
    }

    const filteredLogs = logs.filter(log => {
        const matchesSearch = filter === "" ||
            log.userName.toLowerCase().includes(filter.toLowerCase()) ||
            log.entityType.toLowerCase().includes(filter.toLowerCase())
        const matchesAction = actionFilter === "ALL" || log.action === actionFilter
        return matchesSearch && matchesAction
    })

    function getActionBadgeColor(action: string) {
        switch (action) {
            case 'CREATE': return 'bg-green-100 text-green-800'
            case 'UPDATE': return 'bg-blue-100 text-blue-800'
            case 'DELETE': return 'bg-red-100 text-red-800'
            case 'LOGIN': return 'bg-purple-100 text-purple-800'
            case 'LOGOUT': return 'bg-gray-100 text-gray-800'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-gray-500">Loading audit logs...</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
                    <p className="text-sm text-gray-600 mt-1">Track all system activities and changes</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            <Search className="inline h-4 w-4 mr-1" />
                            Search
                        </label>
                        <input
                            type="text"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            placeholder="Search by user or entity..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            <Filter className="inline h-4 w-4 mr-1" />
                            Action
                        </label>
                        <select
                            value={actionFilter}
                            onChange={(e) => setActionFilter(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
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
            </div>

            {/* Logs Table */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entity</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredLogs.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                    <FileText className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                                    <p>No audit logs found</p>
                                </td>
                            </tr>
                        ) : (
                            filteredLogs.map((log) => (
                                <tr key={log.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {new Date(log.createdAt).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {log.userName}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getActionBadgeColor(log.action)}`}>
                                            {log.action}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {log.entityType}
                                        {log.entityId && (
                                            <span className="text-gray-500 text-xs ml-1">
                                                ({log.entityId.substring(0, 8)}...)
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {log.changes ? (
                                            <details className="cursor-pointer">
                                                <summary className="text-blue-600 hover:text-blue-800">View changes</summary>
                                                <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                                                    {JSON.stringify(JSON.parse(log.changes), null, 2)}
                                                </pre>
                                            </details>
                                        ) : (
                                            <span className="text-gray-400">-</span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Summary */}
            <div className="text-sm text-gray-600">
                Showing {filteredLogs.length} of {logs.length} audit logs
            </div>
        </div>
    )
}
