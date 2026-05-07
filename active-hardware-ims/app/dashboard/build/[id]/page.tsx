"use client"

import { use, useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, CheckCircle, AlertTriangle, Hammer, X, Save, AlertCircle, Package } from "lucide-react"
import { formatDate } from "@/lib/utils"
import ConfirmModal from "@/components/ConfirmModal"

interface BuildOrder {
    id: string
    orderNumber: string
    customerName: string
    status: string
    createdAt: string
    buildNotes: string | null
    builtAt?: string | null
    builtBy?: { name: string } | null
    buildRejections?: {
        id: string
        serialNumber: string
        comment: string
        rejectedByName: string
        rejectedAt: string
    }[]
    items: {
        id: string
        quantity: number
        product: {
            name: string
            brand: string
            model: string
            category?: string
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
        unitCost?: number | null
        licenseKey?: string | null
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
    const hasTransitionedToBuilding = useRef(false)
    const [pendingAction, setPendingAction] = useState<null | { onConfirm: () => void }>(null)

    // Service Fulfillment Modal State
    const [fulfillingItem, setFulfillingItem] = useState<any | null>(null)
    const [serviceStartDate, setServiceStartDate] = useState("")
    const [serviceEndDate, setServiceEndDate] = useState("")
    const [serviceUnitCost, setServiceUnitCost] = useState<string>("")
    const [serviceLicenseKey, setServiceLicenseKey] = useState("")

    // Rejection Reason Modal State
    const [rejectionTarget, setRejectionTarget] = useState<{ id: string; serialNumber: string } | null>(null)
    const [rejectionComment, setRejectionComment] = useState("")

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

            // Mark as BUILDING if currently READY_FOR_BUILD — only fires once per mount
            if (data.status === 'READY_FOR_BUILD' && !hasTransitionedToBuilding.current) {
                hasTransitionedToBuilding.current = true
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
        if (order?.status !== 'BUILDING' && order?.status !== 'READY_FOR_BUILD') return
        setVerifyingSerials((prev: Record<string, boolean>) => ({
            ...prev,
            [serialId]: !prev[serialId]
        }))
    }

    const handleRejectItem = async (inventoryItemId: string) => {
        if (!rejectionComment.trim()) return
        setActionLoading(true)
        try {
            const res = await fetch(`/api/delivery-orders/${id}/build?inventoryItemId=${inventoryItemId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    inventoryItemId,
                    comment: rejectionComment.trim()
                })
            })
            if (!res.ok) throw new Error("Rejection failed")
            setRejectionTarget(null)
            setRejectionComment("")
            await fetchOrder()
        } catch (e) {
            alert("Failed to reject item")
        } finally {
            setActionLoading(false)
        }
    }

    const handleOpenServiceFulfill = (item: any) => {
        setFulfillingItem(item)
        setServiceStartDate(item.serviceStartDate ? item.serviceStartDate.split('T')[0] : new Date().toISOString().split('T')[0])
        setServiceUnitCost(item.unitCost ? item.unitCost.toString() : "")
        setServiceLicenseKey(item.licenseKey || "")

        if (item.serviceEndDate) {
            setServiceEndDate(item.serviceEndDate.split('T')[0])
        } else {
            const end = new Date()
            end.setFullYear(end.getFullYear() + 1)
            setServiceEndDate(end.toISOString().split('T')[0])
        }
    }

    const saveServiceFulfillment = async () => {
        if (!fulfillingItem || !serviceStartDate || !serviceEndDate) return
        setActionLoading(true)
        try {
            const res = await fetch(`/api/delivery-orders/${id}/items/${fulfillingItem.id}/fulfill-service`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    startDate: serviceStartDate,
                    endDate: serviceEndDate,
                    unitCost: serviceUnitCost ? Number(serviceUnitCost) : undefined,
                    licenseKey: serviceLicenseKey || undefined
                })
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || "Failed to fulfill service")
            }

            setFulfillingItem(null)
            await fetchOrder()
        } catch (e: any) {
            alert(e.message)
        } finally {
            setActionLoading(false)
        }
    }

    const handleCompleteBuild = async () => {
        setPendingAction({
            onConfirm: async () => {
                setPendingAction(null)
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
                    console.error("Failed to complete build", e)
                } finally {
                    setActionLoading(false)
                }
            }
        })
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

    const isReadOnly = order.status !== 'BUILDING' && order.status !== 'READY_FOR_BUILD'

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <ConfirmModal
                open={!!pendingAction}
                title="Finalize Build"
                message="Is the build complete? The order will be sent to the Accounts Manager for shipping. This action cannot be undone."
                variant="warning"
                loading={actionLoading}
                onConfirm={() => pendingAction?.onConfirm()}
                onCancel={() => setPendingAction(null)}
            />
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/build" className="p-2 hover:bg-gray-200 rounded-full">
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-background flex items-center gap-2">
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
                                        <p className="text-xs text-gray-500">{item.product.brand} {item.product.model} · Qty: {item.product.serviceDefinition ? item.quantity : (item.reservedItems?.length ?? 0)}</p>
                                    </div>

                                    {item.product?.serviceDefinition ? (
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1
                                                ${(item.serviceStartDate && item.serviceEndDate) ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}
                                            `}>
                                                {item.serviceStartDate ? <CheckCircle className="w-3 h-3" /> : <Package className="w-3 h-3" />}
                                                {item.product.serviceDefinition?.type === 'RENTAL'
                                                    ? (item.serviceStartDate ? 'Rental Ready' : 'Rental Fulfillment Pending')
                                                    : (item.serviceStartDate ? 'Service Ready' : 'Service Fulfillment Pending')
                                                }
                                            </span>
                                            {item.serviceStartDate && (
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-gray-500 font-mono">
                                                        Period: {formatDate(item.serviceStartDate)} - {formatDate(item.serviceEndDate!)}
                                                    </span>
                                                    {item.licenseKey && (
                                                        <span className="text-[10px] text-blue-600 font-bold font-mono">
                                                            License: {item.licenseKey}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                            {!isReadOnly && (
                                                <button
                                                    onClick={() => handleOpenServiceFulfill(item)}
                                                    className="text-xs text-blue-600 hover:text-blue-800 font-medium underline"
                                                >
                                                    {item.serviceStartDate
                                                        ? (item.product.serviceDefinition?.type === 'RENTAL' ? 'Edit Rental' : 'Edit Service')
                                                        : (item.product.serviceDefinition?.type === 'RENTAL' ? 'Fulfill Rental' : 'Fulfill Service')
                                                    }
                                                </button>
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
                                                        {isReadOnly ? (
                                                            <div className="w-5 h-5 flex items-center justify-center">
                                                                <CheckCircle className="w-4 h-4 text-green-600" />
                                                            </div>
                                                        ) : (
                                                            <input
                                                                type="checkbox"
                                                                checked={!!verifyingSerials[sn.id]}
                                                                onChange={() => handleToggleVerify(sn.id)}
                                                                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                            />
                                                        )}
                                                        <div>
                                                            <span className="font-mono text-sm font-bold text-gray-800">{sn.serialNumber}</span>
                                                            <p className="text-[10px] text-gray-400">Warehouse: {sn.location?.name || 'Default'}</p>
                                                        </div>
                                                    </div>

                                                    {!isReadOnly && (
                                                        <button
                                                            onClick={() => {
                                                                setRejectionTarget({ id: sn.id, serialNumber: sn.serialNumber })
                                                                setRejectionComment("")
                                                            }}
                                                            className="text-gray-400 hover:text-red-500 p-1 rounded-md hover:bg-white transition-colors"
                                                            title="Reject Incompatible SN"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Rejected Items Block */}
                    {order.buildRejections && order.buildRejections.length > 0 && (
                        <div className="bg-white shadow rounded-lg overflow-hidden border border-red-200 mt-6">
                            <div className="px-6 py-4 border-b border-red-200 bg-red-50 text-red-900">
                                <h2 className="font-bold flex items-center gap-2">
                                    <AlertCircle className="w-5 h-5 text-red-600" />
                                    Rejected Items ({order.buildRejections.length})
                                </h2>
                            </div>
                            <div className="divide-y divide-red-100">
                                {order.buildRejections.map(rej => (
                                    <div key={rej.id} className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4 items-start bg-white">
                                        <div className="md:col-span-1">
                                            <span className="font-mono text-sm font-bold text-red-800 bg-red-50 border border-red-100 px-2 py-1 rounded inline-block mb-1">{rej.serialNumber}</span>
                                            <p className="text-[10px] text-red-500 font-medium tracking-wide">
                                                BY {rej.rejectedByName?.toUpperCase() || 'UNKNOWN'} <br/>
                                                {formatDate(rej.rejectedAt || new Date().toISOString())}
                                            </p>
                                        </div>
                                        <div className="md:col-span-3">
                                            <p className="text-sm text-gray-700 font-medium italic">{rej.comment || 'No reason specified'}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="space-y-6">
                    {/* Build Notes */}
                    <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Save className="w-4 h-4" />
                            Technical Notes
                        </h3>
                        <textarea
                            placeholder={isReadOnly ? "No build notes provided." : "Add build notes, technician comments, or any issues encountered..."}
                            className="w-full min-h-[150px] p-3 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm disabled:bg-gray-50 disabled:text-gray-700"
                            value={buildNotes}
                            disabled={isReadOnly}
                            onChange={(e) => setBuildNotes(e.target.value)}
                        />
                    </div>

                    {/* Finalize Action */}
                    {isReadOnly ? (
                        <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
                            <div className="flex flex-col items-center justify-center text-center py-4">
                                <CheckCircle className="w-12 h-12 text-emerald-500 mb-3" />
                                <h3 className="font-bold text-gray-900 text-lg">Build Completed</h3>
                                <p className="text-gray-500 text-sm mt-1">
                                    By {order.builtBy?.name || 'Technician'} on {order.builtAt ? formatDate(order.builtAt) : 'Unknown Date'}
                                </p>
                            </div>
                        </div>
                    ) : (
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
                    )}
                </div>
            </div>

            {/* Service Fulfillment Modal */}
            {fulfillingItem && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                            <div>
                                <h3 className="font-bold text-gray-900">
                                    {fulfillingItem.product.serviceDefinition?.type === 'RENTAL' ? 'Fulfill Rental' : 'Fulfill Service'}
                                </h3>
                                <p className="text-xs text-gray-500">{fulfillingItem.product.name}</p>
                            </div>
                            <button onClick={() => setFulfillingItem(null)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Service Start Date</label>
                                <input
                                    type="date"
                                    value={serviceStartDate}
                                    onChange={(e) => setServiceStartDate(e.target.value)}
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Service End Date</label>
                                <input
                                    type="date"
                                    value={serviceEndDate}
                                    onChange={(e) => setServiceEndDate(e.target.value)}
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                                />
                                <p className="mt-1 text-[10px] text-gray-500 italic">
                                    {fulfillingItem.product.serviceDefinition?.type === 'RENTAL'
                                        ? 'This period will be used to track the Rental agreement.'
                                        : 'This period will be used to generate the Service Contract.'}
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Unit Cost (Excl. Tax)</label>
                                <div className="relative mt-1 rounded-md shadow-sm">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <span className="text-gray-500 sm:text-sm">Rs.</span>
                                    </div>
                                    <input
                                        type="number"
                                        value={serviceUnitCost}
                                        onChange={(e) => setServiceUnitCost(e.target.value)}
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm pl-10 p-2 border"
                                        placeholder="0.00"
                                    />
                                </div>
                                <p className="mt-1 text-[10px] text-gray-500 italic">Actual procurement cost for this service.</p>
                            </div>

                            {fulfillingItem.product.category?.toUpperCase().startsWith('LICEN') && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">License Key</label>
                                    <input
                                        type="text"
                                        value={serviceLicenseKey}
                                        onChange={(e) => setServiceLicenseKey(e.target.value)}
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border font-mono"
                                        placeholder="XXXX-XXXX-XXXX-XXXX"
                                    />
                                    <p className="mt-1 text-[10px] text-gray-500 italic">Enter the license key</p>
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
                            <button
                                onClick={() => setFulfillingItem(null)}
                                className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveServiceFulfillment}
                                disabled={actionLoading || !serviceStartDate || !serviceEndDate}
                                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                            >
                                {actionLoading ? 'Saving...' : 'Mark as Procured'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Rejection Reason Modal */}
            {rejectionTarget && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden">
                        <div className="p-4 border-b flex justify-between items-center bg-red-50">
                            <div>
                                <h3 className="font-bold text-red-900">Reject Serial Number</h3>
                                <p className="text-xs text-red-600 font-mono mt-0.5">{rejectionTarget.serialNumber}</p>
                            </div>
                            <button onClick={() => setRejectionTarget(null)}>
                                <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Reason for Rejection <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={rejectionComment}
                                    onChange={(e) => setRejectionComment(e.target.value)}
                                    rows={3}
                                    placeholder="e.g. Failed POST test, incorrect hardware revision, physical damage..."
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm p-2 border"
                                />
                                <p className="mt-1 text-[10px] text-gray-500 italic">
                                    This reason will be visible to the Accounts Manager and recorded in the inventory history.
                                </p>
                            </div>
                        </div>

                        <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
                            <button
                                onClick={() => { setRejectionTarget(null); setRejectionComment("") }}
                                className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleRejectItem(rejectionTarget.id)}
                                disabled={actionLoading || !rejectionComment.trim()}
                                className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                            >
                                {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
