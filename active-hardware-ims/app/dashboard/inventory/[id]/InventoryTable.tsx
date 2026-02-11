"use client"

import { useState, useMemo } from "react"
import { QrCode, Search } from "lucide-react"
import { Currency } from "@/components/Currency"
import InventoryItemActions from "./InventoryItemActions"
import LocationEditor from "./LocationEditor"

type InventoryItem = {
    id: string
    serialNumber: string
    status: string
    unitCost: number
    warrantyExpiry: Date | null
    createdAt: Date
    location: {
        id: string
        name: string
    }
}

type Location = {
    id: string
    name: string
}

interface InventoryTableProps {
    inventory: InventoryItem[]
    locations: Location[]
}

export default function InventoryTable({ inventory, locations }: InventoryTableProps) {
    const [searchTerm, setSearchTerm] = useState("")
    const [filterStatus, setFilterStatus] = useState<'ALL' | 'UNSOLD'>('UNSOLD')
    const [filterLocation, setFilterLocation] = useState<string>("")
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 10

    // Filter inventory
    const filteredInventory = useMemo(() => {
        return inventory.filter(item => {
            // 1. Search Filter
            const matchesSearch = item.serialNumber.toLowerCase().includes(searchTerm.toLowerCase())

            // 2. Status Filter
            // If ALL, match everything. If UNSOLD, exclude SOLD and SHIPPED
            const matchesStatus = filterStatus === 'ALL' || (item.status !== 'SOLD' && item.status !== 'SHIPPED')

            // 3. Location Filter
            const matchesLocation = filterLocation === "" || item.location.id === filterLocation

            return matchesSearch && matchesStatus && matchesLocation
        })
    }, [inventory, searchTerm, filterStatus, filterLocation])

    // Pagination calculations
    const totalPages = Math.ceil(filteredInventory.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const currentItems = filteredInventory.slice(startIndex, endIndex)

    // Reset to page 1 when search changes
    const handleSearch = (value: string) => {
        setSearchTerm(value)
        setCurrentPage(1)
    }

    const goToPage = (page: number) => {
        setCurrentPage(Math.max(1, Math.min(page, totalPages)))
    }

    return (
        <div className="bg-white shadow sm:rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                    <div>
                        <h3 className="text-lg leading-6 font-medium text-gray-900">Inventory Items</h3>
                        <p className="mt-1 max-w-2xl text-sm text-gray-500">Track individual units by serial number.</p>
                    </div>
                    <div className="text-sm text-gray-500">
                        {filteredInventory.length} {filteredInventory.length === 1 ? 'item' : 'items'}
                        {(searchTerm || filterStatus !== 'ALL' || filterLocation) && ` (filtered from ${inventory.length})`}
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4 mb-4 items-end sm:items-center">
                    {/* Location Filter */}
                    <div className="w-full sm:w-auto">
                        <label htmlFor="location-filter" className="block text-xs font-medium text-gray-700 mb-1">
                            Filter by Location
                        </label>
                        <select
                            id="location-filter"
                            value={filterLocation}
                            onChange={(e) => {
                                setFilterLocation(e.target.value)
                                setCurrentPage(1)
                            }}
                            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                        >
                            <option value="">All Locations</option>
                            {locations.map((loc) => (
                                <option key={loc.id} value={loc.id}>
                                    {loc.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Show All Toggle */}
                    <div className="flex items-center pb-2">
                        <label className="inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={filterStatus === 'ALL'}
                                onChange={(e) => {
                                    setFilterStatus(e.target.checked ? 'ALL' : 'UNSOLD')
                                    setCurrentPage(1)
                                }}
                                className="sr-only peer"
                            />
                            <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            <span className="ms-3 text-sm font-medium text-gray-700">Show Sold/Shipped Items</span>
                        </label>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="mt-4">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search by serial number..."
                            value={searchTerm}
                            onChange={(e) => handleSearch(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Serial Number</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Cost</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Warranty Expiry</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Added</th>
                            <th scope="col" className="relative px-6 py-3">
                                <span className="sr-only">Actions</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {currentItems.map((item) => (
                            <tr key={item.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 flex items-center">
                                    <QrCode className="w-4 h-4 mr-2 text-gray-400" />
                                    {item.serialNumber}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {item.status === 'SOLD' ? (
                                        <span className="text-gray-400 italic">Sold</span>
                                    ) : item.status === 'SHIPPED' ? (
                                        <span className="text-gray-400 italic">Shipped</span>
                                    ) : (
                                        <LocationEditor
                                            itemId={item.id}
                                            currentLocationId={item.location.id}
                                            currentLocationName={item.location.name}
                                            locations={locations}
                                        />
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${item.status === 'AVAILABLE' ? 'bg-green-100 text-green-800' : ''}
                            ${item.status === 'SOLD' ? 'bg-blue-100 text-blue-800' : ''}
                            ${item.status === 'RMA' ? 'bg-red-100 text-red-800' : ''}
                          `}>
                                        {item.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                                    <Currency amount={item.unitCost || 0} />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    {item.warrantyExpiry ? (
                                        <span className={`${new Date(item.warrantyExpiry) < new Date()
                                            ? 'text-red-600 font-semibold'
                                            : 'text-gray-900'
                                            }`}>
                                            {new Date(item.warrantyExpiry).toLocaleDateString('en-GB', {
                                                year: '2-digit',
                                                month: '2-digit',
                                                day: '2-digit'
                                            }).replace(/\//g, '/')}
                                        </span>
                                    ) : (
                                        <span className="text-gray-400">N/A</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(item.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <InventoryItemActions
                                        itemId={item.id}
                                        currentLocationName={item.location.name}
                                        locations={locations}
                                    />
                                </td>
                            </tr>
                        ))}
                        {currentItems.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-6 py-10 text-center text-gray-500 text-sm">
                                    {searchTerm ? 'No items found matching your search.' : 'No inventory items recorded. Add stock below.'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                    <div className="flex-1 flex justify-between sm:hidden">
                        <button
                            onClick={() => goToPage(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => goToPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </div>
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm text-gray-700">
                                Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                                <span className="font-medium">{Math.min(endIndex, filteredInventory.length)}</span> of{' '}
                                <span className="font-medium">{filteredInventory.length}</span> results
                            </p>
                        </div>
                        <div>
                            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                <button
                                    onClick={() => goToPage(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <span className="sr-only">Previous</span>
                                    ←
                                </button>

                                {/* Page numbers */}
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    let pageNum;
                                    if (totalPages <= 5) {
                                        pageNum = i + 1;
                                    } else if (currentPage <= 3) {
                                        pageNum = i + 1;
                                    } else if (currentPage >= totalPages - 2) {
                                        pageNum = totalPages - 4 + i;
                                    } else {
                                        pageNum = currentPage - 2 + i;
                                    }

                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => goToPage(pageNum)}
                                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${currentPage === pageNum
                                                ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                                }`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}

                                <button
                                    onClick={() => goToPage(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <span className="sr-only">Next</span>
                                    →
                                </button>
                            </nav>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
