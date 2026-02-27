"use client"

import { use, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, CheckCircle, AlertTriangle, Hammer, X, Save, AlertCircle, Package } from "lucide-react"
import { formatDate } from "@/lib/utils"

interface BuildOrder {
    id: string
    orderNumber: string
    customerName: string
    status: string
    createdAt: string
    buildNotes: string | null
    items: {
        id: string
        quantity: number
        product: {
            name: string
            brand: string
            model: string
            serviceDefinition?: {
                type: string
                durationValue: number
                durationUnit: string
            } | null
        }
        reservedItems: {
            id: string
            serialNumber: string
            location?: { name: string } | null
        }[]
        serviceStartDate?: string | null
        serviceEndDate?: string | null
    }[]
}

export default function BuildDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()

    const [order, setOrder] = useState<BuildOrder | null>(null)
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState(false)
    const [buildNotes, setBuildNotes] = useState("")
    const [verifyingSerials, setVerifyingSerials] = useState<Record<string, boolean>>({})

    useEffect(() => {
        fetchOrder()
    }, [id])

    const fetchOrder = async () => {
        try {
            const res = await fetch(`/api/delivery-orders/${id}`)
            if (!res.ok) throw new Error("Failed to load order")
            const data = await res.json()
            setOrder(data)
            setBuildNotes(data.buildNotes || "")

            // Mark as BUILDING if currently READY_FOR_BUILD
            if (data.status === 'READY_FOR_BUILD') {
                updateStatus('BUILDING')
            }
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const updateStatus = async (status: string) => {
        try {
            await fetch(`/api/delivery-orders/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            })
        } catch (e) {
            console.error("Status update failed", e)
        }
    }

    const handleToggleVerify = (serialId: string) => {
        setVerifyingSerials((prev: Record<string, boolean>) => ({
            ...prev,
            [serialId]: !prev[serialId]
        }))
    }

    const handleRejectItem = async (inventoryItemId: string) => {
        if (!confirm("Are you sure you want to REJECT this item? This SN will be released back to inventory and the allocation will be reduced.")) return

        setActionLoading(true)
        try {
            const res = await fetch(`/api/delivery-orders/${id}/build?inventoryItemId=${inventoryItemId}`, {
                method: 'DELETE'
            })
            if (!res.ok) throw new Error("Rejection failed")
            await fetchOrder()
        } catch (e) {
            alert("Failed to reject item")
        } finally {
            setActionLoading(false)
        }
    }

    const handleCompleteBuild = async () => {
        if (!confirm("Is the build complete? The order will be sent to the Accounts Manager for shipping.")) return

        setActionLoading(true)
        try {
            const res = await fetch(`/api/delivery-orders/${id}/build`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ buildNotes })
            })
            if (!res.ok) throw new Error("Completion failed")
            router.push('/dashboard/build')
        } catch (e) {
            alert("Failed to complete build")
        } finally {
            setActionLoading(false)
        }
    }

    if (loading) return <div className="p-8 text-center text-gray-500">Loading build details...</div>
    if (!order) return <div className="p-8 text-center text-red-500">Order not found</div>

    const totalPhysicalToVerify = order.items.reduce((sum: number, item) => {
        if (item.product.serviceDefinition) return sum
        return sum + (item.reservedItems?.length || 0)
    }, 0)

    const physicalVerifiedCount = Object.values(verifyingSerials).filter(v => v).length
    const servicesFulfilled = order.items.filter(item =>
        item.product.serviceDefinition && item.serviceStartDate && item.serviceEndDate
    ).length
    const totalServices = order.items.filter(item => !!item.product.serviceDefinition).length

    const allVerified = (totalPhysicalToVerify === 0 || totalPhysicalToVerify === physicalVerifiedCount) &&
        (servicesFulfilled === totalServices)

    // Ensure there is actually something to finalize (order not empty and items are correct)
    const canFinalize = order.items.length > 0 && allVerified

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/build" className="p-2 hover:bg-gray-200 rounded-full">
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            Build: {order.orderNumber}
                            <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full border border-blue-200 font-bold uppercase tracking-wider">
                                {order.status.replace(/_/g, ' ')}
                            </span>
                        </h1>
                        <p className="text-sm text-gray-500">{order.customerName} - Created {formatDate(order.createdAt)}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    {/* Items & Serial Verification */}
                    <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
                        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                            <h2 className="font-bold text-gray-900">Serial Number Verification</h2>
                            <span className="text-xs font-medium text-gray-500">
                                Verified: {physicalVerifiedCount} / {totalPhysicalToVerify} Physical
                                {totalServices > 0 && ` · ${servicesFulfilled} / ${totalServices} Services`}
                            </span>
                        </div>
                        <div className="divide-y divide-gray-200">
                            {order.items.map((item: any) => (
                                <div key={item.id} className="p-6">
                                    <div className="mb-4">
                                        <h3 className="text-sm font-bold text-gray-900">{item.product.name}</h3>
                                        <p className="text-xs text-gray-500">{item.product.brand} {item.product.model} · Qty: {item.quantity}</p>
                                    </div>

                                    {item.product?.serviceDefinition ? (
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className={`text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1
                                                ${(item.serviceStartDate && item.serviceEndDate) ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}
                                            `}>
                                                {item.serviceStartDate ? <CheckCircle className="w-3 h-3" /> : <Package className="w-3 h-3" />}
                                                {item.serviceStartDate ? 'Service Ready' : 'Service Fulfillment Pending'}
                                            </span>
                                            {item.serviceStartDate && (
                                                <span className="text-[10px] text-gray-500 font-mono">
                                                    Period: {formatDate(item.serviceStartDate)} - {formatDate(item.serviceEndDate!)}
                                                </span>
                                            )}
                                        </div>
                                    ) : !item.reservedItems || item.reservedItems.length === 0 ? (
                                        <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded border border-amber-100 text-xs italic">
                                            <AlertCircle className="w-4 h-4" />
                                            No items allocated yet for this product.
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {item.reservedItems.map((sn: any) => (
                                                <div
                                                    key={sn.id}
                                                    className={`flex items-center justify-between p-3 rounded border transition-all ${verifyingSerials[sn.id] ? 'bg-green-50 border-green-200 shadow-sm' : 'bg-gray-50 border-gray-200'}`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            type="checkbox"
                                                            checked={!!verifyingSerials[sn.id]}
                                                            onChange={() => handleToggleVerify(sn.id)}
                                                            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                        />
                                                        <div>
                                                            <span className="font-mono text-sm font-bold text-gray-800">{sn.serialNumber}</span>
                                                            <p className="text-[10px] text-gray-400">Warehouse: {sn.location?.name || 'Default'}</p>
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={() => handleRejectItem(sn.id)}
                                                        className="text-gray-400 hover:text-red-500 p-1 rounded-md hover:bg-white transition-colors"
                                                        title="Reject Incompatible SN"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Build Notes */}
                    <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Save className="w-4 h-4" />
                            Technical Notes
                        </h3>
                        <textarea
                            placeholder="Add build notes, technician comments, or any issues encountered..."
                            className="w-full min-h-[150px] p-3 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            value={buildNotes}
                            onChange={(e) => setBuildNotes(e.target.value)}
                        />
                    </div>

                    {/* Finalize Action */}
                    <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
                        <div className="space-y-4">
                            {!allVerified && (
                                <div className="flex items-start gap-2 text-amber-600 bg-amber-50 p-3 rounded text-xs border border-amber-100">
                                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                                    <span>Please verify ALL allocated serial numbers and ensure all services have been fulfilled before finalizing.</span>
                                </div>
                            )}
                            <button
                                onClick={handleCompleteBuild}
                                disabled={actionLoading || !canFinalize}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-bold shadow-lg shadow-blue-200 transition-all disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                            >
                                <Hammer className="w-5 h-5" />
                                {actionLoading ? 'Finalizing...' : 'Finalize & Send to Ship'}
                            </button>
                            <p className="text-[10px] text-gray-400 text-center italic">
                                This will mark the order as BUILT and notify the Accounts Manager.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
