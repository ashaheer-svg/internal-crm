"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { useRouter } from "next/navigation"

type EditWarrantyModalProps = {
    claim: {
        id: string
        customerName: string
        description: string
        status: string
    }
    onClose: () => void
    onSave: (updatedClaim: any) => void
}

export default function EditWarrantyModal({ claim, onClose, onSave }: EditWarrantyModalProps) {
    const router = useRouter()
    const [customerName, setCustomerName] = useState(claim.customerName)
    const [description, setDescription] = useState(claim.description)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError("")

        try {
            const res = await fetch(`/api/warranty/${claim.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    customerName,
                    description
                })
            })

            if (!res.ok) {
                const json = await res.json()
                throw new Error(json.error || "Failed to update warranty claim")
            }

            const updatedClaim = await res.json()
            onSave(updatedClaim)
            router.refresh()
            onClose()
        } catch (e) {
            setError(e instanceof Error ? e.message : "Something went wrong")
        } finally {
            setLoading(false)
        }
    }

    const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    const buttonPrimaryClass = "px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
    const buttonSecondaryClass = "px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium"

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full flex flex-col">
                <div className="flex items-center justify-between p-6 border-b">
                    <h2 className="text-xl font-semibold text-gray-900">Edit Warranty Claim</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                            <p className="text-sm">{error}</p>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
                        <input
                            type="text"
                            required
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            className={inputClass}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Issue Description *</label>
                        <textarea
                            required
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={4}
                            className={inputClass}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={onClose} className={buttonSecondaryClass}>
                            Cancel
                        </button>
                        <button type="submit" disabled={loading} className={buttonPrimaryClass}>
                            {loading ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
