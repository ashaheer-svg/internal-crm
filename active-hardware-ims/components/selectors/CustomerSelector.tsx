"use client"

import { useState, useEffect, useRef } from "react"
import { Search, Plus, ChevronDown, X } from "lucide-react"
import CustomerFormModal from "@/app/dashboard/settings/customers/CustomerFormModal"

type Customer = {
    id: string
    name: string
    email?: string
    phone?: string
    address?: string
    salesRepId?: string | null
}

type CustomerSelectorProps = {
    onSelect: (customer: Customer | null) => void
    selectedCustomer: Customer | null
    type?: 'CUSTOMER' | 'SUPPLIER' | 'PARTNER' | 'ALL'
    label?: string
    placeholder?: string
    required?: boolean
    className?: string
}

export default function CustomerSelector({
    onSelect,
    selectedCustomer,
    type,
    label,
    placeholder,
    required = false,
    className = ""
}: CustomerSelectorProps) {
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
            const url = type ? `/api/customers?type=${type}&limit=100` : "/api/customers?limit=100"
            const res = await fetch(url, { cache: 'no-store' })
            if (!res.ok) throw new Error("Failed to fetch customers")
            const data = await res.json()
            setCustomers(Array.isArray(data.customers) ? data.customers : [])
        } catch (error) {
            console.error("Error fetching customers:", error)
            setCustomers([])
        } finally {
            setLoading(false)
        }
    }

    async function searchCustomers() {
        setLoading(true)
        try {
            const baseUrl = `/api/customers/search?q=${encodeURIComponent(searchQuery)}`
            const url = type ? `${baseUrl}&type=${type}` : baseUrl
            const res = await fetch(url, { cache: 'no-store' })
            if (!res.ok) throw new Error("Search failed")
            const data = await res.json()
            setCustomers(Array.isArray(data) ? data : [])
        } catch (error) {
            console.error("Error searching customers:", error)
            setCustomers([])
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

    const displayLabel = label || (type ? (type.charAt(0) + type.slice(1).toLowerCase()) : "Customer")
    const displayPlaceholder = placeholder || `Select ${type ? type.toLowerCase() : "customer"} or enter manually`

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            {label !== null && (
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {displayLabel} {required && <span className="text-red-500">*</span>}
                </label>
            )}

            {/* Selected Customer Display */}
            {selectedCustomer ? (
                <div
                    onClick={() => setIsOpen(true)}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50 shadow-sm transition-all hover:bg-white hover:border-blue-200 cursor-pointer group"
                >
                    <div className="overflow-hidden">
                        <p className="text-sm font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors">{selectedCustomer.name}</p>
                        {(selectedCustomer.email || selectedCustomer.phone) && (
                            <p className="text-xs text-gray-500 truncate mt-0.5">
                                {[selectedCustomer.email, selectedCustomer.phone].filter(Boolean).join(" • ")}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                            Change
                        </span>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleClear();
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Clear selection"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 text-left shadow-sm transition-all focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                >
                    <span className="text-sm text-gray-400">{displayPlaceholder}</span>
                    <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
            )}

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute z-50 mt-2 w-full bg-white shadow-xl max-h-96 rounded-xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in duration-200">
                    {/* Search */}
                    <div className="p-3 border-b border-gray-100">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder={`Search ${type ? type.toLowerCase() + 's' : 'customers'}...`}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Customer List */}
                    <div className="max-h-64 overflow-y-auto custom-scrollbar">
                        {loading ? (
                            <div className="px-4 py-12 text-center">
                                <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-blue-600 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
                                <p className="mt-2 text-sm text-gray-500">Searching...</p>
                            </div>
                        ) : customers.length === 0 ? (
                            <div className="px-4 py-12 text-center">
                                <div className="text-gray-300 mb-2 flex justify-center">
                                    <Search className="h-8 w-8" />
                                </div>
                                <p className="text-sm text-gray-500">No {type ? type.toLowerCase() : 'customer'} found</p>
                            </div>
                        ) : (
                            <ul className="py-1">
                                {customers.map((customer) => (
                                    <li key={customer.id}>
                                        <button
                                            type="button"
                                            onClick={() => handleSelect(customer)}
                                            className="w-full px-4 py-3 hover:bg-blue-50/50 text-left transition-colors border-l-2 border-transparent hover:border-blue-500"
                                        >
                                            <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-600">
                                                {customer.name}
                                            </p>
                                            {(customer.email || customer.phone) && (
                                                <p className="text-xs text-gray-500 mt-0.5">
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
                    <div className="bg-gray-50 border-t border-gray-100 p-2">
                        <button
                            type="button"
                            onClick={() => setShowAddModal(true)}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium text-blue-600 hover:bg-blue-100/50 rounded-lg transition-colors"
                        >
                            <Plus className="h-4 w-4" />
                            Add New {type === 'SUPPLIER' ? 'Supplier' : (type === 'PARTNER' ? 'Partner' : 'Customer')}
                        </button>
                    </div>
                </div>
            )}

            {showAddModal && (
                <CustomerFormModal
                    onClose={() => setShowAddModal(false)}
                    defaultRole={type === 'ALL' ? undefined : type as any}
                    onSave={(data) => {
                        const newCustomer = data.customer || data
                        setCustomers(prev => [newCustomer, ...prev])
                        onSelect(newCustomer)
                        setShowAddModal(false)
                        setIsOpen(false)
                    }}
                />
            )}
        </div>
    )
}
