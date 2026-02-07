"use client"

import { useState, useEffect } from "react"
import { Plus, Edit, Trash2, Search } from "lucide-react"
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
    _count?: { invoices: number }
}

export default function CustomersPage() {
    const [customers, setCustomers] = useState<Customer[]>([])
    const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [showModal, setShowModal] = useState(false)
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)

    useEffect(() => {
        fetchCustomers()
    }, [])

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
        try {
            const res = await fetch("/api/customers")
            const data = await res.json()
            setCustomers(data)
            setFilteredCustomers(data)
        } catch (error) {
            console.error(error)
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

    async function handleDelete(customer: Customer) {
        if (!confirm(`Delete customer "${customer.name}"?`)) return

        try {
            const res = await fetch(`/api/customers/${customer.id}`, {
                method: "DELETE"
            })

            if (!res.ok) {
                const json = await res.json()
                alert(json.error || "Failed to delete customer")
                return
            }

            fetchCustomers()
        } catch (error) {
            alert("Failed to delete customer")
        }
    }

    function handleSave() {
        setShowModal(false)
        fetchCustomers()
    }

    return (
        <div className="space-y-6">
            <div className="sm:flex sm:items-center sm:justify-between">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">Customers</h1>
                <button
                    onClick={handleAdd}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Customer
                </button>
            </div>

            {/* Search */}
            <div className="bg-white shadow sm:rounded-lg p-4">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search customers by name, email, or phone..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                </div>
            </div>

            {/* Customers Table */}
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
                {loading ? (
                    <div className="px-4 py-12 text-center text-gray-500">Loading...</div>
                ) : filteredCustomers.length === 0 ? (
                    <div className="px-4 py-12 text-center text-gray-500">
                        {searchQuery ? "No customers found matching your search." : "No customers yet. Add your first customer to get started."}
                    </div>
                ) : (
                    <ul className="divide-y divide-gray-200">
                        {filteredCustomers.map((customer) => (
                            <li key={customer.id} className="px-6 py-4 hover:bg-gray-50">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">
                                            {customer.name}
                                        </p>
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
                                            onClick={() => handleEdit(customer)}
                                            className="p-2 text-gray-400 hover:text-blue-600"
                                            title="Edit customer"
                                        >
                                            <Edit className="h-5 w-5" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(customer)}
                                            className="p-2 text-gray-400 hover:text-red-600"
                                            title="Delete customer"
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
        </div>
    )
}
