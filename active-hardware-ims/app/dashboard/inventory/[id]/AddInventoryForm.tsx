"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"

type Props = {
    productId: string
    locations: { id: string, name: string }[]
}

export default function AddInventoryForm({ productId, locations }: Props) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [serialInput, setSerialInput] = useState("")
    const [locationId, setLocationId] = useState(locations[0]?.id || "")
    const [unitCost, setUnitCost] = useState("")
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")

    // Parse serial numbers from input
    function parseSerialNumbers(input: string): string[] {
        return input
            .split(/[,\n\s]+/)
            .map(s => s.trim())
            .filter(s => s.length > 0)
    }

    const serialNumbers = parseSerialNumbers(serialInput)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!locationId) {
            setError("Please select a location first")
            return
        }

        if (serialNumbers.length === 0) {
            setError("Please enter at least one serial number")
            return
        }

        setLoading(true)
        setError("")
        setSuccess("")

        try {
            let successCount = 0
            let failedSerials: string[] = []

            // Add each serial number individually
            for (const serial of serialNumbers) {
                try {
                    const res = await fetch("/api/inventory", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            productId,
                            serialNumber: serial,
                            locationId,
                            unitCost: unitCost ? Number(unitCost) : 0
                        }),
                    })

                    if (!res.ok) {
                        const json = await res.json()
                        failedSerials.push(`${serial}: ${json.error}`)
                    } else {
                        successCount++
                    }
                } catch (e) {
                    failedSerials.push(`${serial}: Network error`)
                }
            }

            // Show results
            if (successCount > 0) {
                setSuccess(`✓ Successfully added ${successCount} item(s) to stock`)
                setSerialInput("")
                setUnitCost("")
                router.refresh()
            }

            if (failedSerials.length > 0) {
                setError(`Failed to add ${failedSerials.length} item(s):\n${failedSerials.join('\n')}`)
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : "Error adding items")
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                <div className="bg-red-50 border-l-4 border-red-400 p-3">
                    <p className="text-sm text-red-700 whitespace-pre-line">{error}</p>
                </div>
            )}
            {success && (
                <div className="bg-green-50 border-l-4 border-green-400 p-3">
                    <p className="text-sm text-green-700">{success}</p>
                </div>
            )}

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Serial Number(s) *
                    {serialNumbers.length > 0 && (
                        <span className="ml-2 text-blue-600 font-semibold">
                            ({serialNumbers.length} item{serialNumbers.length !== 1 ? 's' : ''})
                        </span>
                    )}
                </label>
                <textarea
                    required
                    rows={4}
                    autoFocus
                    className="block w-full rounded-md border-gray-300 shadow-sm border p-3 text-sm font-mono"
                    placeholder="Enter serial numbers separated by comma, space, or new line&#10;Example:&#10;SN001, SN002, SN003&#10;or paste multiple lines"
                    value={serialInput}
                    onChange={(e) => setSerialInput(e.target.value)}
                />
                <p className="mt-1 text-xs text-gray-500">
                    💡 Tip: Paste multiple serial numbers from Excel/CSV - separated by commas, spaces, or line breaks
                </p>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Receive At Location *</label>
                <select
                    required
                    className="block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm"
                    value={locationId}
                    onChange={(e) => setLocationId(e.target.value)}
                >
                    {locations.map(loc => (
                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                    {locations.length === 0 && <option value="">No locations available</option>}
                </select>
                {locations.length === 0 && (
                    <p className="mt-1 text-xs text-red-500">Create a location first.</p>
                )}
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit Cost *</label>
                <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    className="block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm"
                    placeholder="0.00"
                    value={unitCost}
                    onChange={(e) => setUnitCost(e.target.value)}
                />
                <p className="mt-1 text-xs text-gray-500">Cost per unit (applies to all items)</p>
            </div>

            <button
                type="submit"
                disabled={loading || locations.length === 0 || serialNumbers.length === 0}
                className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
                <Plus className="w-4 h-4 mr-2" />
                {loading ? "Adding..." : `Add ${serialNumbers.length} Item${serialNumbers.length !== 1 ? 's' : ''} to Stock`}
            </button>
        </form>
    )
}
