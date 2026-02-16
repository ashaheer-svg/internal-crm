"use client"

import { useState, useEffect } from "react"
import { X, Search } from "lucide-react"
import { useRouter } from "next/navigation"

type InventoryItem = {
    id: string
    serialNumber: string
    product: {
        name: string
        brand: string
        model: string
    }
}

type EditWarrantyModalProps = {
    claim: {
        id: string
        customerName: string
        description: string
        status: string
        inventoryItem: InventoryItem
    }
    onClose: () => void
    onSave: (updatedClaim: any) => void
}

export default function EditWarrantyModal({ claim, onClose, onSave }: EditWarrantyModalProps) {
    const router = useRouter()
    const [customerName, setCustomerName] = useState(claim.customerName)
    const [description, setDescription] = useState(claim.description)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    // Item Search State
    const [selectedItem, setSelectedItem] = useState<InventoryItem>(claim.inventoryItem)
    const [searchTerm, setSearchTerm] = useState("")
    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
    const [searching, setSearching] = useState(false)
    const [showSearch, setShowSearch] = useState(false)

    useEffect(() => {
        if (searchTerm.length >= 2) {
            searchInventory()
        } else {
            setInventoryItems([])
        }
    }, [searchTerm])

    async function searchInventory() {
        setSearching(true)
        try {
            const params = new URLSearchParams({
                status: 'SOLD,DELIVERED,RMA'
            })
            if (searchTerm.trim()) {
                params.append('serialNumber', searchTerm.trim())
            }

            const res = await fetch(`/api/inventory?${params.toString()}`)
            if (!res.ok) throw new Error("Search failed")

            const data = await res.json()

            // Client-side filtering for product name
            const filtered = searchTerm.trim()
                ? data.filter((item: any) =>
                    item.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    item.product.name.toLowerCase().includes(searchTerm.toLowerCase())
                )
                : data

            setInventoryItems(filtered)
        } catch (error) {
            console.error("Failed to search inventory:", error)
        } finally {
            setSearching(false)
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError("")

        try {
            const res = await fetch(`/api/warranty/${claim.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    customerName,
                    description,
                    inventoryItemId: selectedItem.id !== claim.inventoryItem.id ? selectedItem.id : undefined
                })
            })

            if (!res.ok) {
                const json = await res.json()
                throw new Error(json.error || "Failed to update warranty claim")
            }

            const updatedClaim = await res.json()
            onSave(updatedClaim)
            router.refresh()
            onClose()
        } catch (e) {
            setError(e instanceof Error ? e.message : "Something went wrong")
        } finally {
            setLoading(false)
        }
    }

    const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    const buttonPrimaryClass = "px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
    const buttonSecondaryClass = "px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium"

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-6 border-b">
                    <h2 className="text-xl font-semibold text-gray-900">Edit Warranty Claim</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                            <p className="text-sm">{error}</p>
                        </div>
                    )}

                    {/* Inventory Item Section */}
                    <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                        <div className="flex justify-between items-start mb-2">
                            <label className="block text-sm font-medium text-gray-700">Inventory Item</label>
                            {!showSearch && (
                                <button
                                    type="button"
                                    onClick={() => setShowSearch(true)}
                                    className="text-xs text-blue-600 hover:text-blue-800"
                                >
                                    Change Item
                                </button>
                            )}
                        </div>

                        {!showSearch ? (
                            <div>
                                <p className="text-sm font-medium text-gray-900">
                                    {selectedItem.product.brand} {selectedItem.product.name}
                                </p>
                                <p className="text-xs text-gray-500 font-mono mt-1">
                                    SN: {selectedItem.serialNumber}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <div className="relative">
                                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Search serial or product..."
                                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        autoFocus
                                    />
                                </div>

                                {searching && <p className="text-xs text-gray-500">Searching...</p>}

                                {inventoryItems.length > 0 && (
                                    <div className="border rounded-md divide-y max-h-40 overflow-y-auto bg-white">
                                        {inventoryItems.map((item) => (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedItem(item)
                                                    setShowSearch(false)
                                                    setSearchTerm("")
                                                }}
                                                className="w-full px-3 py-2 text-left hover:bg-gray-50 flex flex-col"
                                            >
                                                <span className="text-sm font-medium text-gray-900">{item.serialNumber}</span>
                                                <span className="text-xs text-gray-500">{item.product.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setShowSearch(false)}
                                    className="text-xs text-gray-500 hover:text-gray-700"
                                >
                                    Cancel Change
                                </button>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
                        <input
                            type="text"
                            required
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            className={inputClass}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Issue Description *</label>
                        <textarea
                            required
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={4}
                            className={inputClass}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={onClose} className={buttonSecondaryClass}>
                            Cancel
                        </button>
                        <button type="submit" disabled={loading} className={buttonPrimaryClass}>
                            {loading ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
