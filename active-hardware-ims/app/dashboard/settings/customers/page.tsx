"use client"

import { useState, useEffect } from "react"
import { Plus, Edit, Trash2, Search, Archive, AlertTriangle } from "lucide-react"
import CustomerFormModal from "./CustomerFormModal"

type Customer = {
    id: string
    name: string
    contactName?: string
    email?: string
    phone?: string
    address?: string
    taxId?: string
    salesRep?: string
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

    // Modal State
    const [showModal, setShowModal] = useState(false)
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)

    // Delete State
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [deleteCustomer, setDeleteCustomer] = useState<Customer | null>(null)

    useEffect(() => {
        fetchCustomers()
    }, [])

    async function fetchCustomers() {
        try {
            const res = await fetch('/api/customers')
            const data = await res.json()
            setCustomers(data)
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

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.email?.toLowerCase().includes(search.toLowerCase()) ||
        c.contactName?.toLowerCase().includes(search.toLowerCase())
    )

    if (loading) return <div className="p-8 text-center text-gray-500">Loading partners...</div>

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Partner Management</h1>
                    <p className="text-sm text-gray-500">Manage customers, suppliers, and partners</p>
                </div>
                <button
                    onClick={() => {
                        setEditingCustomer(null)
                        setShowModal(true)
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    Add Partner
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search partners..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="block w-full pl-10 rounded-md border-gray-300 border p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
            </div>

            {/* List */}
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
                {filteredCustomers.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        No partners found.
                    </div>
                ) : (
                    <ul className="divide-y divide-gray-200">
                        {filteredCustomers.map((customer) => (
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
                                            className={`p-2 text-gray-400 hover:text-gray-600 ${!customer.isActive ? 'text-green-600 hover:text-green-800' : ''}`}
                                            title={customer.isActive ? "Deactivate" : "Activate"}
                                        >
                                            {customer.isActive ? <Archive className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                                        </button>
                                        <button
                                            onClick={() => handleEdit(customer)}
                                            className="p-2 text-gray-400 hover:text-blue-600"
                                            title="Edit"
                                        >
                                            <Edit className="h-5 w-5" />
                                        </button>
                                        <button
                                            onClick={() => {
                                                setDeleteCustomer(customer)
                                                setShowDeleteModal(true)
                                            }}
                                            className="p-2 text-gray-400 hover:text-red-600"
                                            title="Delete"
                                        >
                                            <Trash2 className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
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
