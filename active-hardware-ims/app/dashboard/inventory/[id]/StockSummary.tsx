"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Currency } from "@/components/Currency"

type InventoryItem = {
    id: string
    serialNumber: string
    status: string
    unitCost: number
    createdAt: Date
    location: {
        id: string
        name: string
    }
}

interface StockSummaryProps {
    productId: string
    inventory: InventoryItem[]
}

export default function StockSummary({ productId, inventory }: StockSummaryProps) {
    const router = useRouter()
    const [loadingLocation, setLoadingLocation] = useState<string | null>(null)

    // Group inventory by location
    const locationGroups = inventory.reduce((acc, item) => {
        const locId = item.location.id
        if (!acc[locId]) {
            acc[locId] = {
                id: locId,
                name: item.location.name,
                count: 0,
                totalValue: 0,
                items: []
            }
        }
        acc[locId].count++
        acc[locId].totalValue += item.unitCost || 0
        acc[locId].items.push(item)
        return acc
    }, {} as Record<string, { id: string; name: string; count: number; totalValue: number; items: InventoryItem[] }>)

    const locations = Object.values(locationGroups)

    async function handleApplyAverageCost(locationId: string) {
        setLoadingLocation(locationId)
        try {
            const res = await fetch('/api/inventory/apply-average-cost', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId, locationId })
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Failed to apply average cost')
            }

            alert(`Successfully updated ${data.itemsUpdated} items with average cost Rs. ${data.averageCost.toFixed(2)}`)
            router.refresh()
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Failed to apply average cost')
        } finally {
            setLoadingLocation(null)
        }
    }

    return (
        <div className="bg-white shadow sm:rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6">Stock Summary</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Overall Summary */}
                <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-gray-700 border-b pb-2">Overall Summary</h4>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-gray-500">Total Units</span>
                            <span className="font-bold text-xl text-blue-600">{inventory.length}</span>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t">
                            <span className="text-gray-500">Avg. Cost</span>
                            <div className="text-gray-900 font-semibold">
                                <Currency
                                    amount={inventory.length > 0
                                        ? (inventory.reduce((sum, item) => sum + (item.unitCost || 0), 0) / inventory.length)
                                        : 0
                                    }
                                    className="inline-block"
                                />
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-gray-500">Total Value</span>
                            <Currency
                                amount={inventory.reduce((sum, item) => sum + (item.unitCost || 0), 0)}
                                className="text-gray-900 font-bold text-lg"
                            />
                        </div>
                    </div>
                </div>

                {/* Location-Based Breakdown */}
                <div className="md:col-span-2 space-y-4">
                    <h4 className="text-sm font-semibold text-gray-700 border-b pb-2">Stock by Location</h4>
                    {locations.length === 0 ? (
                        <p className="text-sm text-gray-400 italic py-4">No stock at any location</p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {locations.map((loc) => {
                                const avgCost = loc.totalValue / loc.count
                                return (
                                    <div key={loc.id} className="bg-gradient-to-br from-blue-50 to-gray-50 rounded-lg p-4 border border-blue-100">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium text-gray-700">{loc.name}</span>
                                            <span className="text-lg font-bold text-blue-600">{loc.count}</span>
                                        </div>
                                        <div className="space-y-1 mb-3">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-gray-500">Stock Value</span>
                                                <Currency amount={loc.totalValue} className="font-semibold text-gray-900" />
                                            </div>
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-gray-500">Avg. Cost</span>
                                                <Currency amount={avgCost} className="font-semibold text-gray-900" />
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleApplyAverageCost(loc.id)}
                                            disabled={loadingLocation === loc.id}
                                            className="w-full px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            {loadingLocation === loc.id ? 'Applying...' : 'Apply Avg Cost'}
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
