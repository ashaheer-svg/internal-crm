"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Calendar, AlertTriangle, CheckCircle, Clock, Plus, AlertCircle, Package, Printer, Search } from "lucide-react"
import Link from "next/link"
import ServiceRenewalModal from "./ServiceRenewalModal"
import SortIcon from "@/components/SortIcon"
import PaginationControls from "@/components/PaginationControls"
import { cn } from "@/lib/utils"

interface ServiceDashboardClientProps {
    initialExpiring: { contracts: any[], meta: any }
    initialActive: { contracts: any[], meta: any }
    initialRentals: { assets: any[], meta: any }
}

export default function ServiceDashboardClient({
    initialExpiring,
    initialActive,
    initialRentals
}: ServiceDashboardClientProps) {
    const router = useRouter()
    const [selectedContract, setSelectedContract] = useState<any>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [daysFilter, setDaysFilter] = useState<30 | 60>(60)

    // Data states
    const [expiring, setExpiring] = useState(initialExpiring.contracts)
    const [expiringMeta, setExpiringMeta] = useState(initialExpiring.meta)

    const [active, setActive] = useState(initialActive.contracts)
    const [activeMeta, setActiveMeta] = useState(initialActive.meta)

    const [rentals, setRentals] = useState(initialRentals.assets)
    const [rentalsMeta, setRentalsMeta] = useState(initialRentals.meta)

    // Interaction states
    const [loading, setLoading] = useState<Record<string, boolean>>({ expiring: false, active: false, rentals: false })
    const [search, setSearch] = useState<Record<string, string>>({ expiring: '', active: '', rentals: '' })
    const [debouncedSearch, setDebouncedSearch] = useState<Record<string, string>>({ expiring: '', active: '', rentals: '' })
    const [sort, setSort] = useState<Record<string, { key: string, direction: 'asc' | 'desc' }>>({
        expiring: { key: 'expiry', direction: 'asc' },
        active: { key: 'createdAt', direction: 'desc' },
        rentals: { key: 'status', direction: 'asc' }
    })

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 500)
        return () => clearTimeout(timer)
    }, [search])

    // Data fetching functions
    const fetchExpiring = useCallback(async (page: number = 1) => {
        setLoading(prev => ({ ...prev, expiring: true }))
        try {
            const params = new URLSearchParams({
                type: 'expiring',
                daysThreshold: daysFilter.toString(),
                page: page.toString(),
                limit: '10',
                sortKey: sort.expiring.key,
                sortDir: sort.expiring.direction,
                search: debouncedSearch.expiring
            })
            const res = await fetch(`/api/services/contracts?${params}`)
            if (res.ok) {
                const data = await res.json()
                setExpiring(data.contracts)
                setExpiringMeta(data.meta)
            }
        } catch (error) {
            console.error('Failed to fetch expiring:', error)
        } finally {
            setLoading(prev => ({ ...prev, expiring: false }))
        }
    }, [daysFilter, sort.expiring, debouncedSearch.expiring])

    const fetchActive = useCallback(async (page: number = 1) => {
        setLoading(prev => ({ ...prev, active: true }))
        try {
            const params = new URLSearchParams({
                type: 'active',
                page: page.toString(),
                limit: '10',
                sortKey: sort.active.key,
                sortDir: sort.active.direction,
                search: debouncedSearch.active
            })
            const res = await fetch(`/api/services/contracts?${params}`)
            if (res.ok) {
                const data = await res.json()
                setActive(data.contracts)
                setActiveMeta(data.meta)
            }
        } catch (error) {
            console.error('Failed to fetch active:', error)
        } finally {
            setLoading(prev => ({ ...prev, active: false }))
        }
    }, [sort.active, debouncedSearch.active])

    const fetchRentals = useCallback(async (page: number = 1) => {
        setLoading(prev => ({ ...prev, rentals: true }))
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '10',
                sortKey: sort.rentals.key,
                sortDir: sort.rentals.direction,
                search: debouncedSearch.rentals
            })
            const res = await fetch(`/api/rentals?${params}`)
            if (res.ok) {
                const data = await res.json()
                setRentals(data.assets)
                setRentalsMeta(data.meta)
            }
        } catch (error) {
            console.error('Failed to fetch rentals:', error)
        } finally {
            setLoading(prev => ({ ...prev, rentals: false }))
        }
    }, [sort.rentals, debouncedSearch.rentals])

    // Effects for changes
    useEffect(() => { fetchExpiring() }, [fetchExpiring])
    useEffect(() => { fetchActive() }, [fetchActive])
    useEffect(() => { fetchRentals() }, [fetchRentals])

    const handleSort = (type: 'expiring' | 'active' | 'rentals', key: string) => {
        setSort(prev => ({
            ...prev,
            [type]: {
                key,
                direction: prev[type].key === key && prev[type].direction === 'asc' ? 'desc' : 'asc'
            }
        }))
    }

    const handleRenewClick = (contract: any) => {
        setSelectedContract(contract)
        setIsModalOpen(true)
    }

    const onRenewSubmit = async (contractId: string, durationValue: number, durationUnit: string) => {
        try {
            const res = await fetch('/api/services/renew', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contractId, durationValue, durationUnit })
            })
            if (!res.ok) throw new Error("Failed to renew")
            fetchExpiring()
            fetchActive()
            setIsModalOpen(false)
        } catch (error) {
            console.error(error)
            throw error
        }
    }

    const handleCompleteContract = async (contractId: string) => {
        if (!confirm("Are you sure you want to mark this contract as COMPLETED?")) return
        try {
            const res = await fetch(`/api/services/contracts/${contractId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'COMPLETED' })
            })
            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || "Failed to update status")
            }
            fetchActive()
        } catch (error: any) {
            console.error("Failed to complete contract", error)
            alert(error.message || "Failed to mark as completed")
        }
    }

    const handleReturnRental = async (assetId: string, assetName: string) => {
        if (!confirm(`Return "${assetName}" to inventory? This will mark the rental contract as COMPLETED.`)) return
        try {
            const res = await fetch(`/api/rentals/${assetId}/return`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notes: 'Returned via Service Dashboard' })
            })
            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || "Failed to process return")
            }
            fetchRentals()
        } catch (error: any) {
            console.error("Rental return failed", error)
            alert(error.message || "Failed to return asset")
        }
    }

    return (
        <div className="space-y-8 pb-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-200">
                        <Clock className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-background">Service Management</h1>
                        <p className="text-sm text-gray-500 font-medium">Monitor active contracts and upcoming renewals</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Link href="/dashboard/services/new-agreement" className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95 text-sm font-bold">
                        <Plus className="w-4 h-4" /> New Agreement
                    </Link>
                    <Link href="/dashboard/services/rentals" className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 shadow-sm transition-all active:scale-95 text-sm font-bold">
                        <Package className="w-4 h-4" /> Rental Assets
                    </Link>
                    <Link href="/dashboard/services/catalog" className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 shadow-sm transition-all active:scale-95 text-sm font-bold">
                        Service Catalog
                    </Link>
                </div>
            </div>

            {/* Upcoming Renewals */}
            <div className="bg-white rounded-2xl border border-yellow-100 shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 bg-yellow-50/50 border-b border-yellow-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-yellow-600" />
                        <h2 className="text-lg font-bold text-gray-900">Upcoming Renewals</h2>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex bg-white/80 p-1 rounded-xl shadow-sm border border-yellow-200/50">
                            {[30, 60].map(days => (
                                <button
                                    key={days}
                                    onClick={() => setDaysFilter(days as 30 | 60)}
                                    className={cn(
                                        "px-4 py-1.5 text-xs font-bold rounded-lg transition-all",
                                        daysFilter === days ? "bg-white text-yellow-700 shadow-sm" : "text-gray-400 hover:text-gray-600"
                                    )}
                                >
                                    {days} Days
                                </button>
                            ))}
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search renewals..."
                                value={search.expiring}
                                onChange={(e) => setSearch(prev => ({ ...prev, expiring: e.target.value }))}
                                className="pl-9 pr-4 py-2 text-sm border-gray-200 rounded-xl focus:ring-yellow-500 focus:border-yellow-500 w-full md:w-64 shadow-sm"
                            />
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th className="px-6 py-3 text-left">
                                    <SortIcon sort={sort.expiring} column="customer" label="Customer" onSort={(key) => handleSort('expiring', key)} />
                                </th>
                                <th className="px-6 py-3 text-left">
                                    <SortIcon sort={sort.expiring} column="product" label="Service" onSort={(key) => handleSort('expiring', key)} />
                                </th>
                                <th className="px-6 py-3 text-left">
                                    <SortIcon sort={sort.expiring} column="expiry" label="End Date" onSort={(key) => handleSort('expiring', key)} />
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-gray-400 uppercase tracking-widest bg-white">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 bg-white">
                            {loading.expiring ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={4} className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-full" /></td>
                                    </tr>
                                ))
                            ) : expiring.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-10 text-center">
                                        <p className="text-gray-500 font-medium">No contracts expiring in the next {daysFilter} days.</p>
                                    </td>
                                </tr>
                            ) : expiring.map(contract => (
                                <tr key={contract.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-bold text-gray-900">{contract.customer?.name || contract.customerName}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm text-gray-600 font-medium">{contract.product?.name}</p>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">{contract.product?.sku}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-3.5 h-3.5 text-yellow-600" />
                                            <span className="text-sm text-yellow-700 font-bold">
                                                {contract.endDate ? new Date(contract.endDate).toLocaleDateString() : 'N/A'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleRenewClick(contract)}
                                            className="px-4 py-1.5 bg-yellow-50 text-yellow-700 text-xs font-bold rounded-lg border border-yellow-100 hover:bg-yellow-100 transition-all active:scale-95 shadow-sm"
                                        >
                                            Renew
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <PaginationControls
                    currentPage={expiringMeta.page}
                    totalPages={expiringMeta.totalPages}
                    onPageChange={(p) => fetchExpiring(p)}
                    totalResults={expiringMeta.total}
                    limit={expiringMeta.limit}
                    className="bg-yellow-50/20"
                />
            </div>

            {/* Active Contracts */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 bg-gray-50/30 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <h2 className="text-lg font-bold text-gray-900">Active Contracts</h2>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search active contracts..."
                            value={search.active}
                            onChange={(e) => setSearch(prev => ({ ...prev, active: e.target.value }))}
                            className="pl-9 pr-4 py-2 text-sm border-gray-200 rounded-xl focus:ring-blue-500 focus:border-blue-500 w-full md:w-64 shadow-sm"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th className="px-6 py-3 text-left">
                                    <SortIcon sort={sort.active} column="customer" label="Customer" onSort={(key) => handleSort('active', key)} />
                                </th>
                                <th className="px-6 py-3 text-left">
                                    <SortIcon sort={sort.active} column="product" label="Product" onSort={(key) => handleSort('active', key)} />
                                </th>
                                <th className="px-6 py-3 text-left">
                                    <SortIcon sort={sort.active} column="expiry" label="End Date" onSort={(key) => handleSort('active', key)} />
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-gray-400 uppercase tracking-widest bg-white">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 bg-white">
                            {loading.active ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={4} className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-full" /></td>
                                    </tr>
                                ))
                            ) : active.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-10 text-center text-gray-500 font-medium">No active contracts found.</td>
                                </tr>
                            ) : active.map(contract => (
                                <tr key={contract.id} className="hover:bg-gray-50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-bold text-gray-900">{contract.customer?.name}</p>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{contract.partner?.name || 'Direct Sale'}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm text-gray-700 font-medium">{contract.product?.name}</p>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">{contract.product?.sku}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm text-gray-600 font-medium">
                                            {contract.endDate ? new Date(contract.endDate).toLocaleDateString() : 'Indefinite'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Link href={`/dashboard/services/contracts/${contract.id}/edit`} className="p-2 text-gray-400 hover:text-blue-600 transition-colors" title="Edit Contract">
                                                <AlertCircle className="w-4 h-4 rotate-180" />
                                            </Link>
                                            <Link href={`/dashboard/services/contracts/${contract.id}/agreement`} className="p-2 text-gray-400 hover:text-blue-600 transition-colors" target="_blank" title="View Agreement">
                                                <Printer className="w-4 h-4 text-blue-500" />
                                            </Link>
                                            <Link href={`/dashboard/services/contracts/${contract.id}/print`} className="p-2 text-gray-400 hover:text-blue-600 transition-colors" target="_blank" title="Print Certificate">
                                                <Printer className="w-4 h-4" />
                                            </Link>
                                            <button onClick={() => handleCompleteContract(contract.id)} className="p-2 text-gray-400 hover:text-green-600 transition-colors" title="Mark Completed">
                                                <CheckCircle className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <PaginationControls
                    currentPage={activeMeta.page}
                    totalPages={activeMeta.totalPages}
                    onPageChange={(p) => fetchActive(p)}
                    totalResults={activeMeta.total}
                    limit={activeMeta.limit}
                />
            </div>

            {/* Rental Assets */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 bg-gray-50/30 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <Package className="w-5 h-5 text-purple-600" />
                        <h2 className="text-lg font-bold text-gray-900">Rental Inventory</h2>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search assets..."
                            value={search.rentals}
                            onChange={(e) => setSearch(prev => ({ ...prev, rentals: e.target.value }))}
                            className="pl-9 pr-4 py-2 text-sm border-gray-200 rounded-xl focus:ring-purple-500 focus:border-purple-500 w-full md:w-64 shadow-sm"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th className="px-6 py-3 text-left">
                                    <SortIcon sort={sort.rentals} column="name" label="Asset" onSort={(key) => handleSort('rentals', key)} />
                                </th>
                                <th className="px-6 py-3 text-left">
                                    <SortIcon sort={sort.rentals} column="status" label="Status" onSort={(key) => handleSort('rentals', key)} />
                                </th>
                                <th className="px-6 py-3 text-left">
                                    <SortIcon sort={sort.rentals} column="customer" label="Current User" onSort={(key) => handleSort('rentals', key)} />
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-gray-400 uppercase tracking-widest bg-white">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 bg-white">
                            {loading.rentals ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={4} className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-full" /></td>
                                    </tr>
                                ))
                            ) : rentals.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-10 text-center text-gray-500 font-medium">No rental assets found.</td>
                                </tr>
                            ) : rentals.map(asset => (
                                <tr key={asset.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-bold text-gray-900">{asset.name}</p>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">{asset.serialNumber}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={cn(
                                            "px-3 py-1 text-[10px] font-bold rounded-full uppercase tracking-widest border",
                                            asset.status === 'AVAILABLE' ? "bg-green-50 text-green-700 border-green-100" :
                                                asset.status === 'RENTED' ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-gray-50 text-gray-600 border-gray-100"
                                        )}>
                                            {asset.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm text-gray-600 font-medium">{asset.currentContract?.customer?.name || '-'}</p>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {asset.status === 'RENTED' && (
                                            <button
                                                onClick={() => handleReturnRental(asset.id, asset.name)}
                                                className="px-4 py-1.5 bg-purple-50 text-purple-700 text-xs font-bold rounded-lg border border-purple-100 hover:bg-purple-100 transition-all active:scale-95 shadow-sm"
                                            >
                                                Return
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <PaginationControls
                    currentPage={rentalsMeta.page}
                    totalPages={rentalsMeta.totalPages}
                    onPageChange={(p) => fetchRentals(p)}
                    totalResults={rentalsMeta.total}
                    limit={rentalsMeta.limit}
                    className="bg-purple-50/20"
                />
            </div>

            <ServiceRenewalModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                contract={selectedContract}
                onRenew={onRenewSubmit}
            />
        </div>
    )
}
