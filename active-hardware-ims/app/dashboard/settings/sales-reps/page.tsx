"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Pencil, Trash2, Search, UserCircle, Phone, Mail, UserPlus } from "lucide-react"
import { useRouter } from "next/navigation"
import { formatDate, cn } from "@/lib/utils"
import BackButton from "@/components/BackButton"
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

export default function SalesRepsPage() {
    const router = useRouter()
    const [salesReps, setSalesReps] = useState<SalesRep[]>([])
    const [meta, setMeta] = useState<Meta>({ total: 0, page: 1, limit: 10, totalPages: 1 })
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [debouncedSearch, setDebouncedSearch] = useState("")
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [currentRep, setCurrentRep] = useState<SalesRep | null>(null)
    const [formData, setFormData] = useState({ name: "", email: "", phone: "" })
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' })

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500)
        return () => clearTimeout(timer)
    }, [searchTerm])

    const fetchSalesReps = useCallback(async (page: number = 1) => {
        setLoading(true)
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '10',
                search: debouncedSearch,
                sortKey: sort.key,
                sortDir: sort.direction
            })
            const res = await fetch(`/api/sales-reps?${params}`)
            if (res.ok) {
                const data = await res.json()
                // handle both cases where API might return array or object with meta
                if (Array.isArray(data)) {
                    setSalesReps(data)
                    setMeta({ total: data.length, page: 1, limit: 10, totalPages: 1 })
                } else {
                    setSalesReps(data.salesReps || [])
                    setMeta(data.meta || { total: data.salesReps.length, page: 1, limit: 10, totalPages: 1 })
                }
            }
        } catch (error) {
            console.error("Failed to fetch sales reps", error)
        } finally {
            setLoading(false)
        }
    }, [debouncedSearch, sort])

    useEffect(() => {
        fetchSalesReps()
    }, [fetchSalesReps])

    const handleSort = (key: string) => {
        setSort(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }))
    }

    const handleOpenModal = (rep?: SalesRep) => {
        if (rep) {
            setCurrentRep(rep)
            setFormData({
                name: rep.name,
                email: rep.email || "",
                phone: rep.phone || ""
            })
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
            const url = currentRep
                ? `/api/sales-reps/${currentRep.id}`
                : "/api/sales-reps"

            const method = currentRep ? "PATCH" : "POST"

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            })

            if (res.ok) {
                setIsModalOpen(false)
                fetchSalesReps(meta.page)
                router.refresh()
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
                    const res = await fetch(`/api/sales-reps/${id}?type=soft`, {
                        method: "DELETE",
                    })
                    if (res.ok) {
                        fetchSalesReps(meta.page)
                        router.refresh()
                    } else {
                        const data = await res.json()
                        alert(data.error || "Failed to deactivate")
                    }
                } catch (error) {
                    console.error("Error deactivating", error)
                }
            }
            return
        }

        try {
            const res = await fetch(`/api/sales-reps/${id}?type=hard`, {
                method: "DELETE",
            })

            if (res.ok) {
                fetchSalesReps(meta.page)
                router.refresh()
            } else {
                const data = await res.json()
                alert(data.error || "Failed to delete")
            }
        } catch (error) {
            console.error("Error deleting", error)
        }
    }

    const handleToggleStatus = async (rep: SalesRep) => {
        try {
            const res = await fetch(`/api/sales-reps/${rep.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: !rep.isActive }),
            })
            if (res.ok) {
                fetchSalesReps(meta.page)
                router.refresh()
            }
        } catch (error) {
            console.error("Error toggling status", error)
        }
    }

    return (
        <div className="space-y-6 flex flex-col min-h-screen pb-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <BackButton className="mb-4" />
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Sales Force Management</h1>
                    <p className="text-sm text-gray-500 font-medium">Coordinate field representatives and track partner ownership</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95 text-sm font-bold w-fit"
                >
                    <UserPlus className="h-4 w-4" />
                    Add Sales Rep
                </button>
            </div>

            {/* Search Bar */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search representatives by name, email or phone..."
                        className="w-full pl-9 pr-4 py-2.5 text-sm border-gray-200 rounded-xl focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col flex-1 min-h-[400px]">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-widest leading-none">
                                    <SortIcon sort={sort} column="name" label="Representative" onSort={handleSort} />
                                </th>
                                <th scope="col" className="px-3 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-widest leading-none">Contact Info</th>
                                <th scope="col" className="px-3 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-widest leading-none">
                                    <SortIcon sort={sort} column="status" label="Status" onSort={handleSort} />
                                </th>
                                <th scope="col" className="px-3 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-widest leading-none">
                                    <SortIcon sort={sort} column="createdAt" label="Onboarding Date" onSort={handleSort} />
                                </th>
                                <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                                    <span className="sr-only">Actions</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 bg-white">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="px-6 py-4">
                                            <div className="h-4 bg-gray-50 rounded-lg w-full"></div>
                                        </td>
                                    </tr>
                                ))
                            ) : salesReps.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <UserCircle className="h-10 w-10 text-gray-200" />
                                            <p className="text-gray-400 font-medium">No sales representatives listed</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                salesReps.map((rep) => (
                                    <tr key={rep.id} className={cn("hover:bg-gray-50/50 transition-colors group", !rep.isActive && "bg-gray-50/30")}>
                                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-bold text-gray-900 sm:pl-6">
                                            <div className="flex items-center">
                                                <div className={cn(
                                                    "w-8 h-8 rounded-lg flex items-center justify-center mr-3 border shadow-sm transition-colors",
                                                    rep.isActive ? "bg-blue-50 border-blue-100 text-blue-600" : "bg-gray-100 border-gray-200 text-gray-400"
                                                )}>
                                                    <UserCircle className="h-5 w-5" />
                                                </div>
                                                <span className={cn(rep.isActive ? "text-gray-900" : "text-gray-400 italic")}>
                                                    {rep.name}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-600">
                                            <div className="flex flex-col space-y-1">
                                                {rep.email && (
                                                    <div className="flex items-center gap-1.5 transition-colors hover:text-blue-600">
                                                        <Mail className="h-3.5 w-3.5 text-gray-400" />
                                                        {rep.email}
                                                    </div>
                                                )}
                                                {rep.phone && (
                                                    <div className="flex items-center gap-1.5 transition-colors hover:text-blue-600">
                                                        <Phone className="h-3.5 w-3.5 text-gray-400" />
                                                        {rep.phone}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                                            <button
                                                onClick={() => handleToggleStatus(rep)}
                                                className={cn(
                                                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-tighter border transition-all",
                                                    rep.isActive
                                                        ? "bg-green-50 text-green-700 border-green-600/20 hover:bg-green-100"
                                                        : "bg-red-50 text-red-700 border-red-600/20 hover:bg-red-100"
                                                )}
                                            >
                                                {rep.isActive ? "Active" : "Inactive"}
                                            </button>
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                                            {formatDate(rep.createdAt)}
                                        </td>
                                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right sm:pr-6">
                                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleOpenModal(rep)}
                                                    className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all shadow-sm active:scale-95"
                                                    title="Edit"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(rep.id, rep.name)}
                                                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all shadow-sm active:scale-95"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
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

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 border border-gray-100 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                                {currentRep ? "Update Representative" : "New Team Member"}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                                <Plus className="h-5 w-5 rotate-45" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label htmlFor="name" className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Full Name</label>
                                <input
                                    type="text"
                                    id="name"
                                    required
                                    className="block w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    placeholder="e.g. John Doe"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label htmlFor="email" className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Email Address</label>
                                <input
                                    type="email"
                                    id="email"
                                    className="block w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    placeholder="john@example.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div>
                                <label htmlFor="phone" className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Phone Number</label>
                                <input
                                    type="text"
                                    id="phone"
                                    className="block w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    placeholder="+1 234 567 890"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                            <div className="flex gap-3 mt-10 pt-6 border-t border-gray-50">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-4 py-3 rounded-2xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all active:scale-95"
                                >
                                    Discard
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-2 px-8 py-3 bg-blue-600 text-white text-sm font-bold rounded-2xl shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-95"
                                >
                                    {isSubmitting ? "Processing..." : currentRep ? "Save Changes" : "Create Profile"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
