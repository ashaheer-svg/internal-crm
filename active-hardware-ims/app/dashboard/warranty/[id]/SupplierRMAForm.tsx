"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"

interface Supplier {
    id: string
    name: string
}

interface SupplierRMAFormProps {
    claimId: string
    defectiveItemId: string
}

export default function SupplierRMAForm({ claimId, defectiveItemId }: SupplierRMAFormProps) {
    const router = useRouter()
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [suppliers, setSuppliers] = useState<Supplier[]>([])
    const [error, setError] = useState<string | null>(null)

    // Form states
    const [supplierId, setSupplierId] = useState("")
    const [supplierRmaRef, setSupplierRmaRef] = useState("")
    const [notes, setNotes] = useState("")

    useEffect(() => {
        if (isOpen && suppliers.length === 0) {
            // Fetch suppliers
            fetch('/api/crm/customers?isSupplier=true')
                .then(res => res.json())
                .then(data => {
                    // Filter just in case or assume correct
                    setSuppliers(data.filter((c: any) => c.isSupplier))
                })
                .catch(err => console.error("Failed to load suppliers", err))
        }
    }, [isOpen, suppliers.length])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!supplierId) {
            setError("Please select a supplier")
            return
        }

        setLoading(true)
        setError(null)

        try {
            const res = await fetch('/api/supplier-rma', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    defectiveItemId,
                    supplierId,
                    supplierRmaRef,
                    notes,
                    warrantyClaimId: claimId
                })
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || "Failed to create Supplier RMA")
            }

            setIsOpen(false)
            router.refresh()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
                <Plus className="-ml-1 mr-2 h-5 w-5" />
                Initiate Supplier RMA
            </button>
        )
    }

    return (
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 mt-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Initiate Supplier RMA</h4>
            {error && (
                <div className="mb-3 p-2 bg-red-50 text-red-700 text-xs rounded-md">
                    {error}
                </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                    <label className="block text-xs font-medium text-gray-700">Supplier</label>
                    <select
                        value={supplierId}
                        onChange={(e) => setSupplierId(e.target.value)}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    >
                        <option value="">Select a Supplier</option>
                        {suppliers.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-700">Supplier RMA Reference (Optional)</label>
                    <input
                        type="text"
                        value={supplierRmaRef}
                        onChange={(e) => setSupplierRmaRef(e.target.value)}
                        placeholder="e.g. Tick-12345"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-700">Notes (Optional)</label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={2}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                </div>

                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className="px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? 'Submitting...' : 'Submit'}
                    </button>
                </div>
            </form>
        </div>
    )
}
