"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Calendar, AlertTriangle, CheckCircle, Clock, Plus, AlertCircle, Package } from "lucide-react"
import Link from "next/link"
import ServiceRenewalModal from "./ServiceRenewalModal"

interface ServiceDashboardClientProps {
    expiring: any[]
    active: any[]
    rentals: any[]
}

export default function ServiceDashboardClient({ expiring, active, rentals }: ServiceDashboardClientProps) {
    const router = useRouter()
    const [selectedContract, setSelectedContract] = useState<any>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)

    const handleRenewClick = (contract: any) => {
        setSelectedContract(contract)
        setIsModalOpen(true)
    }

    const onRenewSubmit = async (contractId: string, durationValue: number, durationUnit: string) => {
        try {
            const res = await fetch('/api/services/renew', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contractId, durationValue, durationUnit })
            })

            if (!res.ok) throw new Error("Failed to renew")

            router.refresh()
            setIsModalOpen(false)
        } catch (error) {
            console.error(error)
            throw error
        }
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Service Management</h1>
                <div className="flex gap-2">
                    <Link href="/dashboard/services/new-agreement" className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                        <Plus className="w-4 h-4 mr-2" />
                        New Agreement
                    </Link>
                    <Link href="/dashboard/services/catalog" className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                        Service Catalog
                    </Link>
                </div>
            </div>

        </tbody>
                        </table >
                    </div >
                )
}
            </div >

    {/* Active Contracts - Full Width */ }
    < div className = "bg-white shadow rounded-lg p-6" >
        <div className="flex items-center mb-4">
            <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
            <h2 className="text-lg font-medium text-gray-900">Active Contracts</h2>
        </div>
{
    active.length === 0 ? (
        <p className="text-gray-500 text-sm">No active contracts.</p>
    ) : (
    <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
            <thead>
                <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Partner</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Start Date</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">End Date</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
                {active.map(contract => (
                    <tr key={contract.id}>
                        <td className="px-3 py-2 text-sm text-gray-900 font-medium">{contract.customer.name}</td>
                        <td className="px-3 py-2 text-sm text-gray-500">
                            {contract.product.name}
                            <div className="text-xs text-gray-400">{contract.product.sku}</div>
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-500">
                            {contract.partner?.name || '-'}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-500">
                            {contract.startDate ? new Date(contract.startDate).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-500">
                            {contract.endDate ? new Date(contract.endDate).toLocaleDateString() : 'Indefinite'}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-500">
                            <Link
                                href={`/dashboard/services/contracts/${contract.id}/edit`}
                                className="text-blue-600 hover:text-blue-900 font-medium text-xs border border-blue-200 px-2 py-1 rounded hover:bg-blue-50"
                            >
                                Edit
                            </Link>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
)
}
            </div >

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Rental Assets moved here (or keep below if full width is preferred) */}

                {/* Rental Assets */}
                <div className="bg-white shadow rounded-lg p-6">
                    <div className="flex items-center mb-4">
                        <Package className="w-5 h-5 text-purple-600 mr-2" />
                        <h2 className="text-lg font-medium text-gray-900">Rental Assets</h2>
                    </div>
                    {rentals.length === 0 ? (
                        <p className="text-gray-500 text-sm">No rental assets found.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead>
                                    <tr>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Asset</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Current User</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {rentals.map(asset => (
                                        <tr key={asset.id}>
                                            <td className="px-3 py-2 text-sm text-gray-900">
                                                {asset.name}
                                                <div className="text-xs text-gray-400">{asset.serialNumber}</div>
                                            </td>
                                            <td className="px-3 py-2 text-sm">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${asset.status === 'AVAILABLE' ? 'bg-green-100 text-green-800' :
                                                    asset.status === 'RENTED' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                                                    }`}>
                                                    {asset.status}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-sm text-gray-500">
                                                {asset.currentContract?.customer?.name || '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            <ServiceRenewalModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                contract={selectedContract}
                onRenew={onRenewSubmit}
            />
        </div >
    )
}
