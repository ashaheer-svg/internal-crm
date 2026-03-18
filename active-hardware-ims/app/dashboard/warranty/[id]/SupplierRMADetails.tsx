"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Truck, CheckCircle, HelpCircle, Archive, Printer } from "lucide-react"
import { formatDate } from "@/lib/utils"

interface SupplierRMADetailsProps {
    rma: {
        id: string
        rmaNumber: string
        supplierRmaRef: string | null
        shippedAt: Date | string | null
        notes: string | null
        status: string
        supplier: { name: string }
        outcome: string | null
        outcomeNotes: string | null
        resolvedAt: Date | string | null
        creditNoteRef: string | null
        creditNoteValue: number | null
        receivedItemId: string | null
        receivedItem?: {
            serialNumber: string
            product: { name: string, model: string }
        } | null
    }
}

export default function SupplierRMADetails({ rma }: SupplierRMADetailsProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [isResolveModalOpen, setIsResolveModalOpen] = useState(false)

    // Form states for Ship
    const [shippedAt, setShippedAt] = useState(new Date().toISOString().split('T')[0])
    const [supplierRmaRef, setSupplierRmaRef] = useState(rma.supplierRmaRef || "")

    // Form states for Resolve Outcome
    const [outcome, setOutcome] = useState("")
    const [outcomeNotes, setOutcomeNotes] = useState("")
    const [receivedItemId, setReceivedItemId] = useState("")
    const [creditNoteRef, setCreditNoteRef] = useState("")
    const [creditNoteValue, setCreditNoteValue] = useState("")

    const handleShip = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const res = await fetch(`/api/supplier-rma/${rma.id}/ship`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ shippedAt, supplierRmaRef })
            })
            if (!res.ok) throw new Error("Failed to ship")
            router.refresh()
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handleResolve = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const res = await fetch(`/api/supplier-rma/${rma.id}/resolve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    outcome,
                    outcomeNotes,
                    receivedItemId: outcome === 'NEW_UNIT' ? receivedItemId : undefined,
                    creditNoteRef: outcome === 'CREDIT_NOTE' ? creditNoteRef : undefined,
                    creditNoteValue: outcome === 'CREDIT_NOTE' ? creditNoteValue : undefined
                })
            })
            if (!res.ok) throw new Error("Failed to resolve")
            setIsResolveModalOpen(false)
            router.refresh()
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'PENDING': return 'bg-yellow-100 text-yellow-800'
            case 'SHIPPED': return 'bg-blue-100 text-blue-800'
            case 'AWAITING_RESPONSE': return 'bg-orange-100 text-orange-800'
            case 'RESOLVED': return 'bg-green-100 text-green-800'
            case 'REJECTED': return 'bg-red-100 text-red-800'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    return (
        <div className="border border-gray-200 rounded-lg p-4 bg-white">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-1">
                        <Archive className="w-4 h-4 text-blue-500" />
                        Supplier RMA: {rma.rmaNumber}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">Supplier: {rma.supplier.name}</p>
                </div>
                <div className="flex gap-2 items-center">
                    <span className={`px-2 py-0.5 text-xs rounded-full font-semibold ${getStatusStyle(rma.status)}`}>
                        {rma.status}
                    </span>
                    {rma.status === 'RESOLVED' && (
                        <button
                            onClick={() => window.open(`/dashboard/supplier-rma/${rma.id}/print`, '_blank')}
                            className="p-1 rounded text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                            title="Print Supplier GRN"
                        >
                            <Printer className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs mb-4">
                <div>
                    <span className="text-gray-500">Supplier Ref:</span>
                    <p className="font-medium text-gray-800">{rma.supplierRmaRef || 'N/A'}</p>
                </div>
                <div>
                    <span className="text-gray-500">Shipped At:</span>
                    <p className="font-medium text-gray-800">{rma.shippedAt ? formatDate(rma.shippedAt) : 'Not Shipped'}</p>
                </div>
                {rma.resolvedAt && (
                    <>
                        <div>
                            <span className="text-gray-500">Resolved At:</span>
                            <p className="font-medium text-gray-800">{formatDate(rma.resolvedAt)}</p>
                        </div>
                        <div>
                            <span className="text-gray-500">Outcome:</span>
                            <p className="font-medium text-blue-600 font-semibold">{rma.outcome}</p>
                        </div>
                    </>
                )}
            </div>

            {/* Actions for PENDING */}
            {rma.status === 'PENDING' && (
                <form onSubmit={handleShip} className="border-t pt-3 mt-2 space-y-2">
                    <h5 className="text-xs font-semibold text-gray-700">Mark as Shipped</h5>
                    <div className="flex gap-3">
                        <div className="flex-1">
                            <label className="block text-[10px] text-gray-500">Ship Date</label>
                            <input
                                type="date"
                                value={shippedAt}
                                onChange={(e) => setShippedAt(e.target.value)}
                                className="block w-full border-gray-300 rounded-md text-xs py-1"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-[10px] text-gray-500">Supplier Ticket #</label>
                            <input
                                type="text"
                                value={supplierRmaRef}
                                onChange={(e) => setSupplierRmaRef(e.target.value)}
                                placeholder="Ref #"
                                className="block w-full border-gray-300 rounded-md text-xs py-1"
                            />
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full mt-2 inline-flex justify-center items-center px-3 py-1.5 border border-transparent shadow-sm text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                        <Truck className="-ml-1 mr-1.5 h-4 w-4" />
                        Ship to Supplier
                    </button>
                </form>
            )}

            {/* Actions for SHIPPED */}
            {rma.status === 'SHIPPED' && (
                <div className="border-t pt-3 mt-2">
                    <button
                        onClick={() => setIsResolveModalOpen(true)}
                        className="w-full inline-flex justify-center items-center px-3 py-1.5 border border-transparent shadow-sm text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                    >
                        <CheckCircle className="-ml-1 mr-1.5 h-4 w-4" />
                        Record Outcome
                    </button>
                </div>
            )}

            {/* Resolve Modal */}
            {isResolveModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-96">
                        <h4 className="text-sm font-bold text-gray-900 mb-4">Record Supplier RMA Outcome</h4>
                        <form onSubmit={handleResolve} className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700">Outcome</label>
                                <select
                                    value={outcome}
                                    onChange={(e) => setOutcome(e.target.value)}
                                    required
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm"
                                >
                                    <option value="">Select Outcome</option>
                                    <option value="REPAIRED">Repaired</option>
                                    <option value="NEW_UNIT">New Unit Given</option>
                                    <option value="CREDIT_NOTE">Credit Note Issued</option>
                                    <option value="REJECTED">Rejected by Supplier</option>
                                </select>
                            </div>

                            {outcome === 'NEW_UNIT' && (
                                <div>
                                    <label className="block text-xs font-medium text-gray-700">Received Item ID (Serial)</label>
                                    <input
                                        type="text"
                                        value={receivedItemId}
                                        onChange={(e) => setReceivedItemId(e.target.value)}
                                        placeholder="Paste Item UUID"
                                        required
                                        className="mt-1 block w-full border-gray-300 rounded-md text-sm"
                                    />
                                    <span className="text-[10px] text-gray-400">Add the item back with same serial to populate inventory first.</span>
                                </div>
                            )}

                            {outcome === 'CREDIT_NOTE' && (
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700">CN Ref</label>
                                        <input
                                            type="text"
                                            value={creditNoteRef}
                                            onChange={(e) => setCreditNoteRef(e.target.value)}
                                            required
                                            className="mt-1 block w-full border-gray-300 rounded-md text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700">Value</label>
                                        <input
                                            type="number"
                                            value={creditNoteValue}
                                            onChange={(e) => setCreditNoteValue(e.target.value)}
                                            required
                                            className="mt-1 block w-full border-gray-300 rounded-md text-sm"
                                        />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-medium text-gray-700">Resolution Notes (Optional)</label>
                                <textarea
                                    value={outcomeNotes}
                                    onChange={(e) => setOutcomeNotes(e.target.value)}
                                    rows={2}
                                    className="mt-1 block w-full border-gray-300 rounded-md text-sm"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-3">
                                <button
                                    type="button"
                                    onClick={() => setIsResolveModalOpen(false)}
                                    className="px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                                >
                                    {loading ? 'Submitting...' : 'Save Resolution'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
