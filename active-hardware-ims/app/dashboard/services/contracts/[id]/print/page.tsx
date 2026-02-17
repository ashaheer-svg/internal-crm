"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"

export default function PrintContractPage() {
    const params = useParams()
    const id = params.id as string
    const [contract, setContract] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchContract = async () => {
            try {
                const res = await fetch(`/api/services/contracts/${id}`)
                if (!res.ok) throw new Error("Failed to fetch contract")
                const data = await res.json()
                setContract(data)
            } catch (error) {
                console.error(error)
            } finally {
                setLoading(false)
            }
        }
        fetchContract()
    }, [id])

    useEffect(() => {
        if (!loading && contract) {
            window.print()
        }
    }, [loading, contract])

    if (loading) return <div className="p-8 text-center">Loading contract details...</div>
    if (!contract) return <div className="p-8 text-center text-red-600">Contract not found</div>

    return (
        <div className="max-w-4xl mx-auto bg-white p-12 print:p-0 text-gray-900">
            {/* Header */}
            <div className="flex justify-between items-start mb-12 border-b pb-8">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Service Contract</h1>
                    <p className="text-gray-500">#{contract.contractNumber || 'DRAFT'}</p>
                </div>
                <div className="text-right">
                    <h2 className="text-xl font-bold text-blue-600">Active Hardware</h2>
                    <p className="text-sm text-gray-500">123 Tech Boulevard</p>
                    <p className="text-sm text-gray-500">Innovation City, ST 12345</p>
                </div>
            </div>

            {/* Client & Contract Info */}
            <div className="grid grid-cols-2 gap-12 mb-12">
                <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Client Details</h3>
                    <p className="font-bold text-lg">{contract.customer.name}</p>
                    <p className="text-gray-600">{contract.customer.address || "No address on file"}</p>
                    <p className="text-gray-600">{contract.customer.email}</p>
                </div>
                <div className="text-right">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Agreement Terms</h3>
                    <div className="space-y-1">
                        <div className="flex justify-end gap-4">
                            <span className="text-gray-600">Start Date:</span>
                            <span className="font-medium">{new Date(contract.startDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-end gap-4">
                            <span className="text-gray-600">End Date:</span>
                            <span className="font-medium">{contract.endDate ? new Date(contract.endDate).toLocaleDateString() : 'Indefinite'}</span>
                        </div>
                        <div className="flex justify-end gap-4">
                            <span className="text-gray-600">Status:</span>
                            <span className="font-medium uppercase">{contract.status}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Service Details */}
            <div className="mb-12">
                <h3 className="text-lg font-bold border-b pb-2 mb-4">Service Description</h3>
                <div className="bg-gray-50 p-6 rounded-lg mb-4">
                    <h4 className="font-bold text-lg mb-2">{contract.product.name}</h4>
                    <p className="text-gray-700 whitespace-pre-wrap">{contract.description || contract.product.description || "No description provided."}</p>
                </div>
            </div>

            {/* Financials */}
            <div className="mb-12">
                <div className="flex justify-end">
                    <div className="w-64">
                        <div className="flex justify-between py-2 border-b">
                            <span className="font-medium">Contract Value</span>
                            <span className="font-bold text-xl">${contract.contractValue?.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between py-2 text-sm text-gray-500">
                            <span>Billing Cycle</span>
                            <span>{contract.billingCycle}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Signatures */}
            <div className="mt-24 grid grid-cols-2 gap-12">
                <div>
                    <div className="border-t-2 border-gray-300 pt-4">
                        <p className="font-bold">Authorized Signature</p>
                        <p className="text-sm text-gray-500">Active Hardware</p>
                    </div>
                </div>
                <div>
                    <div className="border-t-2 border-gray-300 pt-4">
                        <p className="font-bold">Client Signature</p>
                        <p className="text-sm text-gray-500">{contract.customer.name}</p>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-12 pt-8 border-t text-center text-sm text-gray-400">
                <p>This document serves as a binding agreement between Active Hardware and the Client.</p>
            </div>
        </div>
    )
}
