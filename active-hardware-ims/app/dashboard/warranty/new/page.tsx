"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Search } from "lucide-react"
import CustomerSelector from "@/app/dashboard/transactions/invoices/new/CustomerSelector"

type InventoryItem = {
    id: string
    serialNumber: string
    status: string
    product: {
        id: string
        name: string
        brand: string
        model: string
    }
    location: {
        name: string
    }
}

export default function NewWarrantyClaimPage() {
    const router = useRouter()
    const [searchTerm, setSearchTerm] = useState("")
    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
    const [description, setDescription] = useState("")
    const [loading, setLoading] = useState(false)
    const [searching, setSearching] = useState(false)

    useEffect(() => {
        // Lower threshold to 2 characters for better UX
        if (searchTerm.length >= 2) {
            searchInventory()
        } else {
            setInventoryItems([])
        }
    }, [searchTerm])

    async function searchInventory() {
        setSearching(true)
        try {
            // Build query parameters for server-side filtering
            const params = new URLSearchParams({
                status: 'SOLD,DELIVERED,RMA'
            })

            // Add search term if provided (searches both serial number and product name on server)
            if (searchTerm.trim()) {
                params.append('serialNumber', searchTerm.trim())
            }

            console.log('Searching warranty items:', params.toString())
            const res = await fetch(`/api/inventory?${params.toString()}`)

            if (!res.ok) {
                throw new Error(`API returned ${res.status}: ${res.statusText}`)
            }

            const data = await res.json()
            console.log('API returned items:', data.length)

            // Additional client-side filter for product name (since API only searches serial number)
            const filtered = searchTerm.trim()
                ? data.filter((item: InventoryItem) =>
                    item.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    item.product.name.toLowerCase().includes(searchTerm.toLowerCase())
                )
                : data

            console.log('Filtered items:', filtered.length)
            setInventoryItems(filtered)

            if (filtered.length === 0 && searchTerm.trim()) {
                console.warn('No items found matching:', searchTerm)
            }
        } catch (error) {
            console.error('Failed to search inventory:', error)
            alert(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}. Check console for details.`)
            setInventoryItems([])
        } finally {
            setSearching(false)
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()

        if (!selectedItem || !description) {
            alert('Please select an inventory item and provide a description')
            return
        }

        // Use selected customer name if available, otherwise use a default
        const customerNameToSubmit = selectedCustomer?.name || 'Walk-in Customer'

        setLoading(true)

        try {
            const res = await fetch('/api/warranty', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    inventoryItemId: selectedItem.id,
                    customerName: customerNameToSubmit,
                    description
                })
            })

            if (!res.ok) {
                throw new Error('Failed to create warranty claim')
            }

            const data = await res.json()
            router.push(`/dashboard/warranty/${data.id}`)
        } catch (error) {
            console.error('Failed to create warranty claim:', error)
            alert('Failed to create warranty claim')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <button 
                    type="button" 
                    onClick={() => router.back()} 
                    className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">New Warranty Claim</h1>
                    <p className="text-sm text-gray-500">Create a new RMA request for a defective item</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Search Inventory Item */}
                <div className="bg-white shadow sm:rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Select Inventory Item</h3>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Search by Serial Number or Product Name
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Search className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Type at least 3 characters to search..."
                                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                />
                            </div>
                        </div>

                        {searching && (
                            <p className="text-sm text-gray-500">Searching...</p>
                        )}

                        {inventoryItems.length > 0 && !selectedItem && (
                            <div className="border rounded-md divide-y max-h-60 overflow-y-auto">
                                {inventoryItems.map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => setSelectedItem(item)}
                                        className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                                    >
                                        <p className="text-sm font-medium text-gray-900">{item.serialNumber}</p>
                                        <p className="text-sm text-gray-500">
                                            {item.product.brand} {item.product.name} - {item.location.name}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        )}

                        {selectedItem && (
                            <div className="border border-blue-200 bg-blue-50 rounded-md p-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">Selected Item</p>
                                        <p className="text-sm text-gray-700 mt-1">
                                            <span className="font-semibold">Serial:</span> {selectedItem.serialNumber}
                                        </p>
                                        <p className="text-sm text-gray-700">
                                            <span className="font-semibold">Product:</span> {selectedItem.product.brand} {selectedItem.product.name}
                                        </p>
                                        <p className="text-sm text-gray-700">
                                            <span className="font-semibold">Location:</span> {selectedItem.location.name}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedItem(null)}
                                        className="text-sm text-blue-600 hover:text-blue-800"
                                    >
                                        Change
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Customer Information */}
                <div className="bg-white shadow sm:rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Information</h3>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Customer / Partner *
                        </label>
                        <CustomerSelector
                            type="ALL"
                            selectedCustomer={selectedCustomer}
                            onSelect={setSelectedCustomer}
                        />
                    </div>
                </div>

                {/* Issue Description */}
                <div className="bg-white shadow sm:rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Issue Description</h3>

                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                            Describe the Issue *
                        </label>
                        <textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            required
                            rows={4}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="Describe the defect or issue..."
                        />
                    </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading || !selectedItem || !description}
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Creating...' : 'Create Warranty Claim'}
                    </button>
                </div>
            </form>
        </div>
    )
}
