"use client"

import { use, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, CheckCircle, AlertTriangle, Package, Truck, XCircle, Printer, Trash2 } from "lucide-react"
import { Currency } from "@/components/Currency"

// Types
type InventoryItem = {
    id: string
    serialNumber: string
    status: string
}

type DeliveryOrderItem = {
    id: string
    productId: string
    product: {
        id: string
        name: string
        brand: string
        model: string
    }
    quantity: number
    unitPrice: number
    isBackorder: boolean
    reservedItems: InventoryItem[]
}

type DeliveryOrder = {
    id: string
    orderNumber: string
    customerName: string
    customerId: string | null
    status: string // DRAFT, CONFIRMED, COMPLETED, CANCELLED
    notes: string | null
    createdAt: string
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

    useEffect(() => {
        fetchOrder()
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

    async function handleOpenAllocate(item: DeliveryOrderItem) {
        setAllocatingItem(item)
        setSelectedSerials(item.reservedItems.map(i => i.id))

        // Fetch available stock for this product
        try {
            const res = await fetch(`/api/inventory?productId=${item.productId}&status=AVAILABLE`)
            const data = await res.json()
            // Combine already reserved (which might not be AVAILABLE anymore) with currently available
            // Actually, reserved items for THIS order are safe.
            // But we need to toggle them.
            setAvailableStock(data)
        } catch (e) {
            console.error("Failed to fetch stock", e)
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
        if (!confirm(`Are you sure you want to mark this order as ${newStatus}?`)) return

        setActionLoading(true)
        try {
            const res = await fetch(`/api/delivery-orders/${order.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            })

            if (!res.ok) throw new Error("Update failed")
            await fetchOrder()
        } catch (e) {
            alert("Failed to update status")
        } finally {
            setActionLoading(false)
        }
    }

    async function handleDelete() {
        if (!order) return
        if (!confirm("Are you sure you want to PERMANENTLY delete this order? This cannot be undone.")) return

        setActionLoading(true)
        try {
            const res = await fetch(`/api/delivery-orders/${order.id}`, {
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

    if (loading) return <div className="p-8 text-center text-gray-500">Loading order...</div>
    if (!order) return <div className="p-8 text-center text-red-500">Order not found</div>

    const isDraft = order.status === 'DRAFT'
    const isCompleted = order.status === 'COMPLETED'
    const isCancelled = order.status === 'CANCELLED'

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
                                ${order.status === 'COMPLETED' ? 'bg-green-100 border-green-200 text-green-700' : ''}
                                ${order.status === 'CANCELLED' ? 'bg-red-100 border-red-200 text-red-700' : ''}
                            `}>
                                {order.status}
                            </span>
                        </h1>
                        <p className="text-sm text-gray-500">Created on {new Date(order.createdAt).toLocaleDateString()} for {order.customerName}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Link
                        href={`/dashboard/transactions/delivery-orders/${id}/print`}
                        target="_blank"
                        className="px-4 py-2 text-sm bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md shadow-sm flex items-center gap-2"
                    >
                        <Printer className="w-4 h-4" />
                        Print Packing Slip
                    </Link>

                    {isDraft && (
                        <>
                            <Link
                                href={`/dashboard/transactions/delivery-orders/${id}/edit`}
                                className="px-4 py-2 text-sm bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md shadow-sm"
                            >
                                Edit
                            </Link>
                            <button
                                onClick={() => handleStatusChange('CANCELLED')}
                                className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md border border-transparent hover:border-red-200"
                            >
                                Cancel Order
                            </button>
                            <button
                                onClick={() => handleStatusChange('COMPLETED')}
                                disabled={actionLoading || order.items.some(i => i.reservedItems.length < i.quantity && !i.isBackorder)}
                                className="px-4 py-2 text-sm bg-green-600 text-white hover:bg-green-700 rounded-md shadow-sm disabled:opacity-50 flex items-center gap-2"
                            >
                                <Truck className="w-4 h-4" />
                                Ship & Complete
                            </button>
                        </>
                    )}

                    {(isDraft || isCancelled) && (
                        <button
                            onClick={handleDelete}
                            className="p-2 text-gray-400 hover:text-red-600"
                            title="Delete Order"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    )}
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

                                                {/* Allocation Status */}
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className={`text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1
                                                        ${isFullyAllocated ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}
                                                    `}>
                                                        {isFullyAllocated ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                                                        Allocated: {allocatedCount} / {item.quantity}
                                                    </span>
                                                    {isDraft && !isFullyAllocated && (
                                                        <button
                                                            onClick={() => handleOpenAllocate(item)}
                                                            className="text-xs text-blue-600 hover:text-blue-800 font-medium underline"
                                                        >
                                                            Allocate Now
                                                        </button>
                                                    )}
                                                    {isDraft && isFullyAllocated && (
                                                        <button
                                                            onClick={() => handleOpenAllocate(item)}
                                                            className="text-xs text-gray-500 hover:text-gray-700 underline"
                                                        >
                                                            Edit Allocation
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Serial Numbers */}
                                                {item.reservedItems.length > 0 && (
                                                    <div className="mt-3 flex flex-wrap gap-2">
                                                        {item.reservedItems.map(sn => (
                                                            <span key={sn.id} className="text-xs border border-gray-200 bg-gray-50 px-2 py-1 rounded text-gray-600 font-mono">
                                                                {sn.serialNumber}
                                                            </span>
                                                        ))}
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
                            {order.notes && (
                                <div className="pt-3 border-t">
                                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Notes</p>
                                    <p className="text-gray-700 bg-yellow-50 p-2 rounded">{order.notes}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Allocation Modal */}
            {allocatingItem && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col">
                        <div className="p-4 border-b flex justify-between items-center">
                            <h3 className="font-bold text-gray-900">Allocate Serials</h3>
                            <button onClick={() => setAllocatingItem(null)}><XCircle className="w-5 h-5 text-gray-400" /></button>
                        </div>

                        <div className="p-4 overflow-y-auto flex-1">
                            <p className="text-sm text-gray-600 mb-4">
                                Select serials for <strong>{allocatingItem.product.brand} {allocatingItem.product.name}</strong>.
                                <br />
                                Required: {allocatingItem.quantity} | Selected: {selectedSerials.length}
                            </p>

                            <div className="space-y-2">
                                {/* Included already reserved items in the list? */}
                                {availableStock.length === 0 && allocatingItem.reservedItems.length === 0 ? (
                                    <p className="text-center text-gray-500 py-4">No stock available.</p>
                                ) : (
                                    <>
                                        {/* Current Allocations */}
                                        {allocatingItem.reservedItems.map(item => (
                                            <div key={item.id}
                                                onClick={() => toggleSerialSelection(item.id)}
                                                className={`p-3 border rounded cursor-pointer flex justify-between items-center
                                                    ${selectedSerials.includes(item.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
                                                `}>
                                                <span className="font-mono text-sm">{item.serialNumber}</span>
                                                <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">Reserved</span>
                                            </div>
                                        ))}

                                        {/* Available Stock */}
                                        {availableStock
                                            .filter(stock => !allocatingItem.reservedItems.find(r => r.id === stock.id)) // Exclude already reserved
                                            .map(item => (
                                                <div key={item.id}
                                                    onClick={() => toggleSerialSelection(item.id)}
                                                    className={`p-3 border rounded cursor-pointer flex justify-between items-center
                                                    ${selectedSerials.includes(item.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}
                                                `}>
                                                    <span className="font-mono text-sm">{item.serialNumber}</span>
                                                    <span className="text-xs text-gray-500">{item.location?.name || 'In Stock'}</span>
                                                </div>
                                            ))}
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
                            <button
                                onClick={() => setAllocatingItem(null)}
                                className="px-4 py-2 text-sm border border-gray-300 rounded text-gray-700"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveAllocation}
                                disabled={actionLoading}
                                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                                Save Allocation
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
