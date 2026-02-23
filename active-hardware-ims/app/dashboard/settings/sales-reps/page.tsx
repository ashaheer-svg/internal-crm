"use client"

import { useState, useEffect } from "react"
import { Plus, Pencil, Trash2, Search, UserCircle, Phone, Mail } from "lucide-react"
import { useRouter } from "next/navigation"
import { formatDate } from "@/lib/utils"
import BackButton from "@/components/BackButton"

interface SalesRep {
    id: string
    name: string
    email: string | null
    phone: string | null
    isActive: boolean
    createdAt: string
}

export default function SalesRepsPage() {
    const router = useRouter()
    const [salesReps, setSalesReps] = useState<SalesRep[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [currentRep, setCurrentRep] = useState<SalesRep | null>(null)
    const [formData, setFormData] = useState({ name: "", email: "", phone: "" })
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        fetchSalesReps()
    }, [])

    const fetchSalesReps = async () => {
        try {
            const res = await fetch("/api/sales-reps")
            if (res.ok) {
                const data = await res.json()
                setSalesReps(data)
            }
        } catch (error) {
            console.error("Failed to fetch sales reps", error)
        } finally {
            setLoading(false)
        }
    }

    const filteredReps = salesReps.filter(rep =>
        rep.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (rep.email && rep.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (rep.phone && rep.phone.toLowerCase().includes(searchQuery.toLowerCase()))
    )

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
                fetchSalesReps()
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
                        fetchSalesReps()
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
                fetchSalesReps()
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
                fetchSalesReps()
                router.refresh()
            }
        } catch (error) {
            console.error("Error toggling status", error)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <BackButton className="mb-4" />
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Sales Representatives</h1>
                    <p className="text-sm text-gray-500">Manage sales staff linked to Partners and Delivery Orders.</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm"
                >
                    <Plus className="h-4 w-4" />
                    Add Sales Rep
                </button>
            </div>

            <div className="flex items-center space-x-2">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search sales reps..."
                        className="block w-full rounded-lg border border-gray-200 pl-9 pr-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Name</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Contact Info</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Created At</th>
                            <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                                <span className="sr-only">Actions</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="py-10 text-center text-sm text-gray-500">Loading...</td>
                            </tr>
                        ) : filteredReps.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="py-10 text-center text-sm text-gray-500">No sales representatives found</td>
                            </tr>
                        ) : (
                            filteredReps.map((rep) => (
                                <tr key={rep.id} className={rep.isActive ? "" : "bg-gray-50"}>
                                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                                        <div className="flex items-center">
                                            <UserCircle className={`mr-2 h-5 w-5 ${rep.isActive ? "text-blue-500" : "text-gray-400"}`} />
                                            <span className={rep.isActive ? "" : "text-gray-500 italic"}>
                                                {rep.name}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                        <div className="flex flex-col space-y-1">
                                            {rep.email && (
                                                <div className="flex items-center">
                                                    <Mail className="mr-1.5 h-3 w-3" />
                                                    {rep.email}
                                                </div>
                                            )}
                                            {rep.phone && (
                                                <div className="flex items-center">
                                                    <Phone className="mr-1.5 h-3 w-3" />
                                                    {rep.phone}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                                        <button
                                            onClick={() => handleToggleStatus(rep)}
                                            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset cursor-pointer transition-colors ${rep.isActive
                                                ? "bg-green-50 text-green-700 ring-green-600/20 hover:bg-green-100"
                                                : "bg-red-50 text-red-700 ring-red-600/20 hover:bg-red-100"
                                                }`}
                                        >
                                            {rep.isActive ? "Active" : "Inactive"}
                                        </button>
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                        {formatDate(rep.createdAt)}
                                    </td>
                                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                        <button
                                            onClick={() => handleOpenModal(rep)}
                                            className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-gray-100 transition-colors"
                                            title="Edit"
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(rep.id, rep.name)}
                                            className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md bg-white rounded-xl shadow-2xl p-6 transform transition-all">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-gray-900">
                                {currentRep ? "Edit Sales Representative" : "Add New Sales Representative"}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                                <Plus className="h-5 w-5 rotate-45" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="name" className="block text-sm font-semibold text-gray-700">Full Name</label>
                                <input
                                    type="text"
                                    id="name"
                                    required
                                    className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    placeholder="e.g. John Doe"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label htmlFor="email" className="block text-sm font-semibold text-gray-700">Email Address</label>
                                    <input
                                        type="email"
                                        id="email"
                                        className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                        placeholder="john@example.com"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="phone" className="block text-sm font-semibold text-gray-700">Phone Number</label>
                                    <input
                                        type="text"
                                        id="phone"
                                        className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                        placeholder="+1 234 567 890"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end space-x-3 mt-8 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? "Saving..." : currentRep ? "Update Representative" : "Create Representative"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
