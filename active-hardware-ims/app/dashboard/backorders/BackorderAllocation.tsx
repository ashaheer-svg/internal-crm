"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle, X, Search, Plus, Trash2, ScanLine, ArrowRight } from "lucide-react"
import BulkSerialEntryModal from "@/components/BulkSerialEntryModal"

type BackorderAllocationProps = {
    backorderId: string
    productName: string
    quantityPending: number
    onSuccess: () => void
    onCancel: () => void
}

type InventoryItem = {
    id: string
    serialNumber: string
    unitCost: number
    location: {
        name: string
    }
    product: {
        name: string
        brand: string
    }
}

export default function BackorderAllocation({
    backorderId,
    productName,
    quantityPending,
    onSuccess,
    onCancel
}: BackorderAllocationProps) {
    const router = useRouter()

    // Data State
    const [availableStock, setAvailableStock] = useState<InventoryItem[]>([])
    const [allocatedItems, setAllocatedItems] = useState<InventoryItem[]>([])

    // UI State
    const [searchTerm, setSearchTerm] = useState("")
    const [serialInput, setSerialInput] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [isBulkEntryOpen, setIsBulkEntryOpen] = useState(false)

    useEffect(() => {
        fetchAvailableStock()
    }, [])

    async function fetchAvailableStock() {
        try {
            const res = await fetch('/api/inventory/available')
            if (!res.ok) throw new Error("Failed to load stock")
            const data = await res.json()
            setAvailableStock(data)
        } catch (error) {
            console.error('Failed to fetch stock:', error)
            setError("Failed to load available stock")
        }
    }

    // Filter available stock: matches search AND not already allocated
    const filteredStock = useMemo(() => {
        return availableStock.filter(item => {
            const isAllocated = allocatedItems.some(a => a.id === item.id)
            if (isAllocated) return false

            if (!searchTerm) return true

            const searchLower = searchTerm.toLowerCase()
            return (
                item.serialNumber.toLowerCase().includes(searchLower) ||
                item.location.name.toLowerCase().includes(searchLower)
            )
        })
    }, [availableStock, allocatedItems, searchTerm])

    function handleAddItem(item: InventoryItem) {
        setAllocatedItems(prev => [...prev, item])
    }

    function handleRemoveItem(itemId: string) {
        setAllocatedItems(prev => prev.filter(i => i.id !== itemId))
    }

    function handleSerialScan() {
        if (!serialInput.trim()) return

        // Check locally first
        const localMatch = availableStock.find(
            i => i.serialNumber.toLowerCase() === serialInput.trim().toLowerCase()
        )

        if (localMatch) {
            if (allocatedItems.some(i => i.id === localMatch.id)) {
                setError(`Item ${localMatch.serialNumber} is already allocated`)
            } else {
                handleAddItem(localMatch)
                setSerialInput("")
                setError("")
            }
        } else {
            setError(`Serial ${serialInput} not found in available stock`)
        }
    }

    function handleBulkAdd(items: any[]) {
        // Filter out items that are already allocated
        const newItems = items.filter(newItem =>
            !allocatedItems.some(allocated => allocated.id === newItem.id)
        )

        // Map to InventoryItem structure if needed, or assume alignment
        // The Bulk modal returns items with product info, we need to ensure structure matches
        const formattedItems: InventoryItem[] = newItems.map(item => ({
            id: item.id,
            serialNumber: item.serialNumber,
            unitCost: item.unitCost || 0,
            location: item.location || { name: 'Unknown' },
            product: item.product
        }))

        setAllocatedItems(prev => [...prev, ...formattedItems])
    }

    async function handleAllocate() {
        if (allocatedItems.length === 0) {
            setError("Please select at least one item to allocate")
            return
        }

        setLoading(true)
        setError("")

        try {
            const payload = {
                inventoryItemIds: allocatedItems.map(i => i.id)
            }

            const res = await fetch(`/api/backorders/${backorderId}/allocate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })

            if (!res.ok) {
                const json = await res.json()
                throw new Error(json.error || "Failed to allocate inventory")
            }

            onSuccess()
            router.refresh()
        } catch (e) {
            setError(e instanceof Error ? e.message : "Something went wrong")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
                    <div>
                        <h3 className="text-xl font-semibold text-gray-900">Allocate Stock</h3>
                        <p className="text-sm text-gray-500 mt-1">
                            {productName} • <span className="font-medium text-blue-600">{quantityPending} items pending</span>
                        </p>
                    </div>
                    <button onClick={onCancel} className="text-gray-400 hover:text-gray-500">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-200">

                    {/* Left: Available Stock */}
                    <div className="flex flex-col h-full overflow-hidden bg-gray-50">
                        <div className="p-4 border-b bg-white space-y-4">
                            <h4 className="font-medium text-gray-900 flex items-center gap-2">
                                Available Stock
                                <span className="bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                                    {filteredStock.length}
                                </span>
                            </h4>

                            {/* Search & Scan */}
                            <div className="space-y-3">
                                <div className="relative">
                                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search available serials..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <ScanLine className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Scan Serial to Add"
                                            value={serialInput}
                                            onChange={(e) => setSerialInput(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSerialScan()}
                                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <button
                                        onClick={() => setIsBulkEntryOpen(true)}
                                        className="px-3 py-2 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-50 text-blue-600 font-medium"
                                    >
                                        Bulk
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {filteredStock.length === 0 ? (
                                <div className="text-center py-8 text-gray-500 text-sm">
                                    {searchTerm ? "No matching stock found" : "No available stock"}
                                </div>
                            ) : (
                                filteredStock.map(item => (
                                    <div key={item.id} className="bg-white p-3 rounded-md border border-gray-200 shadow-sm flex justify-between items-center group hover:border-blue-300 transition-colors">
                                        <div>
                                            <p className="font-medium text-gray-900 text-sm">{item.serialNumber}</p>
                                            <p className="text-xs text-gray-500">{item.location.name}</p>
                                        </div>
                                        <button
                                            onClick={() => handleAddItem(item)}
                                            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full"
                                            title="Add to allocation"
                                        >
                                            <Plus className="h-5 w-5" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Right: Allocated Items */}
                    <div className="flex flex-col h-full overflow-hidden bg-white">
                        <div className="p-4 border-b bg-blue-50/50">
                            <div className="flex justify-between items-center">
                                <h4 className="font-medium text-blue-900 flex items-center gap-2">
                                    Selected to Allocate
                                    <span className="bg-blue-100 text-blue-700 py-0.5 px-2 rounded-full text-xs font-bold">
                                        {allocatedItems.length}
                                    </span>
                                </h4>
                                {allocatedItems.length > quantityPending && (
                                    <span className="text-xs text-amber-600 font-medium px-2 py-1 bg-amber-50 rounded-md border border-amber-200">
                                        Warning: Exceeds Pending Qty
                                    </span>
                                )}
                            </div>
                            {/* Summary / Totals could go here */}
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {allocatedItems.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2">
                                    <ArrowRight className="h-8 w-8 opacity-20" />
                                    <p className="text-sm">Select items from the left list</p>
                                </div>
                            ) : (
                                allocatedItems.map((item, idx) => (
                                    <div key={item.id} className="flex items-center gap-3 p-3 bg-blue-50/30 rounded-md border border-blue-100">
                                        <div className="flex-shrink-0 text-blue-600">
                                            <CheckCircle className="h-5 w-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">
                                                {item.serialNumber}
                                            </p>
                                            <p className="text-xs text-gray-500 truncate">
                                                {item.location.name}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveItem(item.id)}
                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                            title="Remove"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center flex-shrink-0">
                    <div className="text-sm">
                        {error && <span className="text-red-600 font-medium">{error}</span>}
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onCancel}
                            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAllocate}
                            disabled={loading || allocatedItems.length === 0}
                            className="inline-flex items-center px-6 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 shadow-sm"
                        >
                            {loading ? "Allocating..." : `Allocate ${allocatedItems.length} Items`}
                        </button>
                    </div>
                </div>

                <BulkSerialEntryModal
                    isOpen={isBulkEntryOpen}
                    onClose={() => setIsBulkEntryOpen(false)}
                    onAdd={handleBulkAdd}
                    title={`Bulk Allocate to ${productName}`}
                />
            </div>
        </div>
    )
}
