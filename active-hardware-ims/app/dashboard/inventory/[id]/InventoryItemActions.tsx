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
                <div className="flex items-center space-x-1">
                    <button
                        onClick={handleTransfer}
                        disabled={loading || !targetLocation}
                        className="p-1 rounded-full text-green-600 hover:bg-green-100 hover:text-green-800 transition-colors"
                        title="Confirm Transfer"
                    >
                        {loading ? <span className="animate-spin h-4 w-4 border-2 border-green-600 rounded-full border-t-transparent block"></span> : <Check className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={() => setIsTransferring(false)}
                        className="p-1 rounded-full text-red-500 hover:bg-red-100 hover:text-red-700 transition-colors"
                        title="Cancel"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        )
    }

    return (
        <button
            onClick={() => setIsTransferring(true)}
            className="text-blue-600 hover:text-blue-900 hover:bg-blue-50 p-1.5 rounded-full transition-colors flex items-center justify-center"
            title="Transfer Location"
        >
            <ArrowRightLeft className="w-4 h-4" />
        </button>
    )
}
