"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Plus, Edit, Trash2, Search, Archive, AlertTriangle, Upload } from "lucide-react"
import CustomerFormModal from "./CustomerFormModal"
import BackButton from "@/components/BackButton"
import SortIcon from "@/components/SortIcon"
import PaginationControls from "@/components/PaginationControls"
import { cn } from "@/lib/utils"

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
    const [permissions, setPermissions] = useState<string[]>([])

    useEffect(() => {
        const fetchPermissions = async () => {
            try {
                const res = await fetch('/api/auth/me')
                if (res.ok) {
                    const data = await res.json()
                    setPermissions(data.permissions ?? [])
                }
            } catch {}
        }
        fetchPermissions()
    }, [])

    const can = (perm: string) => permissions.includes('all:manage') || permissions.includes(perm)
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

    const [debouncedSearch, setDebouncedSearch] = useState("")
    const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' })

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 500)
        return () => clearTimeout(timer)
    }, [search])

    useEffect(() => {
        // Reset to page 1 when search or filters change
        setPage(1)
    }, [debouncedSearch, selectedRoles])

    useEffect(() => {
        fetchCustomers()
    }, [page, debouncedSearch, selectedRoles, sort])

    async function fetchCustomers() {
        setLoading(true)
        try {
            const query = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                search: debouncedSearch,
                roles: selectedRoles.join(','),
                sortKey: sort.key,
                sortDir: sort.direction
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

    const handleSort = (key: string) => {
        setSort(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }))
    }

    async function handleSave(savedCustomer: Customer) {
        fetchCustomers() // Refresh full list
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
                fetchCustomers()
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
                fetchCustomers()
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
        <div className="space-y-6 flex flex-col min-h-screen pb-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <BackButton className="mb-4" />
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Partner & Customer Network</h1>
                    <p className="text-sm text-gray-500 font-medium">Manage stakeholders across the supply and distribution chain</p>
                </div>
                <div className="flex gap-2">
                    {can('customers:create') && (
                        <Link
                            href="/dashboard/settings/customers/import"
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
                        >
                            <Upload className="w-4 h-4" />
                            Import Data
                        </Link>
                    )}
                    {can('customers:create') && (
                        <button
                            onClick={() => {
                                setEditingCustomer(null)
                                setShowModal(true)
                            }}
                            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-sm font-bold text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95"
                        >
                            <Plus className="w-5 h-5" />
                            Add New Partner
                        </button>
                    )}
                </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col md:flex-row gap-4 items-center">
                <div className="flex-1 relative w-full">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name, email, or contact..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm border-gray-200 rounded-xl focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all"
                    />
                </div>

                <div className="flex items-center gap-4 px-2">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest hidden lg:block">Filter:</span>
                    <div className="flex flex-wrap items-center gap-4">
                        {[
                            { id: 'isPartner', label: 'Partners' },
                            { id: 'isCustomer', label: 'End Customers' },
                            { id: 'isSupplier', label: 'Suppliers' }
                        ].map(role => (
                            <label key={role.id} className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={selectedRoles.includes(role.id)}
                                    onChange={() => handleRoleToggle(role.id)}
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer shadow-sm transition-all"
                                />
                                <span className="text-xs font-bold text-gray-600 group-hover:text-gray-900 transition-colors">{role.label}</span>
                            </label>
                        ))}
                    </div>
                </div>
            </div>

            {/* Table View */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col flex-1 min-h-[500px]">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th scope="col" className="px-6 py-4 text-left">
                                    <SortIcon sort={sort} column="name" label="Identity" onSort={handleSort} />
                                </th>
                                <th scope="col" className="px-6 py-4 text-left">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Category Tags</span>
                                </th>
                                <th scope="col" className="px-6 py-4 text-left">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Contact Details</span>
                                </th>
                                <th scope="col" className="px-6 py-4 text-left">
                                    <SortIcon sort={sort} column="rep" label="Account Representative" onSort={handleSort} />
                                </th>
                                <th scope="col" className="px-6 py-4 text-right pr-10">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Operations</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-50">
                            {loading ? (
                                Array.from({ length: 8 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="px-6 py-6">
                                            <div className="h-4 bg-gray-50 rounded-lg w-full"></div>
                                        </td>
                                    </tr>
                                ))
                            ) : customers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <Archive className="h-10 w-10 text-gray-200" />
                                            <p className="text-gray-400 font-medium">No partner records discovered</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                customers.map((customer) => (
                                    <tr key={customer.id} className={cn("hover:bg-gray-50/50 transition-all group", !customer.isActive && "opacity-60 grayscale-[0.5]")}>
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shadow-sm border",
                                                    customer.isActive ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-gray-100 text-gray-400 border-gray-200"
                                                )}>
                                                    {customer.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-gray-900">{customer.name}</span>
                                                    {customer.taxId && <span className="text-[10px] text-gray-400 font-mono">ID: {customer.taxId}</span>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            <div className="flex flex-wrap gap-1.5 min-w-[120px]">
                                                {customer.isPartner && <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase tracking-tighter">Partner</span>}
                                                {customer.isCustomer && <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase tracking-tighter">End Customer</span>}
                                                {customer.isSupplier && <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-100 uppercase tracking-tighter">Supplier</span>}
                                                {!customer.isActive && <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-red-50 text-red-700 border border-red-100 uppercase tracking-tighter italic">Inactive</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            <div className="flex flex-col gap-0.5">
                                                <div className="text-xs font-bold text-gray-900">{customer.contactName || '-'}</div>
                                                <div className="text-[11px] text-gray-500 font-medium">{customer.email || customer.phone || 'No contact info'}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            {(customer.salesRep?.name || customer.salesRepLegacy) ? (
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                                    <span className="text-xs font-bold text-blue-700">{customer.salesRep?.name || customer.salesRepLegacy}</span>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-300 font-medium italic">Unassigned</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap text-right pr-6 space-x-1">
                                            {can('customers:update') && (
                                                <button
                                                    onClick={() => toggleStatus(customer)}
                                                    className={cn("p-2 rounded-xl transition-all", customer.isActive ? "text-gray-400 hover:text-orange-600 hover:bg-orange-50" : "text-emerald-600 hover:bg-emerald-100")}
                                                    title={customer.isActive ? "Deactivate" : "Activate"}
                                                >
                                                    {customer.isActive ? <Archive className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                                                </button>
                                            )}
                                            {can('customers:update') && (
                                                <button
                                                    onClick={() => handleEdit(customer)}
                                                    className="p-2 rounded-xl text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                                                    title="Edit"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </button>
                                            )}
                                            {can('customers:delete') && (
                                                <button
                                                    onClick={() => {
                                                        setDeleteCustomer(customer)
                                                        setShowDeleteModal(true)
                                                    }}
                                                    className="p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <PaginationControls
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={(p) => setPage(p)}
                    totalResults={totalCount}
                    limit={limit}
                    className="bg-gray-50/50 border-t border-gray-100"
                />
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
