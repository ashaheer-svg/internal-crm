"use client"

import { useState } from "react"
import { Upload, X, Check, AlertCircle, Loader2 } from "lucide-react"

interface BulkSerialEntryModalProps {
    isOpen: boolean
    onClose: () => void
    onAdd: (items: any[]) => void
    title?: string
}

export default function BulkSerialEntryModal({ isOpen, onClose, onAdd, title = "Bulk Add Serials" }: BulkSerialEntryModalProps) {
    const [input, setInput] = useState("")
    const [verifying, setVerifying] = useState(false)
    const [results, setResults] = useState<{
        valid: any[]
        invalid: string[]
        notFound: string[]
    } | null>(null)

    if (!isOpen) return null

    async function handleVerify() {
        if (!input.trim()) return

        setVerifying(true)
        setResults(null)

        // Split by newlines, commas, or spaces and filter empty
        const serials = input.split(/[\n, ]+/).map(s => s.trim()).filter(s => s.length > 0)

        try {
            const res = await fetch("/api/inventory/validate-serials", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ serials })
            })

            const data = await res.json()
            setResults(data)
        } catch (error) {
            console.error("Validation failed", error)
            // Handle error appropriately
        } finally {
            setVerifying(false)
        }
    }

    function handleAdd() {
        if (results && results.valid.length > 0) {
            onAdd(results.valid)
            onClose()
            setInput("")
            setResults(null)
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
                <div className="px-6 py-4 border-b flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    {!results ? (
                        <div className="space-y-4">
                            <label className="block text-sm font-medium text-gray-700">
                                Enter Serial Numbers
                            </label>
                            <p className="text-xs text-gray-500">
                                Paste list of serial numbers (one per line, comma or space separated).
                            </p>
                            <textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                rows={10}
                                className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                                placeholder="SN123456&#10;SN789012&#10;..."
                            />
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex gap-4 text-sm">
                                <div className="flex items-center text-green-600">
                                    <Check className="w-4 h-4 mr-1" />
                                    <span className="font-medium">{results.valid.length} Valid</span>
                                </div>
                                {(results.notFound.length > 0 || results.invalid.length > 0) && (
                                    <div className="flex items-center text-red-600">
                                        <AlertCircle className="w-4 h-4 mr-1" />
                                        <span className="font-medium">
                                            {results.notFound.length + results.invalid.length} Issues
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Valid Items Preview */}
                            {results.valid.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-medium text-gray-900 mb-2">Ready to Add</h3>
                                    <div className="bg-green-50 rounded-md border border-green-200 overflow-hidden max-h-40 overflow-y-auto">
                                        <table className="min-w-full divide-y divide-green-200">
                                            <tbody className="divide-y divide-green-200">
                                                {results.valid.map((item: any) => (
                                                    <tr key={item.id}>
                                                        <td className="px-4 py-2 text-xs font-medium text-green-800 font-mono">
                                                            {item.serialNumber}
                                                        </td>
                                                        <td className="px-4 py-2 text-xs text-green-700">
                                                            {item.product.brand} {item.product.name}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Issues List */}
                            {(results.notFound.length > 0 || results.invalid.length > 0) && (
                                <div>
                                    <h3 className="text-sm font-medium text-gray-900 mb-2">Errors</h3>
                                    <div className="bg-red-50 rounded-md border border-red-200 p-4 space-y-2 max-h-40 overflow-y-auto">
                                        {results.notFound.map(sn => (
                                            <div key={sn} className="text-xs text-red-700 flex gap-2">
                                                <span className="font-mono font-medium">{sn}:</span>
                                                <span>Not found in inventory (or not Available)</span>
                                            </div>
                                        ))}
                                        {results.invalid.map(sn => (
                                            <div key={sn} className="text-xs text-red-700 flex gap-2">
                                                <span className="font-mono font-medium">{sn}:</span>
                                                <span>Invalid format or status</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
                    {results ? (
                        <>
                            <button
                                onClick={() => setResults(null)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                            >
                                Back
                            </button>
                            <button
                                onClick={handleAdd}
                                disabled={results.valid.length === 0}
                                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Add {results.valid.length} Items
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleVerify}
                                disabled={verifying || !input.trim()}
                                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {verifying && <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />}
                                Verify Serials
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
