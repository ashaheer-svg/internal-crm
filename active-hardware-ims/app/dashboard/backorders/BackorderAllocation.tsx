"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle, X, Search } from "lucide-react"
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
}

export default function BackorderAllocation({
    backorderId,
    productName,
    quantityPending,
    onSuccess,
    onCancel
}: BackorderAllocationProps) {
    const router = useRouter()
    const [availableStock, setAvailableStock] = useState<InventoryItem[]>([])
    const [selectedItemId, setSelectedItemId] = useState<string>("")
    const [selectedItemIds, setSelectedItemIds] = useState<string[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [isBulkEntryOpen, setIsBulkEntryOpen] = useState(false)

    useState(() => {
        fetchAvailableStock()
    })

    async function fetchAvailableStock() {
        try {
            const res = await fetch('/api/inventory/available')
            const data = await res.json()
            setAvailableStock(data)
        } catch (error) {
            console.error('Failed to fetch stock:', error)
            setError("Failed to load available stock")
        }
    }

    async function handleAllocate() {
        if (!selectedItemId) {
            setError("Please select an inventory item")
            return
        }

        setLoading(true)
        setError("")

        try {
            const payload = selectedItemIds.length > 0
                ? { inventoryItemIds: selectedItemIds }
                : { inventoryItemId: selectedItemId }

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
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-medium text-gray-900">Allocate Stock</h3>
                        <p className="text-sm text-gray-500 mt-1">
                            {productName} • {quantityPending} pending
                        </p>
                    </div>
                    <button
                        onClick={onCancel}
                        className="text-gray-400 hover:text-gray-500"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="px-6 py-4 overflow-y-auto max-h-96">
                    {error && (
                        <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select Available Inventory Item
                        </label>
                        {availableStock.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-8">
                                No available stock found for this product
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {availableStock.map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => setSelectedItemId(item.id)}
                                        className={`w-full text-left p-4 border-2 rounded-lg transition-all ${selectedItemId === item.id
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">
                                                    S/N: {item.serialNumber}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {item.location.name} • Rs. {item.unitCost.toFixed(2)}
                                                </p>
                                            </div>
                                            {selectedItemId === item.id && (
                                                <CheckCircle className="h-5 w-5 text-blue-600" />
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 flex justify-between gap-3">
                    <div>
                        <button
                            onClick={() => setIsBulkEntryOpen(true)}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2"
                        >
                            <Search className="w-4 h-4" />
                            Bulk Paste Serials
                        </button>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onCancel}
                            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAllocate}
                            disabled={loading || (!selectedItemId && selectedItemIds.length === 0)}
                            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                        >
                            {loading ? "Allocating..." : "Allocate Stock"}
                        </button>
                    </div>
                </div>

                <BulkSerialEntryModal
                    isOpen={isBulkEntryOpen}
                    onClose={() => setIsBulkEntryOpen(false)}
                    onAdd={(items) => {
                        // Just set the selected IDs from the verified items
                        const ids = items.map(i => i.id)
                        setSelectedItemIds(ids)
                        // Clear single selection to avoid confusion
                        setSelectedItemId("")
                    }}
                    title={`Bulk Allocate to ${productName}`}
                />
            </div>
        </div>
    )
}
