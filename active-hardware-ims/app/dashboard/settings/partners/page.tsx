"use client"

import { useState, useEffect } from "react"
import { Plus, Search, Trash2, Edit2, Archive, ArchiveRestore, AlertTriangle } from "lucide-react"
import { useRouter } from "next/navigation"

type Partner = {
    id: string
    name: string
    email: string | null
    phone: string | null
    address: string | null
    type: string
    isActive: boolean
}

export default function PartnersPage() {
    const router = useRouter()
    const [partners, setPartners] = useState<Partner[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [showmodal, setShowModal] = useState(false)
    const [editingPartner, setEditingPartner] = useState<Partner | null>(null)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [deletePartner, setDeletePartner] = useState<Partner | null>(null)

    // Form State
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        address: "",
        type: "CUSTOMER"
    })

    useEffect(() => {
        fetchPartners()
    }, [])

    async function fetchPartners() {
        try {
            const res = await fetch("/api/partners")
            if (res.ok) {
                const data = await res.json()
                setPartners(data)
            }
        } catch (error) {
            console.error("Failed to fetch partners", error)
        } finally {
            setLoading(false)
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        try {
            const url = editingPartner
                ? `/api/partners/${editingPartner.id}`
                : "/api/partners"

            const method = editingPartner ? "PUT" : "POST"

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            })

            if (!res.ok) throw new Error("Failed to save partner")

            await fetchPartners()
            closeModal()
        } catch (error) {
            console.error(error)
            alert("Failed to save partner")
        }
    }

    async function handleDelete(hardDelete: boolean) {
        if (!deletePartner) return

        try {
            const res = await fetch(`/api/partners/${deletePartner.id}?hard=${hardDelete}`, {
                method: "DELETE"
            })

            if (!res.ok) throw new Error("Failed to delete")

            await fetchPartners()
            setShowDeleteModal(false)
            setDeletePartner(null)
        } catch (error) {
            console.error(error)
            alert("Failed to delete partner")
        }
    }

    async function toggleStatus(partner: Partner) {
        try {
            const res = await fetch(`/api/partners/${partner.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...partner, isActive: !partner.isActive })
            })
            if (res.ok) fetchPartners()
        } catch (error) {
            console.error(error)
        }
    }

    function openModal(partner?: Partner) {
        if (partner) {
            setEditingPartner(partner)
            setFormData({
                name: partner.name,
                email: partner.email || "",
                phone: partner.phone || "",
                address: partner.address || "",
                type: partner.type
            })
        } else {
            setEditingPartner(null)
            setFormData({
                name: "",
                email: "",
                phone: "",
                address: "",
                type: "CUSTOMER"
            })
        }
        setShowModal(true)
    }

    function closeModal() {
        setShowModal(false)
        setEditingPartner(null)
    }

    const filteredPartners = partners.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.email?.toLowerCase().includes(search.toLowerCase())
    )

    if (loading) return <div>Loading...</div>

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">Partner Management</h1>
                <button
                    onClick={() => openModal()}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Partner
                </button>
            </div>

            {/* Filters */}
            <div className="flex items-center space-x-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="Search partners..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredPartners.map((partner) => (
                            <tr key={partner.id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">{partner.name}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm text-gray-900">{partner.email}</div>
                                    <div className="text-sm text-gray-500">{partner.phone}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                        ${partner.type === 'CUSTOMER' ? 'bg-blue-100 text-blue-800' :
                                            partner.type === 'SUPPLIER' ? 'bg-purple-100 text-purple-800' :
                                                'bg-gray-100 text-gray-800'}`}>
                                        {partner.type}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <button
                                        onClick={() => toggleStatus(partner)}
                                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full cursor-pointer
                                        ${partner.isActive ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-red-100 text-red-800 hover:bg-red-200'}`}
                                    >
                                        {partner.isActive ? 'Active' : 'Inactive'}
                                    </button>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button onClick={() => openModal(partner)} className="text-blue-600 hover:text-blue-900 mr-3">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => {
                                        setDeletePartner(partner)
                                        setShowDeleteModal(true)
                                    }} className="text-red-600 hover:text-red-900">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Create/Edit Modal */}
            {showmodal && (
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-md w-full p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">
                            {editingPartner ? 'Edit Partner' : 'Add New Partner'}
                        </h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Name *</label>
                                <input
                                    type="text"
                                    required
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Type *</label>
                                <select
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                >
                                    <option value="CUSTOMER">Customer</option>
                                    <option value="SUPPLIER">Supplier</option>
                                    <option value="BOTH">Both</option>
                                    <option value="OTHER">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Email</label>
                                <input
                                    type="email"
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Phone</label>
                                <input
                                    type="text"
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Address</label>
                                <textarea
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                />
                            </div>
                            <div className="flex justify-end space-x-3 mt-6">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                                >
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {showDeleteModal && deletePartner && (
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-sm w-full p-6">
                        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
                            <AlertTriangle className="w-6 h-6 text-red-600" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 text-center mb-2">Delete Partner</h3>
                        <p className="text-sm text-gray-500 text-center mb-6">
                            How do you want to delete <strong>{deletePartner.name}</strong>?
                        </p>

                        <div className="space-y-3">
                            <button
                                onClick={() => handleDelete(false)}
                                className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-orange-700 bg-orange-100 hover:bg-orange-200"
                            >
                                <Archive className="w-4 h-4 mr-2" />
                                Soft Delete (Deactivate)
                            </button>
                            <p className="text-xs text-gray-500 text-center">Keeps records but hides from selection</p>

                            <button
                                onClick={() => handleDelete(true)}
                                className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200"
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Hard Delete (Permanent)
                            </button>
                            <p className="text-xs text-gray-500 text-center">Permanently removes data. Cannot be undone.</p>

                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="w-full mt-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
