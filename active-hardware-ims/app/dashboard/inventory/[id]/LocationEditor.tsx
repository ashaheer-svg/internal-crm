"use client"

import { useState } from "react"
import { Check, X, Pencil } from "lucide-react"
import { useRouter } from "next/navigation"

type Props = {
    itemId: string
    currentLocationId: string
    currentLocationName: string
    locations: { id: string, name: string }[]
}

export default function LocationEditor({ itemId, currentLocationId, currentLocationName, locations }: Props) {
    const router = useRouter()
    const [isEditing, setIsEditing] = useState(false)
    const [selectedLocation, setSelectedLocation] = useState(currentLocationId)
    const [loading, setLoading] = useState(false)

    async function handleSave() {
        if (selectedLocation === currentLocationId) {
            setIsEditing(false)
            return
        }

        setLoading(true)
        try {
            const res = await fetch("/api/inventory/transfer", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    inventoryItemId: itemId,
                    targetLocationId: selectedLocation
                })
            })
            if (!res.ok) throw new Error("Transfer failed")

            setIsEditing(false)
            router.refresh()
        } catch (error) {
            console.error(error)
            alert("Failed to update location")
        } finally {
            setLoading(false)
        }
    }

    if (isEditing) {
        return (
            <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                <select
                    className="block w-full min-w-[120px] max-w-[200px] rounded-lg border border-gray-200 px-2 py-1 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    autoFocus
                >
                    {locations.map(loc => (
                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                </select>
                <div className="flex items-center shrink-0">
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors disabled:opacity-50"
                    >
                        {loading ? <span className="animate-spin h-3 w-3 border-2 border-green-600 rounded-full border-t-transparent block" /> : <Check className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={() => {
                            setIsEditing(false)
                            setSelectedLocation(currentLocationId)
                        }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div
            className="group flex items-center gap-2 cursor-pointer py-1 -my-1 rounded hover:bg-gray-50 px-2 -mx-2 transition-colors duration-150"
            onClick={() => setIsEditing(true)}
        >
            <span className="text-sm text-gray-900 truncate max-w-[150px]">{currentLocationName}</span>
            <Pencil className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
    )
}
