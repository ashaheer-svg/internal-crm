"use client"

import { use, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, CheckCircle, AlertTriangle, Package, Truck, XCircle, Printer, Trash2, Hammer, RotateCcw } from "lucide-react"
import { Currency } from "@/components/Currency"
import { formatDate } from "@/lib/utils"

// Types
type InventoryItem = {
    id: string
    serialNumber: string
    status: string
    unitCost: number
    location?: {
        id: string
        name: string
    }
}

type DeliveryOrderItem = {
    id: string
    productId: string
    product: {
        id: string
        name: string
        brand: string
        model: string
        serviceDefinition?: {
            type: string
            durationValue: number
            durationUnit: string
        } | null
    }
    quantity: number
    unitPrice: number
    isBackorder: boolean
    serviceStartDate?: string | null
    serviceEndDate?: string | null
    reservedItems: InventoryItem[]
}

type DeliveryOrder = {
    id: string
    orderNumber: string
    customerName: string
    customerId: string | null
    deliveryAddress: string | null
    status: string // DRAFT, CONFIRMED, COMPLETED, CANCELLED
    invoiceValue?: number
    invoiceNumber?: string | null
    additionalCosts?: number
    notes: string | null
    buildNotes: string | null
    builtBy?: { name: string } | null
    builtAt?: string | null
    createdAt: string
    isActive: boolean
    salesRepId?: string | null
    salesRep?: {
        id: string
        name: string
    } | null
    items: DeliveryOrderItem[]
}

