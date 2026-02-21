"use client"

import { useState } from "react"
import { ArrowRightLeft, Check, X, MapPin } from "lucide-react"
import { useRouter } from "next/navigation"

type Props = {
    itemId: string
    currentLocationName: string
    locations: { id: string, name: string }[]
}

export default function InventoryItemActions({ itemId, currentLocationName, locations }: Props) {
    const router = useRouter()
    const [isTransferring, setIsTransferring] = useState(false)
    const [targetLocation, setTargetLocation] = useState("")
    const [loading, setLoading] = useState(false)

    async function handleTransfer() {
        if (!targetLocation) return
        setLoading(true)
        try {
            const res = await fetch("/api/inventory/transfer", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    inventoryItemId: itemId,
                    targetLocationId: targetLocation
                })
            })
            if (!res.ok) throw new Error("Transfer failed")

            setIsTransferring(false)
            router.refresh()
        } catch (error) {
            alert("Failed to transfer item")
        } finally {
            setLoading(false)
        }
    }

    if (isTransferring) {
        return (
            <div className="flex items-center justify-end space-x-2">
                <select
                    className="block w-32 rounded-lg border border-gray-200 p-1 text-xs shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    value={targetLocation}
                    onChange={(e) => setTargetLocation(e.target.value)}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                >
                    <option value="">Select...</option>
                    {locations.map(loc => (
                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                </select>
                <div className="flex items-center space-x-1">
                    <button
                        onClick={handleTransfer}
                        disabled={loading || !targetLocation}
                        className="p-2 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors disabled:opacity-50"
                        title="Confirm Transfer"
                    >
                        {loading ? <span className="animate-spin h-4 w-4 border-2 border-green-600 rounded-full border-t-transparent block"></span> : <Check className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={() => setIsTransferring(false)}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Cancel"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        )
    }

    // Location transfer is now handled inline in the table
    return null
}
