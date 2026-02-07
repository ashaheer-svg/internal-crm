"use client"

import { useState } from "react"
import { ArrowRightLeft } from "lucide-react"
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
            <div className="flex items-center space-x-2">
                <select
                    className="block w-32 rounded-md border-gray-300 shadow-sm border p-1 text-xs"
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
                <button
                    onClick={handleTransfer}
                    disabled={loading || !targetLocation}
                    className="text-green-600 hover:text-green-800 text-xs font-bold"
                >
                    {loading ? "..." : "Confirm"}
                </button>
                <button
                    onClick={() => setIsTransferring(false)}
                    className="text-gray-500 hover:text-gray-700 text-xs"
                >
                    Cancel
                </button>
            </div>
        )
    }

    return (
        <button
            onClick={() => setIsTransferring(true)}
            className="text-blue-600 hover:text-blue-900 flex items-center text-xs"
            title="Transfer Stock"
        >
            <ArrowRightLeft className="w-3.5 h-3.5 mr-1" />
            Move
        </button>
    )
}
