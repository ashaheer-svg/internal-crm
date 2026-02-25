"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Package, Search, ChevronRight, Clock, Hammer } from "lucide-react"
import { formatDate } from "@/lib/utils"

interface BuildQueueOrder {
    id: string
    orderNumber: string
    customerName: string
    status: string
    createdAt: string
    _count: {
        items: number
    }
}

export default function BuildListingPage() {
    const [orders, setOrders] = useState<BuildQueueOrder[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")

    useEffect(() => {
        fetchOrders()
    }, [])

    const fetchOrders = async () => {
        try {
            // Fetch both READY_FOR_BUILD and BUILDING orders
            const [readyRes, buildingRes] = await Promise.all([
                fetch('/api/delivery-orders?status=READY_FOR_BUILD'),
                fetch('/api/delivery-orders?status=BUILDING')
            ])

            const [readyData, buildingData] = await Promise.all([
                readyRes.json(),
                buildingRes.json()
            ])

            setOrders([...readyData, ...buildingData])
        } catch (error) {
            console.error("Failed to fetch build orders:", error)
        } finally {
            setLoading(false)
        }
    }

    const filteredOrders = orders.filter(order =>
        order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerName.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Hammer className="w-6 h-6 text-blue-600" />
                    Technical Build Queue
                </h1>
                <p className="text-sm text-gray-500">{filteredOrders.length} orders waiting for technical verification</p>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Search by order number or customer..."
                        className="w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button
                    onClick={fetchOrders}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border rounded-md transition-colors"
                >
                    Refresh
                </button>
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-500">Loading build queue...</div>
            ) : filteredOrders.length === 0 ? (
                <div className="bg-white rounded-lg border border-dashed border-gray-300 py-12 text-center">
                    <Package className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">Queue is empty</h3>
                    <p className="text-gray-500">There are no orders currently waiting for technical build.</p>
                </div>
            ) : (
                <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
                    <ul className="divide-y divide-gray-200">
                        {filteredOrders.map((order) => (
                            <li key={order.id} className="hover:bg-gray-50 transition-colors">
                                <Link href={`/dashboard/build/${order.id}`} className="block p-4 sm:px-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-2 rounded-full ${order.status === 'BUILDING' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'}`}>
                                                <Hammer className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-bold text-gray-900">{order.orderNumber}</h3>
                                                <p className="text-xs text-gray-500">{order.customerName}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-6">
                                            <div className="text-right hidden sm:block">
                                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                                    <Clock className="w-3 h-3" />
                                                    {formatDate(order.createdAt)}
                                                </div>
                                                <div className="text-xs font-medium text-gray-700 mt-1">
                                                    {order._count.items} Products
                                                </div>
                                            </div>
                                            <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border
                                                ${order.status === 'BUILDING' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-amber-50 border-amber-200 text-amber-700'}
                                            `}>
                                                {order.status.replace(/_/g, ' ')}
                                            </span>
                                            <ChevronRight className="w-5 h-5 text-gray-400" />
                                        </div>
                                    </div>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    )
}