export default function DeliveryOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()

    const [order, setOrder] = useState<DeliveryOrder | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [actionLoading, setActionLoading] = useState(false)

    // Allocation Modal State
    const [allocatingItem, setAllocatingItem] = useState<DeliveryOrderItem | null>(null)
    const [availableStock, setAvailableStock] = useState<any[]>([])
    const [selectedSerials, setSelectedSerials] = useState<string[]>([])

    // Location Filter State
    const [locations, setLocations] = useState<any[]>([])
    const [selectedLocation, setSelectedLocation] = useState<string>("")

    // Service Fulfillment Modal State
    const [fulfillingItem, setFulfillingItem] = useState<DeliveryOrderItem | null>(null)
    const [serviceStartDate, setServiceStartDate] = useState("")
    const [serviceEndDate, setServiceEndDate] = useState("")
    const [serviceUnitCost, setServiceUnitCost] = useState<string>("")

    useEffect(() => {
        fetchOrder()
        fetchLocations()
    }, [id])

    async function fetchOrder() {
        try {
            const res = await fetch(`/api/delivery-orders/${id}`)
            if (!res.ok) throw new Error("Failed to load order")
            const data = await res.json()
            setOrder(data)
        } catch (e) {
            setError("Could not load delivery order")
        } finally {
            setLoading(false)
        }
    }

    async function fetchLocations() {
        try {
            const res = await fetch('/api/locations')
            const data = await res.json()
            setLocations(data)
        } catch (e) {
            console.error("Failed to load locations")
        }
    }

    async function handleOpenAllocate(item: DeliveryOrderItem) {
        setAllocatingItem(item)
        setSelectedSerials(item.reservedItems.map(i => i.id))

        // Reset location filter and fetch stock
        setSelectedLocation("")
        fetchAvailableStock(item.productId)
    }

    async function fetchAvailableStock(productId: string, locationId?: string) {
        try {
            let url = `/api/inventory?productId=${productId}&status=AVAILABLE`
            if (locationId) url += `&locationId=${locationId}`

            const res = await fetch(url)
            const data = await res.json()
            setAvailableStock(data)
        } catch (e) {
            console.error("Failed to fetch stock", e)
        }
    }

    function handleLocationChange(locId: string) {
        setSelectedLocation(locId)
        if (allocatingItem) {
            fetchAvailableStock(allocatingItem.productId, locId)
        }
    }

    function toggleSerialSelection(inventoryItemId: string) {
        if (selectedSerials.includes(inventoryItemId)) {
            setSelectedSerials(selectedSerials.filter(id => id !== inventoryItemId))
        } else {
            // Check limit
            if (allocatingItem && selectedSerials.length < allocatingItem.quantity) {
                setSelectedSerials([...selectedSerials, inventoryItemId])
            }
        }
    }

    async function saveServiceFulfillment() {
        if (!fulfillingItem || !serviceStartDate || !serviceEndDate) return
        setActionLoading(true)
        try {
            const res = await fetch(`/api/delivery-orders/${id}/items/${fulfillingItem.id}/fulfill-service`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    startDate: serviceStartDate,
                    endDate: serviceEndDate,
                    unitCost: serviceUnitCost ? Number(serviceUnitCost) : undefined
                })
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || "Failed to fulfill service")
            }

            setFulfillingItem(null)
            fetchOrder()
        } catch (e: any) {
            alert(e.message)
        } finally {
            setActionLoading(false)
        }
    }

    async function handleOpenServiceFulfill(item: DeliveryOrderItem) {
        setFulfillingItem(item)
        setServiceStartDate(item.serviceStartDate ? item.serviceStartDate.split('T')[0] : new Date().toISOString().split('T')[0])
        setServiceUnitCost(item.unitPrice ? item.unitPrice.toString() : "")

        // Default end date (e.g. +1 year) if not set
        if (item.serviceEndDate) {
            setServiceEndDate(item.serviceEndDate.split('T')[0])
        } else {
            const end = new Date()
            end.setFullYear(end.getFullYear() + 1)
            setServiceEndDate(end.toISOString().split('T')[0])
        }
    }

    async function saveAllocation() {
        if (!allocatingItem || !order) return
        setActionLoading(true)

        try {
            const res = await fetch(`/api/delivery-orders/${order.id}/allocate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    itemId: allocatingItem.id,
                    inventoryItemIds: selectedSerials
                })
            })

            if (!res.ok) throw new Error("Failed to save allocation")

            await fetchOrder() // Refresh
            setAllocatingItem(null)
        } catch (e) {
            alert("Failed to allocate items")
        } finally {
            setActionLoading(false)
        }
    }

    async function handleStatusChange(newStatus: string) {
        if (!order) return

        let createBackorder = false

        if (newStatus === 'COMPLETED') {
            const isPartial = order.items.some(i => i.reservedItems.length < i.quantity && !i.isBackorder)
            if (isPartial) {
                const proceed = confirm("This order is NOT fully allocated.\n\nClick OK to ship available items and CREATE A BACKORDER for the remaining items.\nClick Cancel to abort.")
                if (!proceed) return
                createBackorder = true
            } else {
                if (!confirm(`Are you sure you want to mark this order as ${newStatus}?`)) return
            }
        } else {
            if (!confirm(`Are you sure you want to mark this order as ${newStatus}?`)) return
        }

        setActionLoading(true)
        try {
            const res = await fetch(`/api/delivery-orders/${order.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus, createBackorder })
            })

            if (!res.ok) throw new Error("Update failed")
            await fetchOrder()
        } catch (e) {
            alert("Failed to update status")
        } finally {
            setActionLoading(false)
        }
    }

    async function handleDelete(type: 'soft' | 'hard' = 'soft') {
        if (!order) return
        const message = type === 'hard'
            ? "Are you sure you want to PERMANENTLY delete this order? This cannot be undone."
            : "Are you sure you want to move this order to trash?"

        if (!confirm(message)) return

        setActionLoading(true)
        try {
            const res = await fetch(`/api/delivery-orders/${order.id}?type=${type}`, {
                method: 'DELETE',
            })

            if (!res.ok) throw new Error("Delete failed")
            router.push('/dashboard/transactions?tab=do')
        } catch (e) {
            alert("Failed to delete order")
        } finally {
            setActionLoading(false)
        }
    }

    async function handleReturn(inventoryItemId: string, serialNumber: string) {
        if (!order) return
        const notes = prompt(`Reason for returning item ${serialNumber}:`, "Customer return / Item faulty")
        if (notes === null) return // Cancelled

        setActionLoading(true)
        try {
            const res = await fetch(`/api/delivery-orders/${id}/return`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ inventoryItemId, notes })
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || "Return failed")
            }

            await fetchOrder() // Refresh UI
        } catch (e: any) {
            alert(e.message)
        } finally {
            setActionLoading(false)
        }
    }

    if (loading) return <div className="p-8 text-center text-gray-500">Loading order...</div>
    if (!order) return <div className="p-8 text-center text-red-500">Order not found</div>

    const isDraft = order.status === 'DRAFT'
    const isConfirmed = order.status === 'CONFIRMED'
    const isReadyForBuild = order.status === 'READY_FOR_BUILD'
    const isBuilding = order.status === 'BUILDING'
    const isBuilt = order.status === 'BUILT'
    const isCompleted = order.status === 'COMPLETED'
    const isCancelled = order.status === 'CANCELLED'

    const isAllFulfilled = order.items.every(item => {
        if (item.product?.serviceDefinition) {
            return !!(item.serviceStartDate && item.serviceEndDate)
        }
        return item.reservedItems.length >= item.quantity
    })

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/transactions?tab=do" className="p-2 hover:bg-gray-200 rounded-full">
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                            {order.orderNumber}
                            <span className={`px-2 py-1 text-xs rounded-full border 
                                ${order.status === 'DRAFT' ? 'bg-gray-100 border-gray-200 text-gray-700' : ''}
                                ${order.status === 'READY_FOR_BUILD' ? 'bg-amber-100 border-amber-200 text-amber-700' : ''}
                                ${order.status === 'BUILDING' ? 'bg-blue-100 border-blue-200 text-blue-700' : ''}
                                ${order.status === 'BUILT' ? 'bg-indigo-100 border-indigo-200 text-indigo-700' : ''}
                                ${order.status === 'COMPLETED' ? 'bg-green-100 border-green-200 text-green-700' : ''}
                                ${order.status === 'CANCELLED' ? 'bg-red-100 border-red-200 text-red-700' : ''}
                            `}>
                                {order.status.replace(/_/g, ' ')}
                            </span>
                        </h1>
                        <p className="text-sm text-gray-500">Created on {formatDate(order.createdAt)} for {order.customerName}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Link
                        href={`/print/delivery-orders/${id}`}
                        target="_blank"
                        className="px-4 py-2 text-sm bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md shadow-sm flex items-center gap-2"
                    >
                        <Printer className="w-4 h-4" />
                        Print Packing Slip
                    </Link>

                    {/* Edit Button - Available for all Active orders */}
                    {order.isActive && (
                        <Link
                            href={`/dashboard/transactions/delivery-orders/${id}/edit`}
                            className="px-4 py-2 text-sm bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md shadow-sm"
                        >
                            Edit
                        </Link>
                    )}

                    {/* Status Actions - Only for Active Orders */}
                    {order.isActive && (
                        <>
                            {(isDraft || isConfirmed) && (
                                <>
                                    {isDraft && (
                                        <button
                                            onClick={() => handleStatusChange('CANCELLED')}
                                            className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md border border-transparent hover:border-red-200"
                                        >
                                            Cancel Order
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleStatusChange('READY_FOR_BUILD')}
                                        disabled={actionLoading}
                                        className="px-4 py-2 text-sm bg-amber-600 text-white hover:bg-amber-700 rounded-md shadow-sm disabled:opacity-50 flex items-center gap-2"
                                    >
                                        <Hammer className="w-4 h-4" />
                                        Ready for Build
                                    </button>
                                </>
                            )}

                            {(isReadyForBuild || isBuilding) && (
                                <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-md border border-blue-100 text-xs font-medium">
                                    <Hammer className="w-3 h-3 animate-pulse" />
                                    Technical Build in Progress
                                </div>
                            )}

                            {isBuilt && (
                                <button
                                    onClick={() => handleStatusChange('COMPLETED')}
                                    disabled={actionLoading || !isAllFulfilled}
                                    className="px-4 py-2 text-sm bg-green-600 text-white hover:bg-green-700 rounded-md shadow-sm disabled:opacity-50 flex items-center gap-2"
                                    title={!isAllFulfilled ? "Please fulfill all items before completing" : ""}
                                >
                                    <Truck className="w-4 h-4" />
                                    Ship & Complete
                                </button>
                            )}
                        </>
                    )}

                    {/* Delete Actions */}
                    <button
                        onClick={() => handleDelete(order.isActive ? 'soft' : 'hard')}
                        className="p-2 text-gray-400 hover:text-red-600"
                        title={order.isActive ? "Move to Trash" : "Delete Permanently"}
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Items List */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-white shadow rounded-lg overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                            <h2 className="font-medium text-gray-900">Order Items</h2>
                            <span className="text-xs text-gray-500">{order.items.length} items</span>
                        </div>
                        <ul className="divide-y divide-gray-200">
                            {order.items.map(item => {
                                const allocatedCount = item.reservedItems.length
                                const isFullyAllocated = allocatedCount >= item.quantity

                                return (
                                    <li key={item.id} className="p-6">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h3 className="text-sm font-medium text-gray-900">{item.product.brand} {item.product.name}</h3>
                                                <p className="text-xs text-gray-500 mb-2">{item.product.model}</p>

                                                {/* Allocation / Fulfillment Status */}
                                                <div className="flex items-center gap-2 mt-2">
                                                    {item.product?.serviceDefinition ? (
                                                        <>
                                                            <span className={`text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1
                                                                ${(item.serviceStartDate && item.serviceEndDate) ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}
                                                            `}>
                                                                {item.serviceStartDate ? <CheckCircle className="w-3 h-3" /> : <Package className="w-3 h-3" />}
                                                                {item.product.serviceDefinition?.type === 'RENTAL'
                                                                    ? (item.serviceStartDate ? 'Rental Ready' : 'Rental Fulfillment Pending')
                                                                    : (item.serviceStartDate ? 'Service Ready' : 'Service Fulfillment Pending')
                                                                }
                                                            </span>
                                                            {order.isActive && (order.status === 'DRAFT' || order.status === 'CONFIRMED' || order.status === 'READY_FOR_BUILD' || order.status === 'BUILDING') && (
                                                                <button
                                                                    onClick={() => handleOpenServiceFulfill(item)}
                                                                    className="text-xs text-blue-600 hover:text-blue-800 font-medium underline"
                                                                >
                                                                    {item.serviceStartDate
                                                                        ? (item.product.serviceDefinition?.type === 'RENTAL' ? 'Edit Rental Period' : 'Edit Service Period')
                                                                        : (item.product.serviceDefinition?.type === 'RENTAL' ? 'Fulfill Rental' : 'Fulfill Service')
                                                                    }
                                                                </button>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span className={`text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1
                                                                ${isFullyAllocated ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}
                                                            `}>
                                                                {isFullyAllocated ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                                                                Allocated: {allocatedCount} / {item.quantity}
                                                            </span>
                                                            {/* Allow allocation for Draft AND Confirmed (Partial) orders */}
                                                            {(order.status === 'DRAFT' || order.status === 'CONFIRMED' || order.status === 'READY_FOR_BUILD' || order.status === 'BUILDING') && !isFullyAllocated && (
                                                                <button
                                                                    onClick={() => handleOpenAllocate(item)}
                                                                    className="text-xs text-blue-600 hover:text-blue-800 font-medium underline"
                                                                >
                                                                    Alloc / Fulfill
                                                                </button>
                                                            )}
                                                            {(order.status === 'DRAFT' || order.status === 'CONFIRMED' || order.status === 'READY_FOR_BUILD' || order.status === 'BUILDING') && isFullyAllocated && (
                                                                <button
                                                                    onClick={() => handleOpenAllocate(item)}
                                                                    className="text-xs text-gray-500 hover:text-gray-700 underline"
                                                                >
                                                                    Edit Allocation
                                                                </button>
                                                            )}
                                                        </>
                                                    )}
                                                </div>

                                                {/* Serial Numbers or Service Dates */}
                                                {item.reservedItems.length > 0 && !item.product?.serviceDefinition && (
                                                    <div className="mt-3 space-y-2">
                                                        {item.reservedItems.map(sn => (
                                                            <div key={sn.id} className="flex items-center justify-between group">
                                                                <span className="text-xs border border-gray-200 bg-gray-50 px-2 py-1 rounded text-gray-600 font-mono">
                                                                    {sn.serialNumber}
                                                                </span>
                                                                {isCompleted && order.isActive && (
                                                                    <button
                                                                        onClick={() => handleReturn(sn.id, sn.serialNumber)}
                                                                        disabled={actionLoading}
                                                                        className="opacity-0 group-hover:opacity-100 p-1 text-xs text-blue-600 hover:bg-blue-50 rounded flex items-center gap-1 transition-all"
                                                                        title="Return Item to Inventory"
                                                                    >
                                                                        <RotateCcw className="w-3 h-3" />
                                                                        Return
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {item.product?.serviceDefinition && item.serviceStartDate && (
                                                    <div className="mt-3 text-xs text-gray-600 bg-blue-50 p-2 rounded border border-blue-100">
                                                        <div className="flex justify-between">
                                                            <span>{item.product.serviceDefinition?.type === 'RENTAL' ? 'Rental Period:' : 'Service Period:'}</span>
                                                            <span className="font-medium">{formatDate(item.serviceStartDate)} - {formatDate(item.serviceEndDate!)}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="text-right">
                                                <div className="text-sm font-medium text-gray-900">
                                                    <Currency amount={item.unitPrice * item.quantity} />
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {item.quantity} x <Currency amount={item.unitPrice} />
                                                </div>
                                            </div>
                                        </div>
                                    </li>
                                )
                            })}
                        </ul>
                    </div>
                </div>

                {/* Sidebar Details */}
                <div className="space-y-4">
                    <div className="bg-white shadow rounded-lg p-6">
                        <h3 className="font-medium text-gray-900 mb-4">Customer Details</h3>
                        <div className="space-y-3 text-sm">
                            <p className="text-gray-900 font-medium">{order.customerName}</p>
                            {order.deliveryAddress && (
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Delivery Address</p>
                                    <p className="text-gray-600 whitespace-pre-wrap">{order.deliveryAddress}</p>
                                </div>
                            )}
                            {order.salesRep && (
                                <div className="pt-3 border-t">
                                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Sales Representative</p>
                                    <p className="text-gray-900 font-medium">{order.salesRep.name}</p>
                                </div>
                            )}
                            {order.notes && (
                                <div className="pt-3 border-t">
                                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">General Notes</p>
                                    <p className="text-gray-700 bg-yellow-50 p-2 rounded">{order.notes}</p>
                                </div>
                            )}
                            {order.buildNotes && (
                                <div className="pt-3 border-t">
                                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Technical Build Notes</p>
                                    <div className="text-gray-700 bg-blue-50 p-2 rounded space-y-1">
                                        <p className="whitespace-pre-wrap">{order.buildNotes}</p>
                                        {order.builtBy && (
                                            <p className="text-[10px] text-blue-600 text-right">Built by {order.builtBy.name} on {formatDate(order.builtAt)}</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Financial Summary (Profitability) */}
                <div className="bg-white shadow rounded-lg p-6">
                    <h3 className="font-medium text-gray-900 mb-4">Financial Overview</h3>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-500">Invoice Value</span>
                            <Currency amount={order.invoiceValue || 0} className="font-medium" />
                        </div>

                        {/* Calculate COGS based on allocated items */}
                        {(() => {
                            const cogs = order.items.reduce((sum, item) => {
                                // Sum cost of allocated items
                                const physicalCogs = item.reservedItems.reduce((s, r) => s + (r.unitCost || 0), 0)
                                // Add cost for service items (if fulfilled)
                                const serviceCogs = (item.product?.serviceDefinition && (item as any).unitCost) ? ((item as any).unitCost * item.quantity) : 0
                                return sum + physicalCogs + serviceCogs
                            }, 0)
                            const overhead = order.additionalCosts || 0
                            const totalCost = cogs + overhead
                            const revenue = order.invoiceValue || 0
                            const grossProfit = revenue - totalCost
                            const margin = revenue > 0 ? (grossProfit / revenue) * 100 : 0

                            return (
                                <>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">COGS (Allocated)</span>
                                        <span className="text-gray-900 flex items-center gap-1">
                                            - <Currency amount={cogs} />
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Additional Costs</span>
                                        <span className="text-gray-900 flex items-center gap-1">
                                            - <Currency amount={overhead} />
                                        </span>
                                    </div>
                                    <div className="pt-3 border-t flex justify-between font-bold">
                                        <span className="text-gray-900">Gross Profit</span>
                                        <span className={grossProfit >= 0 ? "text-green-600" : "text-red-600"}>
                                            <Currency amount={grossProfit} />
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-xs mt-1">
                                        <span className="text-gray-400">Margin</span>
                                        <span className={grossProfit >= 0 ? "text-green-600" : "text-red-600"}>
                                            {margin.toFixed(1)}%
                                        </span>
                                    </div>
                                </>
                            )
                        })()}
                    </div>
                </div>
            </div>

            {/* Allocation Modal */}
            {allocatingItem && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                            <div>
                                <h3 className="font-bold text-gray-900">Allocate Inventory</h3>
                                <p className="text-xs text-gray-500">{allocatingItem.product.name}</p>
                            </div>
                            <button onClick={() => setAllocatingItem(null)}><XCircle className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
                        </div>

                        <div className="p-4 border-b bg-white">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Location</label>
                            <select
                                value={selectedLocation}
                                onChange={(e) => handleLocationChange(e.target.value)}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                            >
                                <option value="">All Locations</option>
                                {locations.map(loc => (
                                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="p-4 overflow-y-auto flex-1">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-sm text-gray-600">
                                    Required: <strong>{allocatingItem.quantity}</strong>
                                </span>
                                <span className={`text-sm font-medium ${selectedSerials.length === allocatingItem.quantity ? 'text-green-600' : 'text-blue-600'}`}>
                                    Selected: {selectedSerials.length}
                                </span>
                            </div>

                            <div className="space-y-2">
                                {/* Current Allocations (Always show at top) */}
                                {allocatingItem.reservedItems.length > 0 && (
                                    <div className="mb-4">
                                        <p className="text-xs font-semibold text-gray-500 mb-2 uppercase">Currently Reserved</p>
                                        {allocatingItem.reservedItems.map(item => (
                                            <div key={item.id}
                                                onClick={() => toggleSerialSelection(item.id)}
                                                className={`p-3 border rounded cursor-pointer flex justify-between items-center mb-2
                                                    ${selectedSerials.includes(item.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
                                                `}>
                                                <div>
                                                    <span className="font-mono text-sm font-medium block">{item.serialNumber}</span>
                                                    <span className="text-xs text-gray-500">Reserved for this order</span>
                                                </div>
                                                {selectedSerials.includes(item.id) && <CheckCircle className="w-4 h-4 text-blue-500" />}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Available Stock */}
                                <div>
                                    <p className="text-xs font-semibold text-gray-500 mb-2 uppercase">Available Stock</p>
                                    {availableStock.length === 0 ? (
                                        <p className="text-center text-gray-500 py-4 italic">No available stock found in this location.</p>
                                    ) : (
                                        availableStock
                                            .filter(stock => !allocatingItem.reservedItems.find(r => r.id === stock.id))
                                            .map(item => (
                                                <div key={item.id}
                                                    onClick={() => toggleSerialSelection(item.id)}
                                                    className={`p-3 border rounded cursor-pointer flex justify-between items-center
                                                    ${selectedSerials.includes(item.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}
                                                `}>
                                                    <div>
                                                        <span className="font-mono text-sm font-medium block">{item.serialNumber}</span>
                                                        <span className="text-xs text-gray-500 flex items-center gap-1">
                                                            <Truck className="w-3 h-3" />
                                                            {item.location?.name || 'Unknown Location'}
                                                        </span>
                                                    </div>
                                                    {selectedSerials.includes(item.id) && <CheckCircle className="w-4 h-4 text-blue-500" />}
                                                </div>
                                            ))
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
                            <button
                                onClick={() => setAllocatingItem(null)}
                                className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveAllocation}
                                disabled={actionLoading}
                                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                            >
                                {actionLoading ? 'Saving...' : 'Confirm Allocation'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
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
                            <button onClick={() => setFulfillingItem(null)}><XCircle className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
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
        </div>
    )
}
