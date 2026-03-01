"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Pencil, Trash2, Search, UserCircle, Phone, Mail, RefreshCw } from "lucide-react"
import { formatDate, cn } from "@/lib/utils"
import SortIcon from "@/components/SortIcon"
import PaginationControls from "@/components/PaginationControls"

interface SalesRep {
    id: string
    name: string
    email: string | null
    phone: string | null
    isActive: boolean
    createdAt: string
}

interface Meta {
    total: number
    page: number
    limit: number
    totalPages: number
}

export default function SalesRepsTab() {
    const [salesReps, setSalesReps] = useState<SalesRep[]>([])
    const [meta, setMeta] = useState<Meta>({ total: 0, page: 1, limit: 10, totalPages: 1 })
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [currentRep, setCurrentRep] = useState<SalesRep | null>(null)
    const [formData, setFormData] = useState({ name: "", email: "", phone: "" })
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' })

    const fetchSalesReps = useCallback(async (page: number) => {
        setLoading(true)
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: meta.limit.toString(),
                search: searchQuery,
                sortKey: sortConfig.key,
                sortDir: sortConfig.direction
            })
            const res = await fetch(`/api/sales-reps?${params}`)
            if (res.ok) {
                const data = await res.json()
                setSalesReps(data.salesReps || [])
                setMeta(data.meta || { total: data.length || 0, page: 1, limit: 10, totalPages: 1 })
            }
        } catch (error) {
            console.error("Failed to fetch sales reps", error)
        } finally {
            setLoading(false)
        }
    }, [searchQuery, sortConfig, meta.limit])

    useEffect(() => {
        const timer = setTimeout(() => fetchSalesReps(1), 500)
        return () => clearTimeout(timer)
    }, [fetchSalesReps])

    const handleSort = (key: string) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }))
    }

    const handleOpenModal = (rep?: SalesRep) => {
        if (rep) {
            setCurrentRep(rep)
            setFormData({ name: rep.name, email: rep.email || "", phone: rep.phone || "" })
        } else {
            setCurrentRep(null)
            setFormData({ name: "", email: "", phone: "" })
        }
        setIsModalOpen(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        try {
            const url = currentRep ? `/api/sales-reps/${currentRep.id}` : "/api/sales-reps"
            const method = currentRep ? "PATCH" : "POST"
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            })
            if (res.ok) {
                setIsModalOpen(false)
                fetchSalesReps(meta.page)
            } else {
                const data = await res.json()
                alert(data.error || "Failed to save sales representative")
            }
        } catch (error) {
            console.error("Error saving sales rep", error)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDelete = async (id: string, name: string) => {
        const type = confirm(`Do you want to PERMANENTLY delete ${name}?\n\nOK = Permanent Delete (only if no orders/customers exist)\nCancel = Soft Delete (Deactivate)`)
            ? "hard"
            : null

        if (type === null) {
            if (confirm(`Deactivate ${name}?`)) {
                try {
                    const res = await fetch(`/api/sales-reps/${id}?type=soft`, { method: "DELETE" })
                    if (res.ok) fetchSalesReps(meta.page)
                    else { const data = await res.json(); alert(data.error || "Failed to deactivate") }
                } catch (error) { console.error("Error deactivating", error) }
            }
            return
        }

        try {
            const res = await fetch(`/api/sales-reps/${id}?type=hard`, { method: "DELETE" })
            if (res.ok) fetchSalesReps(meta.page)
            else { const data = await res.json(); alert(data.error || "Failed to delete") }
        } catch (error) { console.error("Error deleting", error) }
    }

    const handleToggleStatus = async (rep: SalesRep) => {
        try {
            const res = await fetch(`/api/sales-reps/${rep.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: !rep.isActive }),
            })
            if (res.ok) fetchSalesReps(meta.page)
        } catch (error) { console.error("Error toggling status", error) }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex-1">
                    <h3 className="text-sm font-bold text-gray-900 mb-1">Human Resource Protocol</h3>
                    <p className="text-xs text-gray-500 leading-relaxed">Manage sales staff credentials and operational status. Reps are linked to procurement cycles and partner relations.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => fetchSalesReps(meta.page)}
                        className="p-2.5 rounded-xl border border-gray-200 bg-white text-gray-500 hover:text-gray-900 transition-all hover:bg-gray-50"
                        title="Refresh list"
                    >
                        <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
                    </button>
                    <button
                        onClick={() => handleOpenModal()}
                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-95 text-sm font-bold px-8"
                    >
                        <Plus className="w-5 h-5" />
                        Add New Representative
                    </button>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name, email, or phone…"
                        className="w-full pl-10 pr-4 py-2 text-sm border-gray-200 rounded-xl focus:ring-blue-500 shadow-sm transition-all outline-none"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th className="px-6 py-4 text-left">
                                    <SortIcon sort={sortConfig} column="name" label="Identity" onSort={handleSort} />
                                </th>
                                <th className="px-6 py-4 text-left">
                                    <SortIcon sort={sortConfig} column="contact" label="Digital Reach" onSort={handleSort} />
                                </th>
                                <th className="px-6 py-4 text-left">
                                    <SortIcon sort={sortConfig} column="isActive" label="Authorization" onSort={handleSort} />
                                </th>
                                <th className="px-6 py-4 text-left">
                                    <SortIcon sort={sortConfig} column="createdAt" label="Onboarding Date" onSort={handleSort} />
                                </th>
                                <th className="px-6 py-4 text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest">Operations</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading && salesReps.length === 0 ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="px-6 py-6"><div className="h-4 bg-gray-50 rounded-lg w-full" /></td>
                                    </tr>
                                ))
                            ) : salesReps.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center">
                                        <UserCircle className="w-12 h-12 mx-auto mb-4 text-gray-200" />
                                        <p className="text-gray-400 font-medium">No sales representatives found in registry</p>
                                    </td>
                                </tr>
                            ) : (
                                salesReps.map((rep) => (
                                    <tr key={rep.id} className={cn("hover:bg-gray-50/50 transition-all group", !rep.isActive && "bg-gray-50/30")}>
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-bold shadow-sm border",
                                                    rep.isActive ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-gray-100 text-gray-400 border-gray-200"
                                                )}>
                                                    {rep.name.charAt(0).toUpperCase()}
                                                </div>
                                                <span className={cn("text-sm font-bold transition-colors", rep.isActive ? "text-gray-900" : "text-gray-400 line-through italic")}>
                                                    {rep.name}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            <div className="flex flex-col gap-1">
                                                {rep.email && (
                                                    <div className="flex items-center gap-2 text-xs font-medium text-gray-600">
                                                        <Mail className="w-3.5 h-3.5 text-gray-400" />
                                                        {rep.email}
                                                    </div>
                                                )}
                                                {rep.phone && (
                                                    <div className="flex items-center gap-2 text-xs font-medium text-gray-600">
                                                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                                                        {rep.phone}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            <button
                                                onClick={() => handleToggleStatus(rep)}
                                                className={cn(
                                                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all",
                                                    rep.isActive
                                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                                        : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                                                )}
                                            >
                                                {rep.isActive ? "Authorized" : "Deactivated"}
                                            </button>
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap font-mono text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                                            {formatDate(rep.createdAt)}
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap text-right space-x-1">
                                            <button onClick={() => handleOpenModal(rep)} className="p-2 rounded-xl text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all">
                                                <Pencil className="h-4 w-4" />
                                            </button>
                                            <button onClick={() => handleDelete(rep.id, rep.name)} className="p-2 rounded-xl text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-all">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
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
                    onPageChange={fetchSalesReps}
                    totalResults={meta.total}
                    limit={meta.limit}
                    className="bg-gray-50/50 border-t border-gray-100"
                />
            </div>

            {/* Add / Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 transform transition-all animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                                    {currentRep ? "Modify Personnel Record" : "New Personnel Admission"}
                                </h2>
                                <p className="text-xs text-gray-500 mt-1 font-medium italic">All fields are recorded for audit purposes.</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-xl text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-all">
                                <Plus className="h-6 w-6 rotate-45" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-1.5">
                                <label htmlFor="sr-name" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Full Legal Name</label>
                                <input type="text" id="sr-name" required
                                    className="block w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    placeholder="e.g. Alexander Pierce"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label htmlFor="sr-email" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Email Communication</label>
                                <input type="email" id="sr-email"
                                    className="block w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    placeholder="alex@enterprise.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label htmlFor="sr-phone" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Telephonic Contact</label>
                                <input type="text" id="sr-phone"
                                    className="block w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    placeholder="+1 (555) 012-3456"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                            <div className="flex gap-3 mt-10 pt-6 border-t border-gray-50">
                                <button type="button" onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-500 hover:bg-gray-50 transition-all">
                                    Cancel
                                </button>
                                <button type="submit" disabled={isSubmitting}
                                    className="flex-3 px-8 py-3 rounded-xl bg-blue-600 text-sm font-bold text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50">
                                    {isSubmitting ? "Processing…" : currentRep ? "Update Admission" : "Finalize Admission"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
