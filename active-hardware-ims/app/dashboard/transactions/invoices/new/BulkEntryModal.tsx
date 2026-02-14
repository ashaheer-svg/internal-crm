"use client"

import { useState } from "react"
import { X, Upload } from "lucide-react"

type BulkEntryModalProps = {
    onAdd: (items: any[]) => void
    onClose: () => void
    excludedItemIds: string[]
}

export default function BulkEntryModal({ onAdd, onClose, excludedItemIds }: BulkEntryModalProps) {
    const [serialNumbers, setSerialNumbers] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [results, setResults] = useState<any>(null)

    async function handleProcess() {
        setLoading(true)
        setError("")
        setResults(null)

        // Split by newlines, commas, or spaces and clean up
        const numbers = serialNumbers
            .split(/[\n,\s]+/)
            .map(s => s.trim())
            .filter(s => s.length > 0)

        if (numbers.length === 0) {
            setError("Please enter at least one serial number")
            setLoading(false)
            return
        }

        try {
            const res = await fetch("/api/inventory/bulk-lookup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    serialNumbers: numbers,
                    excludedItemIds
                }),
            })

            if (!res.ok) {
                const json = await res.json()
                throw new Error(json.error || "Failed to lookup serial numbers")
            }

            const data = await res.json()
            setResults(data)

            // Auto-add found items
            if (data.found.length > 0) {
                onAdd(data.found)
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : "Something went wrong")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">Bulk Serial Number Entry</h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Enter multiple serial numbers (one per line, or separated by commas)
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-96 flex-1">
                    {error && (
                        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                            <p className="text-sm">{error}</p>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Serial Numbers
                            </label>
                            <textarea
                                value={serialNumbers}
                                onChange={(e) => setSerialNumbers(e.target.value)}
                                placeholder="SN001&#10;SN002&#10;SN003&#10;or: SN001, SN002, SN003"
                                rows={8}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Tip: You can paste from Excel or copy multiple lines
                            </p>
                        </div>

                        {results && (
                            <div className="space-y-3">
                                {results.found.length > 0 && (
                                    <div className="bg-green-50 border border-green-200 rounded-md p-3">
                                        <p className="text-sm font-medium text-green-800 mb-2">
                                            ✓ Found {results.found.length} item(s)
                                        </p>
                                        <ul className="text-xs text-green-700 space-y-1">
                                            {results.found.map((item: any) => (
                                                <li key={item.id}>
                                                    {item.serialNumber} - {item.product.brand} {item.product.name}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {results.notFound.length > 0 && (
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                                        <p className="text-sm font-medium text-yellow-800 mb-2">
                                            ⚠ Not found: {results.notFound.length} serial number(s)
                                        </p>
                                        <ul className="text-xs text-yellow-700 space-y-1">
                                            {results.notFound.map((sn: string) => (
                                                <li key={sn}>{sn}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {results.alreadySelected.length > 0 && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                                        <p className="text-sm font-medium text-blue-800 mb-2">
                                            ℹ Already selected: {results.alreadySelected.length} item(s)
                                        </p>
                                        <ul className="text-xs text-blue-700 space-y-1">
                                            {results.alreadySelected.map((sn: string) => (
                                                <li key={sn}>{sn}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 bg-gray-50 rounded-b-lg">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium"
                    >
                        {results ? "Close" : "Cancel"}
                    </button>
                    {!results && (
                        <button
                            onClick={handleProcess}
                            disabled={loading || !serialNumbers.trim()}
                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
                        >
                            <Upload className="w-4 h-4 mr-2" />
                            {loading ? "Processing..." : "Process Serial Numbers"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
