"use client"

import { useState, useEffect, useRef } from "react"
import { Search, Plus, ChevronDown } from "lucide-react"
import CustomerFormModal from "@/app/dashboard/settings/customers/CustomerFormModal"

type Customer = {
    id: string
    name: string
    email?: string
    phone?: string
    address?: string
}

type CustomerSelectorProps = {
    onSelect: (customer: Customer | null) => void
    selectedCustomer: Customer | null
}

export default function CustomerSelector({ onSelect, selectedCustomer }: CustomerSelectorProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [customers, setCustomers] = useState<Customer[]>([])
    const [loading, setLoading] = useState(false)
    const [showAddModal, setShowAddModal] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }

        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    useEffect(() => {
        if (isOpen && searchQuery) {
            searchCustomers()
        } else if (isOpen) {
            fetchAllCustomers()
        }
    }, [searchQuery, isOpen])

    async function fetchAllCustomers() {
        setLoading(true)
        try {
            const res = await fetch("/api/customers")
            const data = await res.json()
            setCustomers(data)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    async function searchCustomers() {
        setLoading(true)
        try {
            const res = await fetch(`/api/customers/search?q=${encodeURIComponent(searchQuery)}`)
            const data = await res.json()
            setCustomers(data)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    function handleSelect(customer: Customer) {
        onSelect(customer)
        setIsOpen(false)
        setSearchQuery("")
    }

    function handleClear() {
        onSelect(null)
        setSearchQuery("")
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer
            </label>

            {/* Selected Customer Display */}
            {selectedCustomer ? (
                <div className="flex items-center justify-between p-3 border border-gray-300 rounded-md bg-gray-50">
                    <div>
                        <p className="text-sm font-medium text-gray-900">{selectedCustomer.name}</p>
                        {(selectedCustomer.email || selectedCustomer.phone) && (
                            <p className="text-xs text-gray-500">
                                {[selectedCustomer.email, selectedCustomer.phone].filter(Boolean).join(" • ")}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setIsOpen(true)}
                            className="text-sm text-blue-600 hover:text-blue-700"
                        >
                            Change
                        </button>
                        <button
                            type="button"
                            onClick={handleClear}
                            className="text-sm text-gray-600 hover:text-gray-700"
                        >
                            Clear
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full flex items-center justify-between p-3 border border-gray-300 rounded-md bg-white hover:bg-gray-50 text-left"
                >
                    <span className="text-sm text-gray-500">Select a customer or enter manually</span>
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                </button>
            )}

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-96 rounded-md border border-gray-200 overflow-hidden">
                    {/* Search */}
                    <div className="p-2 border-b border-gray-200">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search customers..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Customer List */}
                    <div className="max-h-64 overflow-y-auto">
                        {loading ? (
                            <div className="px-4 py-8 text-center text-sm text-gray-500">
                                Loading...
                            </div>
                        ) : customers.length === 0 ? (
                            <div className="px-4 py-8 text-center text-sm text-gray-500">
                                No customers found
                            </div>
                        ) : (
                            <ul className="divide-y divide-gray-100">
                                {customers.map((customer) => (
                                    <li key={customer.id}>
                                        <button
                                            type="button"
                                            onClick={() => handleSelect(customer)}
                                            className="w-full px-4 py-3 hover:bg-gray-50 text-left"
                                        >
                                            <p className="text-sm font-medium text-gray-900">
                                                {customer.name}
                                            </p>
                                            {(customer.email || customer.phone) && (
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {[customer.email, customer.phone].filter(Boolean).join(" • ")}
                                                </p>
                                            )}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Add New Customer Link */}
                    <div className="border-t border-gray-200 p-2">
                        <button
                            type="button"
                            onClick={() => setShowAddModal(true)}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md"
                        >
                            <Plus className="h-4 w-4" />
                            Add New Customer
                        </button>
                    </div>
                </div>
            )}

            {showAddModal && (
                <CustomerFormModal
                    onClose={() => setShowAddModal(false)}
                    onSave={(newCustomer) => {
                        onSelect(newCustomer)
                        setShowAddModal(false)
                        setIsOpen(false)
                    }}
                />
            )}
        </div>
    )
}
