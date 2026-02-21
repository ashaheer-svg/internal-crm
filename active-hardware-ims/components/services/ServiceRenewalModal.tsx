"use client"

import { useState } from "react"

import { X } from "lucide-react"

interface ServiceRenewalModalProps {
    isOpen: boolean
    onClose: () => void
    contract: any
    onRenew: (contractId: string, durationValue: number, durationUnit: string) => Promise<void>
}

export default function ServiceRenewalModal({ isOpen, onClose, contract, onRenew }: ServiceRenewalModalProps) {
    const [durationValue, setDurationValue] = useState(contract?.durationValue || 1)
    const [durationUnit, setDurationUnit] = useState(contract?.durationUnit || "YEAR")
    const [loading, setLoading] = useState(false)

    if (!isOpen || !contract) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            await onRenew(contract.id, durationValue, durationUnit)
            onClose()
        } catch (error) {
            console.error("Renewal failed", error)
            alert("Failed to renew contract")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                <div className="flex justify-between items-center p-6 border-b">
                    <h3 className="text-lg font-medium text-gray-900">Renew Contract</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <p className="text-sm text-gray-500 mb-2">Renewing service for:</p>
                        <p className="font-medium text-gray-900">{contract.product.name}</p>
                        <p className="text-sm text-gray-500">Customer: {contract.customer.name}</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">New Duration</label>
                        <div className="mt-1 flex gap-2">
                            <input
                                type="number"
                                value={durationValue}
                                onChange={(e) => setDurationValue(Number(e.target.value))}
                                min={1}
                                className="block w-24 rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            />
                            <select
                                value={durationUnit}
                                onChange={(e) => setDurationUnit(e.target.value)}
                                className="block flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                            >
                                <option value="DAY">Days</option>
                                <option value="WEEK">Weeks</option>
                                <option value="MONTH">Months</option>
                                <option value="YEAR">Years</option>
                            </select>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="inline-flex items-center px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
                        >
                            {loading ? "Renewing..." : "Confirm Renewal"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
