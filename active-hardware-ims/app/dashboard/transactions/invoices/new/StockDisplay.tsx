"use client"

import { useState, useEffect } from "react"
import { Package, AlertCircle } from "lucide-react"

type InventoryItem = {
    id: string
    serialNumber: string
    unitCost: number
    location: {
        id: string
        name: string
    }
}

type StockDisplayProps = {
    productId: string
    productName: string
    onSelectItem: (item: InventoryItem) => void
    onAddOutOfStock: () => void
    selectedItemIds: string[]
}

export default function StockDisplay({
    productId,
    productName,
    onSelectItem,
    onAddOutOfStock,
    selectedItemIds
}: StockDisplayProps) {
    const [availableStock, setAvailableStock] = useState<InventoryItem[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchAvailableStock()
    }, [productId])

    async function fetchAvailableStock() {
        setLoading(true)
        try {
            const res = await fetch('/api/inventory/available')
            const data = await res.json()
            const productStock = data.filter((item: any) => item.product.id === productId)
            setAvailableStock(productStock)
        } catch (error) {
            console.error('Failed to fetch stock:', error)
        } finally {
            setLoading(false)
        }
    }

    const availableItems = availableStock.filter(item => !selectedItemIds.includes(item.id))

    if (loading) {
        return (
            <div className="p-4 text-center text-sm text-gray-500">
                Loading stock information...
            </div>
        )
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-900">
                    Available Stock for {productName}
                </h4>
                <span className="text-xs text-gray-500">
                    {availableItems.length} available
                </span>
            </div>

            {availableItems.length === 0 ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <AlertCircle className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                    <p className="text-sm font-medium text-gray-900 mb-1">No stock available</p>
                    <p className="text-xs text-gray-500 mb-3">
                        This product is currently out of stock
                    </p>
                    <button
                        type="button"
                        onClick={onAddOutOfStock}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        <Package className="h-4 w-4 mr-2" />
                        Add as Backorder
                    </button>
                </div>
            ) : (
                <>
                    <div className="max-h-48 overflow-y-auto space-y-2 border rounded-md p-2">
                        {availableItems.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => onSelectItem(item)}
                                className="w-full text-left p-3 border rounded-md hover:bg-blue-50 hover:border-blue-300 transition-colors"
                            >
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">
                                            S/N: {item.serialNumber}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {item.location.name} • Rs. {item.unitCost.toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={onAddOutOfStock}
                        className="w-full text-sm text-blue-600 hover:text-blue-800 py-2 border border-dashed border-blue-300 rounded-md hover:bg-blue-50"
                    >
                        + Add additional quantity as backorder
                    </button>
                </>
            )}
        </div>
    )
}
