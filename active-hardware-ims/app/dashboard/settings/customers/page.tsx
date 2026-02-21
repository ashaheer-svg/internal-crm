"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Plus, Edit, Trash2, Search, Archive, AlertTriangle, Upload } from "lucide-react"
import CustomerFormModal from "./CustomerFormModal"

type Customer = {
    id: string
    name: string
    contactName?: string
    email?: string
    phone?: string
    address?: string
    taxId?: string
    salesRepLegacy?: string
    salesRep?: { name: string }
    salesRepId?: string
    notes?: string
    type: string
    // Roles
    isCustomer: boolean
    isSupplier: boolean
    isPartner: boolean

    isActive: boolean
    _count?: { invoices: number }
}

export default function CustomersPage() {
    const [customers, setCustomers] = useState<Customer[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")

    // Pagination & Filtering State
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalCount, setTotalCount] = useState(0)
    const [limit] = useState(10)
    const [selectedRoles, setSelectedRoles] = useState<string[]>([])

    // Modal State
    const [showModal, setShowModal] = useState(false)
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)

    // Delete State
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [deleteCustomer, setDeleteCustomer] = useState<Customer | null>(null)

    useEffect(() => {
        // Reset to page 1 when search or filters change
        setPage(1)
    }, [search, selectedRoles])

    useEffect(() => {
        fetchCustomers()
    }, [page, search, selectedRoles])

    async function fetchCustomers() {
        setLoading(true)
        try {
            const query = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                search: search,
                roles: selectedRoles.join(',')
            })
            const res = await fetch(`/api/customers?${query}`)
            const data = await res.json()
            setCustomers(data.customers || [])
            setTotalPages(data.totalPages || 1)
            setTotalCount(data.totalCount || 0)
        } catch (error) {
            console.error("Failed to fetch customers", error)
        } finally {
            setLoading(false)
        }
    }

    async function handleSave(savedCustomer: Customer) {
        if (editingCustomer) {
            setCustomers(customers.map(c => c.id === savedCustomer.id ? savedCustomer : c))
        } else {
            setCustomers([...customers, savedCustomer])
        }
        setShowModal(false)
        setEditingCustomer(null)
    }

    function handleEdit(customer: Customer) {
        setEditingCustomer(customer)
        setShowModal(true)
    }

    async function toggleStatus(customer: Customer) {
        try {
            const res = await fetch(`/api/customers/${customer.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !customer.isActive })
            })

            if (res.ok) {
                const updated = await res.json()
                setCustomers(customers.map(c => c.id === updated.id ? updated : c))
            }
        } catch (e) {
            console.error("Failed to toggle status")
        }
    }

    async function handleDelete(hardDelete: boolean) {
        if (!deleteCustomer) return

        try {
            const res = await fetch(`/api/customers/${deleteCustomer.id}?hard=${hardDelete}`, {
                method: 'DELETE'
            })

            if (res.ok) {
                if (hardDelete) {
                    setCustomers(customers.filter(c => c.id !== deleteCustomer.id))
                } else {
                    // Soft delete returns the updated customer
                    const updated = await res.json()
                    setCustomers(customers.map(c => c.id === updated.id ? updated : c))
                }
                setShowDeleteModal(false)
                setDeleteCustomer(null)
            }
        } catch (e) {
            console.error("Failed to delete customer")
        }
    }

    function handleRoleToggle(role: string) {
        setSelectedRoles(prev =>
            prev.includes(role)
                ? prev.filter(r => r !== role)
                : [...prev, role]
        )
    }



    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Partner Management</h1>
                    <p className="text-sm text-gray-500">Manage customers, suppliers, and partners</p>
                </div>
                <div className="flex gap-2">
                    <Link
                        href="/dashboard/settings/customers/import"
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                    >
                        <Upload className="w-4 h-4" />
                        Import
                    </Link>
                    <button
                        onClick={() => {
                            setEditingCustomer(null)
                            setShowModal(true)
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Add Partner
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow border border-gray-200 space-y-4">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search partners..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 rounded-lg border border-gray-200 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-6 pt-2">
                    <span className="text-sm font-medium text-gray-700">Filter by Type:</span>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={selectedRoles.includes('isPartner')}
                            onChange={() => handleRoleToggle('isPartner')}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-600">Partners</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={selectedRoles.includes('isCustomer')}
                            onChange={() => handleRoleToggle('isCustomer')}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-600">End Customers</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={selectedRoles.includes('isSupplier')}
                            onChange={() => handleRoleToggle('isSupplier')}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-600">Suppliers</span>
                    </label>
                </div>
            </div>

            {/* List */}
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
                {loading ? (
                    <div className="p-12 text-center text-gray-500">
                        Loading partners...
                    </div>
                ) : customers.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        No partners found.
                    </div>
                ) : (
                    <>
                        <ul className="divide-y divide-gray-200">
                            {customers.map((customer) => (
                                <li key={customer.id}>
                                    <div className="px-4 py-4 flex items-center justify-between sm:px-6 hover:bg-gray-50">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="text-sm font-medium text-gray-900 truncate">
                                                    {customer.name}
                                                </p>

                                                {/* Role Badges */}
                                                {customer.isPartner && (
                                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-800">
                                                        Partner
                                                    </span>
                                                )}
                                                {customer.isCustomer && (
                                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                                        End Customer
                                                    </span>
                                                )}
                                                {customer.isSupplier && (
                                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                                                        Supplier
                                                    </span>
                                                )}

                                                {!customer.isActive && (
                                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                                        Inactive
                                                    </span>
                                                )}
                                            </div>
                                            <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
                                                {customer.contactName && <span>{customer.contactName}</span>}
                                                {customer.email && <span>{customer.email}</span>}
                                                {customer.phone && <span>{customer.phone}</span>}
                                                {(customer.salesRep?.name || customer.salesRepLegacy) && (
                                                    <span className="flex items-center gap-1 text-indigo-600">
                                                        <span className="text-xs text-gray-400">Rep:</span>
                                                        {customer.salesRep?.name || customer.salesRepLegacy}
                                                    </span>
                                                )}
                                                {customer._count && customer._count.invoices > 0 && (
                                                    <span className="text-blue-600">
                                                        {customer._count.invoices} delivery order(s)
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 ml-4">
                                            <button
                                                onClick={() => toggleStatus(customer)}
                                                className={`p-2 rounded-lg transition-colors ${!customer.isActive ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                                                title={customer.isActive ? "Deactivate" : "Activate"}
                                            >
                                                {customer.isActive ? <Archive className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                                            </button>
                                            <button
                                                onClick={() => handleEdit(customer)}
                                                className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-gray-100 transition-colors"
                                                title="Edit"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setDeleteCustomer(customer)
                                                    setShowDeleteModal(true)
                                                }}
                                                className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                                <div className="flex-1 flex justify-between sm:hidden">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                        className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        Next
                                    </button>
                                </div>
                                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                    <div>
                                        <p className="text-sm text-gray-700">
                                            Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to <span className="font-medium">{Math.min(page * limit, totalCount)}</span> of{' '}
                                            <span className="font-medium">{totalCount}</span> results
                                        </p>
                                    </div>
                                    <div>
                                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                            <button
                                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                                disabled={page === 1}
                                                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                            >
                                                <span className="sr-only">Previous</span>
                                                &larr;
                                            </button>

                                            {Array.from({ length: totalPages }).map((_, i) => (
                                                <button
                                                    key={i + 1}
                                                    onClick={() => setPage(i + 1)}
                                                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${page === i + 1
                                                        ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                                        }`}
                                                >
                                                    {i + 1}
                                                </button>
                                            ))}

                                            <button
                                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                                disabled={page === totalPages}
                                                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                            >
                                                <span className="sr-only">Next</span>
                                                &rarr;
                                            </button>
                                        </nav>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <CustomerFormModal
                    customer={editingCustomer}
                    onSave={handleSave}
                    onClose={() => setShowModal(false)}
                />
            )}

            {/* Delete Modal */}
            {showDeleteModal && deleteCustomer && (
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-sm w-full p-6">
                        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
                            <AlertTriangle className="w-6 h-6 text-red-600" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 text-center mb-2">Delete Partner</h3>
                        <p className="text-sm text-gray-500 text-center mb-6">
                            How do you want to delete <strong>{deleteCustomer.name}</strong>?
                        </p>

                        <div className="space-y-3">
                            <button
                                onClick={() => handleDelete(false)}
                                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-orange-200 bg-orange-50 text-sm font-medium text-orange-700 hover:bg-orange-100 transition-colors"
                            >
                                <Archive className="w-4 h-4" />
                                Soft Delete (Deactivate)
                            </button>
                            <p className="text-xs text-gray-500 text-center">Keeps records but hides from selection</p>

                            <button
                                onClick={() => handleDelete(true)}
                                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-red-600 text-sm font-medium text-white hover:bg-red-700 transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                                Hard Delete (Permanent)
                            </button>
                            <p className="text-xs text-gray-500 text-center">Permanently removes data. Cannot be undone.</p>

                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="w-full inline-flex items-center justify-center px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors mt-2"
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
