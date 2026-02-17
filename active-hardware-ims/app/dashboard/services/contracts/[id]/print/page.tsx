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
            {/* Header - Matching Report Style */}
            <div className="flex justify-between items-start mb-8 border-b-2 border-black pb-4">
                <div>
                    <h1 className="text-3xl font-black text-blue-600 uppercase tracking-tighter leading-none">Active Solutions</h1>
                    <p className="text-xs text-gray-500 font-bold leading-tight mt-1">32/2-2/1 Nandimithra Place, Colombo 6, Sri Lanka.</p>
                </div>
                <div className="text-right">
                    <h2 className="text-xl font-bold text-gray-900 uppercase tracking-tight">Service Contract</h2>
                    <p className="text-sm text-gray-600 font-medium">#{contract.contractNumber || 'DRAFT'}</p>
                </div>
            </div>

            {/* Client & Contract Info */}
            <div className="grid grid-cols-2 gap-12 mb-8">
                <div>
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Client Details</h3>
                    <p className="font-bold text-lg">{contract.customer.name}</p>
                    <p className="text-sm text-gray-600 whitespace-pre-line">{contract.customer.address || "No address on file"}</p>
                    <p className="text-sm text-gray-600 mt-1">{contract.customer.email}</p>
                </div>
                <div className="text-right">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Agreement Terms</h3>
                    <div className="space-y-1 text-sm">
                        <div className="flex justify-end gap-4">
                            <span className="text-gray-600">Period:</span>
                            <span className="font-medium">
                                {new Date(contract.startDate).toLocaleDateString()} - {contract.endDate ? new Date(contract.endDate).toLocaleDateString() : 'Indefinite'}
                            </span>
                        </div>
                        <div className="flex justify-end gap-4">
                            <span className="text-gray-600">Status:</span>
                            <span className="font-medium uppercase">{contract.status}</span>
                        </div>
                        {contract.partner && (
                            <div className="flex justify-end gap-4">
                                <span className="text-gray-600">Partner:</span>
                                <span className="font-medium">{contract.partner.name}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Service Details */}
            <div className="mb-8">
                <h3 className="text-sm font-bold text-gray-900 border-b border-gray-300 pb-1 mb-3 uppercase">Service Description</h3>
                <div className="bg-gray-50 p-4 rounded-lg mb-4 border border-gray-100">
                    <h4 className="font-bold text-base mb-1">{contract.product.name}</h4>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{contract.description || contract.product.description || "No description provided."}</p>
                </div>
            </div>

            {/* Rental Assets */}
            {contract.rentalAssets && contract.rentalAssets.length > 0 && (
                <div className="mb-8">
                    <h3 className="text-sm font-bold text-gray-900 border-b border-gray-300 pb-1 mb-3 uppercase">Allocated Rental Assets</h3>
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                            <tr>
                                <th className="px-3 py-2">Asset Name</th>
                                <th className="px-3 py-2">Serial Number</th>
                                <th className="px-3 py-2">Notes</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {contract.rentalAssets.map((asset: any) => (
                                <tr key={asset.id}>
                                    <td className="px-3 py-2 font-medium">{asset.name}</td>
                                    <td className="px-3 py-2 font-mono text-gray-600">{asset.serialNumber}</td>
                                    <td className="px-3 py-2 text-gray-500">{asset.notes || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Financials */}
            <div className="mb-12 border-t border-black pt-4">
                <div className="flex justify-end">
                    <div className="w-64">
                        <div className="flex justify-between py-2">
                            <span className="font-bold text-lg">Contract Value</span>
                            <span className="font-bold text-lg">Rs. {contract.contractValue?.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between py-1 text-xs text-gray-500">
                            <span>Billing Cycle</span>
                            <span>{contract.billingCycle}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Signatures */}
            <div className="mt-16 grid grid-cols-2 gap-12 print:break-inside-avoid">
                <div>
                    <div className="border-t border-gray-400 pt-2">
                        <p className="font-bold text-sm">Authorized Signature</p>
                        <p className="text-xs text-gray-500">Active Solutions</p>
                    </div>
                </div>
                <div>
                    <div className="border-t border-gray-400 pt-2">
                        <p className="font-bold text-sm">Client Signature</p>
                        <p className="text-xs text-gray-500">{contract.customer.name}</p>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-8 pt-4 border-t border-gray-200 text-center text-xs text-gray-400">
                <p>This document is computer generated and valid without a seal.</p>
            </div>
        </div>
    )
}
