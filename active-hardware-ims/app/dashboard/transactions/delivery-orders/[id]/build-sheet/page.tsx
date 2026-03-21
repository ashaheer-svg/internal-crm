"use client"

import { use, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Printer, CheckCircle, AlertTriangle } from "lucide-react"
import { Currency } from "@/components/Currency"
import { formatDate, formatStatus } from "@/lib/utils"

export default function BuildSheetPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()

    const [order, setOrder] = useState<any>(null)
    const [auditLogs, setAuditLogs] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        Promise.all([
            fetch(`/api/delivery-orders/${id}`).then(res => res.json()),
            fetch(`/api/delivery-orders/${id}/audit`).then(res => res.json())
        ]).then(([orderData, auditData]) => {
            setOrder(orderData)
            setAuditLogs(Array.isArray(auditData) ? auditData : [])
            setLoading(false)
        }).catch(err => {
            console.error(err)
            setLoading(false)
        })
    }, [id])

    if (loading) return <div className="p-8 text-center text-gray-500">Loading Build Sheet...</div>
    if (!order) return <div className="p-8 text-center text-red-500">Order not found</div>

    const backorderedItems = order.items.filter((i: any) => i.isBackorder || i.quantityFulfilled < i.quantity)

    return (
        <div className="max-w-4xl mx-auto p-6 bg-white space-y-6">
            {/* Action Bar (Hidden in Print) */}
            <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg border border-gray-200 no-print">
                <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm">
                    <ArrowLeft className="w-4 h-4" /> Back Details
                </button>
                <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 text-sm">
                    <Printer className="w-4 h-4" /> Print Sheet
                </button>
            </div>

            {/* Print Header */}
            <div className="text-center pb-6 border-b-2 border-gray-800">
                <h1 className="text-3xl font-black uppercase tracking-widest text-gray-900">Build Sheet</h1>
                <p className="text-sm text-gray-500 mt-1">Delivery Order: <span className="font-bold text-gray-800">{order.orderNumber}</span></p>
                <p className="text-xs text-gray-400">Printed on {new Date().toLocaleString()}</p>
            </div>

            {/* Top Grid: Customer & Order Info */}
            <div className="grid grid-cols-2 gap-6 text-sm">
                <div className="border border-gray-200 p-4 rounded-lg space-y-2">
                    <h3 className="font-bold text-gray-800 uppercase text-xs border-b pb-1">Customer / Partner</h3>
                    <p className="font-semibold text-gray-900">{order.customerName}</p>
                    {order.deliveryAddress && (
                        <p className="text-gray-600 whitespace-pre-wrap text-xs">{order.deliveryAddress}</p>
                    )}
                    {order.endCustomerName && (
                        <div className="pt-1 border-t mt-1">
                            <span className="text-xs text-gray-400">End Customer:</span>
                            <p className="font-semibold text-gray-800">{order.endCustomerName}</p>
                        </div>
                    )}
                </div>

                <div className="border border-gray-200 p-4 rounded-lg space-y-2">
                    <h3 className="font-bold text-gray-800 uppercase text-xs border-b pb-1">Order Details</h3>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                        <span className="text-gray-400">Sales Rep:</span>
                        <span className="font-semibold text-gray-800">{order.salesRep?.name || 'Unassigned'}</span>
                        
                        <span className="text-gray-400">Quote Ref:</span>
                        <span className="font-mono text-gray-800">{order.quoteReference || 'N/A'}</span>
                        
                        <span className="text-gray-400">Current Status:</span>
                        <span className="font-bold text-gray-800">{formatStatus(order.status)}</span>

                        {order.additionalContact && (
                            <>
                                <span className="text-gray-400">Additional Contact:</span>
                                <span className="font-semibold text-gray-800">{order.additionalContact}</span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Instructions Section */}
            {(order.buildInstructions || order.notes) && (
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-3">
                    <h3 className="font-bold text-gray-800 uppercase text-xs border-b pb-1">Instructions</h3>
                    {order.buildInstructions && (
                        <div>
                            <span className="text-xs font-bold text-blue-600">Build Instructions:</span>
                            <p className="text-sm text-gray-800 whitespace-pre-wrap bg-white p-2 border rounded mt-1 shadow-sm">{order.buildInstructions}</p>
                        </div>
                    )}
                    {order.notes && (
                        <div>
                            <span className="text-xs font-bold text-yellow-600">General Notes:</span>
                            <p className="text-sm text-gray-800 whitespace-pre-wrap bg-white p-2 border rounded mt-1 shadow-sm">{order.notes}</p>
                        </div>
                    )}
                </div>
            )}

            {/* Items Matrix */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse text-sm">
                    <thead>
                        <tr className="bg-gray-800 text-white text-xs uppercase">
                            <th className="py-3 px-4">Product / Item</th>
                            <th className="py-3 px-4 text-center w-24">Required</th>
                            <th className="py-3 px-4 text-center w-24">Allocated</th>
                            <th className="py-3 px-4">Serial Numbers Assigned</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {order.items.map((item: any) => {
                            const isService = !!item.product?.serviceDefinition
                            const allocated = item.reservedItems?.length || 0
                            const missing = item.quantity - allocated

                            return (
                                <tr key={item.id} className="align-top hover:bg-gray-50">
                                    <td className="py-3 px-4 font-medium text-gray-900">
                                        {item.product?.name}
                                        {isService && (
                                            <span className="block text-[10px] text-blue-600">
                                                {item.product?.serviceDefinition?.type} Service
                                            </span>
                                        )}
                                    </td>
                                    <td className="py-3 px-4 text-center font-bold text-gray-800">{item.quantity}</td>
                                    <td className="py-3 px-4 text-center">
                                        <span className={`font-bold ${allocated === item.quantity ? 'text-green-600' : 'text-amber-600'}`}>
                                            {allocated}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4">
                                        {item.reservedItems && item.reservedItems.length > 0 ? (
                                            <div className="flex flex-wrap gap-1">
                                                {item.reservedItems.map((sn: any) => (
                                                    <span key={sn.id} className="text-[10px] font-mono border border-gray-300 bg-gray-50 px-1.5 py-0.5 rounded text-gray-700">
                                                        {sn.serialNumber}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="text-xs italic text-gray-400">Unallocated</span>
                                        )}

                                        {item.details && item.details.length > 0 && (
                                            <div className="mt-2 space-y-1">
                                                {item.details.map((d: any, di: number) => (
                                                    <div key={di} className="text-[10px] text-blue-800 bg-blue-50 border border-blue-100 rounded px-1 py-0.5">
                                                        <strong>{d.modelName}: </strong>{d.serialNumbers}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* Backordered / Unallocated Alert */}
            {backorderedItems.length > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-xs text-red-800">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-500 mt-0.5" />
                    <div>
                        <span className="font-bold">Items missing full allocation: </span>
                        {backorderedItems.map((i: any) => i.product?.name).join(', ')}
                    </div>
                </div>
            )}

            {/* Stage Timeline */}
            <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                <h3 className="font-bold text-gray-800 uppercase text-xs border-b pb-1">Stage Transitions & Timestamps</h3>
                <div className="space-y-2">
                    {auditLogs.length > 0 ? (
                        auditLogs.map((log: any, index: number) => {
                            const details = log.details ? (typeof log.details === 'string' ? JSON.parse(log.details) : log.details) : {}
                            const eventName = details.event || log.action

                            return (
                                <div key={log.id} className="flex items-center justify-between text-xs py-1 border-b border-gray-100 last:border-0 border-dashed">
                                    <span className="text-gray-500">{new Date(log.createdAt).toLocaleString()}</span>
                                    <span className="font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">{eventName}</span>
                                    <span className="text-gray-400">by {log.actorName || 'System'}</span>
                                </div>
                            )
                        })
                    ) : (
                        <p className="text-xs italic text-gray-400">No stage history recorded yet.</p>
                    )}
                </div>
            </div>

            {/* Print Footer / Signoff */}
            <div className="pt-12 grid grid-cols-2 gap-12 text-center text-sm print-only">
                <div className="border-t border-gray-400 pt-2 h-16 flex flex-col justify-end">
                    <span className="text-xs text-gray-400">Technician Signature</span>
                </div>
                <div className="border-t border-gray-400 pt-2 h-16 flex flex-col justify-end">
                    <span className="text-xs text-gray-400">Manager Approval</span>
                </div>
            </div>

            <style jsx global>{`
                @media print {
                    .no-print { display: none !important; }
                    body { margin: 0; padding: 0; background: white; }
                    .print-only { display: grid !important; }
                }
                .print-only { display: none; }
            `}</style>
        </div>
    )
}
