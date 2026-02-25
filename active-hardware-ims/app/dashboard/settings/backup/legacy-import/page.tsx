"use client"

import { useState, useEffect } from "react"
import { Plus, Trash2, Download, Save, ChevronLeft, AlertCircle, CheckCircle, FileJson, Users, Package } from "lucide-react"
import Link from "next/link"
import BackButton from "@/components/BackButton"

type LegacyItem = {
    id: string
    sku: string
    serialNumber: string
    unitCost: number
    sellingPrice: number
    quantity: number
}

type LegacyOrder = {
    id: string
    orderNumber: string
    date: string
    customerName: string
    endCustomerName: string
    salesRepName: string
    invoiceNumber: string
    invoiceValue: number
    items: LegacyItem[]
}

export default function LegacyDataEntryPage() {
    const [orders, setOrders] = useState<LegacyOrder[]>([])
    const [activeOrderId, setActiveOrderId] = useState<string | null>(null)
    const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null)

    // Current order being edited
    const activeOrder = orders.find(o => o.id === activeOrderId) || null

    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
    }

    function addOrder() {
        try {
            const newOrder: LegacyOrder = {
                id: generateId(),
                orderNumber: `DO-LEGACY-${Date.now().toString().slice(-6)}`,
                date: new Date().toISOString().split('T')[0],
                customerName: "",
                endCustomerName: "",
                salesRepName: "",
                invoiceNumber: "",
                invoiceValue: 0,
                items: []
            }
            setOrders([...orders, newOrder])
            setActiveOrderId(newOrder.id)
            setStatus({ type: 'info', message: "New order created." })
        } catch (error: any) {
            console.error("Failed to add order:", error)
            setStatus({ type: 'error', message: "Failed to create new order." })
        }
    }

    function removeOrder(id: string) {
        if (!confirm("Remove this order from the list?")) return
        setOrders(orders.filter(o => o.id !== id))
        if (activeOrderId === id) setActiveOrderId(null)
    }

    function updateOrder(id: string, updates: Partial<LegacyOrder>) {
        setOrders(orders.map(o => o.id === id ? { ...o, ...updates } : o))
    }

    function addItem(orderId: string) {
        try {
            setOrders(orders.map(o => {
                if (o.id !== orderId) return o
                const newItem: LegacyItem = {
                    id: generateId(),
                    sku: "",
                    serialNumber: "",
                    unitCost: 0,
                    sellingPrice: 0,
                    quantity: 1
                }
                return { ...o, items: [...o.items, newItem] }
            }))
        } catch (error: any) {
            console.error("Failed to add item:", error)
            setStatus({ type: 'error', message: "Failed to add item to order." })
        }
    }

    function removeItem(orderId: string, itemId: string) {
        setOrders(orders.map(o => {
            if (o.id !== orderId) return o
            return { ...o, items: o.items.filter(i => i.id !== itemId) }
        }))
    }

    function updateItem(orderId: string, itemId: string, updates: Partial<LegacyItem>) {
        setOrders(orders.map(o => {
            if (o.id !== orderId) return o
            return {
                ...o,
                items: o.items.map(i => i.id === itemId ? { ...i, ...updates } : i)
            }
        }))
    }

    function downloadJson() {
        if (orders.length === 0) {
            setStatus({ type: 'error', message: "No orders to export." })
            return
        }

        const exportData = {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            data: orders.map(({ id, ...order }) => ({
                ...order,
                items: order.items.map(({ id, ...item }) => item)
            }))
        }

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `legacy_migration_${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        setStatus({ type: 'success', message: "JSON file generated and downloaded." })
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-20">
            <div className="flex justify-between items-center">
                <div>
                    <BackButton className="mb-2" />
                    <h1 className="text-2xl font-bold text-gray-900">Legacy Data Entry Form</h1>
                    <p className="text-sm text-gray-500">Prepare historical delivery order data for migration</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={addOrder}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Add New Order
                    </button>
                    <button
                        onClick={downloadJson}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-600 text-sm font-medium text-white hover:bg-green-700 transition-colors shadow-sm"
                    >
                        <Download className="w-4 h-4" />
                        Download Import JSON
                    </button>
                </div>
            </div>

            {status && (
                <div className={`p-4 rounded-lg flex items-center gap-3 ${status.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' :
                    status.type === 'error' ? 'bg-red-50 border border-red-200 text-red-700' :
                        'bg-blue-50 border border-blue-200 text-blue-700'
                    }`}>
                    {status.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    <span className="text-sm font-medium">{status.message}</span>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Sidebar: Order List */}
                <div className="lg:col-span-1 space-y-3">
                    <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                        <FileJson className="w-4 h-4" />
                        Queued Orders ({orders.length})
                    </h2>
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                        {orders.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 text-sm italic">
                                No orders added.
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                                {orders.map(order => (
                                    <button
                                        key={order.id}
                                        onClick={() => setActiveOrderId(order.id)}
                                        className={`w-full p-3 text-left hover:bg-gray-50 transition-colors flex justify-between items-center group ${activeOrderId === order.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
                                    >
                                        <div className="min-w-0">
                                            <p className={`text-sm font-medium truncate ${activeOrderId === order.id ? 'text-blue-700' : 'text-gray-900'}`}>
                                                {order.orderNumber || 'Untitled Order'}
                                            </p>
                                            <p className="text-xs text-gray-500">{order.customerName || 'No Customer'}</p>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                removeOrder(order.id)
                                            }}
                                            className="p-1 opacity-0 group-hover:opacity-100 hover:text-red-600 transition-opacity"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Main: Form Entry */}
                <div className="lg:col-span-3">
                    {activeOrder ? (
                        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-6">
                            <div className="flex justify-between items-start">
                                <h2 className="text-lg font-bold text-gray-900">Order Details</h2>
                                <span className="text-xs font-mono text-gray-400">ID: {activeOrder.id.slice(0, 8)}</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Order Number</label>
                                    <input
                                        type="text"
                                        value={activeOrder.orderNumber}
                                        onChange={(e) => updateOrder(activeOrder.id, { orderNumber: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="DO-2023-001"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Order Date</label>
                                    <input
                                        type="date"
                                        value={activeOrder.date}
                                        onChange={(e) => updateOrder(activeOrder.id, { date: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Invoice Number</label>
                                    <input
                                        type="text"
                                        value={activeOrder.invoiceNumber}
                                        onChange={(e) => updateOrder(activeOrder.id, { invoiceNumber: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="INV-5566"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Customer Name</label>
                                    <div className="relative">
                                        <Users className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            value={activeOrder.customerName}
                                            onChange={(e) => updateOrder(activeOrder.id, { customerName: e.target.value })}
                                            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                            placeholder="Primary Customer"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">End Customer (Optional)</label>
                                    <input
                                        type="text"
                                        value={activeOrder.endCustomerName}
                                        onChange={(e) => updateOrder(activeOrder.id, { endCustomerName: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="Ship to Client"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Sales Rep Name</label>
                                    <input
                                        type="text"
                                        value={activeOrder.salesRepName}
                                        onChange={(e) => updateOrder(activeOrder.id, { salesRepName: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="John Doe"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Total Sales Value</label>
                                    <input
                                        type="number"
                                        value={activeOrder.invoiceValue}
                                        onChange={(e) => updateOrder(activeOrder.id, { invoiceValue: parseFloat(e.target.value) || 0 })}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-gray-100">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                        <Package className="w-4 h-4 text-blue-500" />
                                        Ordered Items ({activeOrder.items.length})
                                    </h3>
                                    <button
                                        onClick={() => addItem(activeOrder.id)}
                                        className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 bg-blue-50 px-2 py-1 rounded"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        Add Item
                                    </button>
                                </div>

                                {activeOrder.items.length === 0 ? (
                                    <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg p-6 text-center text-gray-400 text-sm">
                                        No items added to this order yet.
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {activeOrder.items.map((item, idx) => (
                                            <div key={item.id} className="grid grid-cols-1 md:grid-cols-6 gap-3 p-4 bg-gray-50 rounded-lg relative group">
                                                <div className="md:col-span-2 space-y-1">
                                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">SKU</label>
                                                    <input
                                                        type="text"
                                                        value={item.sku}
                                                        onChange={(e) => updateItem(activeOrder.id, item.id, { sku: e.target.value })}
                                                        className="w-full px-2 py-1.5 rounded border border-gray-200 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                                                        placeholder="Product SKU"
                                                    />
                                                </div>
                                                <div className="md:col-span-2 space-y-1">
                                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Serial Number</label>
                                                    <input
                                                        type="text"
                                                        value={item.serialNumber}
                                                        onChange={(e) => updateItem(activeOrder.id, item.id, { serialNumber: e.target.value })}
                                                        className="w-full px-2 py-1.5 rounded border border-gray-200 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                                                        placeholder="SN-XXXX"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Unit Cost</label>
                                                    <input
                                                        type="number"
                                                        value={item.unitCost}
                                                        onChange={(e) => updateItem(activeOrder.id, item.id, { unitCost: parseFloat(e.target.value) || 0 })}
                                                        className="w-full px-2 py-1.5 rounded border border-gray-200 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Selling Price</label>
                                                    <input
                                                        type="number"
                                                        value={item.sellingPrice}
                                                        onChange={(e) => updateItem(activeOrder.id, item.id, { sellingPrice: parseFloat(e.target.value) || 0 })}
                                                        className="w-full px-2 py-1.5 rounded border border-gray-200 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                                                    />
                                                </div>
                                                <button
                                                    onClick={() => removeItem(activeOrder.id, item.id)}
                                                    className="absolute -top-2 -right-2 bg-white border border-gray-200 text-gray-400 hover:text-red-600 rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg p-20 text-center space-y-4">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                                <FileJson className="w-8 h-8 text-gray-300" />
                            </div>
                            <div>
                                <h3 className="text-lg font-medium text-gray-900">No order selected</h3>
                                <p className="text-sm text-gray-500">Select an order from the list or add a new one to start entering data.</p>
                            </div>
                            <button
                                onClick={addOrder}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                            >
                                <Plus className="w-4 h-4" />
                                Create My First Order
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
