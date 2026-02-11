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
    isActive: boolean
    _count?: { invoices: number }
}

export default function CustomersPage() {
    const [customers, setCustomers] = useState<Customer[]>([])
    const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [showModal, setShowModal] = useState(false)
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)

    // Filter states
    const [typeFilter, setTypeFilter] = useState('ALL')
    const [showInactive, setShowInactive] = useState(false)

    // Delete Modal State
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [deleteCustomer, setDeleteCustomer] = useState<Customer | null>(null)

    useEffect(() => {
        fetchCustomers()
    }, [typeFilter, showInactive])

    useEffect(() => {
        if (searchQuery) {
            const filtered = customers.filter(c =>
                c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.phone?.includes(searchQuery)
            )
            setFilteredCustomers(filtered)
        } else {
            setFilteredCustomers(customers)
        }
    }, [searchQuery, customers])

    async function fetchCustomers() {
        setLoading(true)
        try {
            const res = await fetch(`/api/customers?type=${typeFilter}&showInactive=${showInactive}`)
            const data = await res.json()

            if (!res.ok) {
                console.error("Failed to fetch customers:", data.error)
                setCustomers([])
                setFilteredCustomers([])
                return
            }

            if (Array.isArray(data)) {
                setCustomers(data)
                setFilteredCustomers(data)
            } else {
                console.error("Received invalid data format:", data)
                setCustomers([])
                setFilteredCustomers([])
            }
        } catch (error) {
            console.error(error)
            setCustomers([])
            setFilteredCustomers([])
        } finally {
            setLoading(false)
        }
    }

    function handleAdd() {
        setEditingCustomer(null)
        setShowModal(true)
    }

    function handleEdit(customer: Customer) {
        setEditingCustomer(customer)
        setShowModal(true)
    }

    async function handleDelete(hardDelete: boolean) {
        if (!deleteCustomer) return

        try {
            const res = await fetch(`/api/customers/${deleteCustomer.id}?hard=${hardDelete}`, {
                method: "DELETE"
            })

            if (!res.ok) {
                const json = await res.json()
                alert(json.error || "Failed to delete customer")
                return
            }

            fetchCustomers()
            setShowDeleteModal(false)
            setDeleteCustomer(null)
        } catch (error) {
            alert("Failed to delete customer")
        }
    }

    async function toggleStatus(customer: Customer) {
        try {
            const res = await fetch(`/api/customers/${customer.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...customer, isActive: !customer.isActive })
            })
            if (res.ok) fetchCustomers()
        } catch (error) {
            console.error(error)
        }
    }

    function handleSave() {
        setShowModal(false)
        fetchCustomers()
    }

    return (
        <div className="space-y-6">
            <div className="sm:flex sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Partners</h1>
                    <p className="text-sm text-gray-500">Manage Customers, Suppliers, and other Partners</p>
                </div>

                <button
                    onClick={handleAdd}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Partner
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white shadow sm:rounded-lg p-4 space-y-4">
                <div className="flex flex-col sm:flex-row gap-4 justify-between">
                    <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search by name, email, or phone..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                    </div>
                    <div className="flex items-center gap-4">
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="block rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm border"
                        >
                            <option value="ALL">All Types</option>
                            <option value="CUSTOMER">Customers</option>
                            <option value="SUPPLIER">Suppliers</option>
                            <option value="BOTH">Both</option>
                        </select>
                        <label className="flex items-center space-x-2 text-sm text-gray-600">
                            <input
                                type="checkbox"
                                checked={showInactive}
                                onChange={(e) => setShowInactive(e.target.checked)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span>Show Inactive</span>
                        </label>
                    </div>
                </div>
            </div>

            {/* Customers Table */}
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
                {loading ? (
                    <div className="px-4 py-12 text-center text-gray-500">Loading...</div>
                ) : filteredCustomers.length === 0 ? (
                    <div className="px-4 py-12 text-center text-gray-500">
                        {searchQuery ? "No partners found matching your search." : "No partners found."}
                    </div>
                ) : (
                    <ul className="divide-y divide-gray-200">
                        {filteredCustomers.map((customer) => (
                            <li key={customer.id} className={`px-6 py-4 hover:bg-gray-50 ${!customer.isActive ? 'bg-gray-50 opacity-75' : ''}`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-medium text-gray-900 truncate">
                                                {customer.name}
                                            </p>
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                ${customer.type === 'CUSTOMER' ? 'bg-blue-100 text-blue-800' :
                                                    customer.type === 'SUPPLIER' ? 'bg-purple-100 text-purple-800' :
                                                        'bg-gray-100 text-gray-800'}`}>
                                                {customer.type}
                                            </span>
                                            {!customer.isActive && (
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                                    Inactive
                                                </span>
                                            )}
                                        </div>
                                        <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
                                            {customer.email && <span>{customer.email}</span>}
                                            {customer.phone && <span>{customer.phone}</span>}
                                            {customer._count && customer._count.invoices > 0 && (
                                                <span className="text-blue-600">
                                                    {customer._count.invoices} delivery order(s)
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
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
