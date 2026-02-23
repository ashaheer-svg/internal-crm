'use client'

import { useState } from 'react'
import { Plus, FileText, Edit, Copy, CheckCircle, Package } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { formatCurrency } from '@/lib/format'
import QuoteApprovalModal from './QuoteApprovalModal'

interface Quote {
    id: string
    quoteNumber: string
    status: string
    createdAt: string
    totalAmount: number
    poNumber?: string
    urgency?: string
    deliveryOrder?: {
        id: string
        orderNumber: string
        status: string
    }
}

interface QuoteSectionProps {
    projectId: string
    quotes: Quote[]
}

export default function CRMQuoteSection({ projectId, quotes }: QuoteSectionProps) {
    const router = useRouter()
    const [approvingQuote, setApprovingQuote] = useState<Quote | null>(null)

    const handleApprove = async (quoteId: string, data: any) => {
        const res = await fetch(`/api/crm/quotes/${quoteId}/confirm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}))
            alert(errorData.error || 'Failed to approve quote')
            throw new Error(errorData.error || 'Failed to approve quote')
        }
        router.refresh()
    }

    const handleEdit = (quote: Quote) => {
        const isApproved = quote.status === 'ACCEPTED'
        const isShipped = quote.deliveryOrder?.status === 'COMPLETED'

        if (isShipped) {
            alert('This order has already been shipped (Delivery Order is COMPLETED). No further edits are allowed.')
            return
        }

        if (isApproved) {
            if (!confirm('Warning: This quote is already APPROVED. Editing it will CANCEL the existing Delivery Order and require re-approval. Do you want to continue?')) {
                return
            }
        }

        router.push(`/dashboard/crm/projects/${projectId}/quotes/${quote.id}/edit`)
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Project Quotes</h3>
                <button
                    onClick={() => router.push(`/dashboard/crm/projects/${projectId}/quotes/new`)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    New Quote
                </button>
            </div>

            {quotes.length === 0 ? (
                <div className="text-center py-8 text-gray-500 bg-white rounded-lg border border-gray-200">
                    No quotes created yet.
                </div>
            ) : (
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                    <ul className="divide-y divide-gray-200">
                        {quotes.map((quote) => (
                            <li key={quote.id} className={`p-4 flex items-center justify-between hover:bg-opacity-50 transition-colors ${quote.status === 'ACCEPTED' ? 'bg-green-50 hover:bg-green-100' : 'hover:bg-gray-50'}`}>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => router.push(`/dashboard/crm/projects/${projectId}/quotes/${quote.id}`)}
                                            className="font-medium text-blue-600 hover:underline"
                                        >
                                            {quote.quoteNumber}
                                        </button>
                                        <span className={`text-xs px-2 py-0.5 rounded ${quote.status === 'DRAFT' ? 'bg-gray-100 text-gray-700' :
                                            quote.status === 'SENT' ? 'bg-blue-100 text-blue-700' :
                                                quote.status === 'ACCEPTED' ? 'bg-green-600 text-white font-medium flex items-center gap-1 shadow-sm' :
                                                    'bg-red-100 text-red-700'
                                            }`}>
                                            {quote.status === 'ACCEPTED' && <CheckCircle className="w-3 h-3" />}
                                            {quote.status}
                                        </span>
                                        {quote.deliveryOrder && (
                                            <button
                                                onClick={() => router.push(`/dashboard/transactions/delivery-orders/${quote.deliveryOrder?.id}`)}
                                                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-bold border transition-colors ${quote.deliveryOrder.status === 'COMPLETED' ? 'bg-green-600 text-white border-green-700' : 'bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100'}`}
                                                title={`View linked Delivery Order (${quote.deliveryOrder.status})`}
                                            >
                                                <Package className="w-3 h-3" />
                                                {quote.deliveryOrder.orderNumber}
                                                {quote.deliveryOrder.status === 'COMPLETED' && <span className="text-[10px] ml-1 uppercase">Shipped</span>}
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                                        <p>Created {formatDistanceToNow(new Date(quote.createdAt))} ago</p>
                                        <p>Amount: {formatCurrency(quote.totalAmount)}</p>
                                        {quote.poNumber && (
                                            <p className="flex items-center gap-1 text-blue-600 font-bold">
                                                PO: {quote.poNumber}
                                            </p>
                                        )}
                                        {quote.urgency && (
                                            <p className={`flex items-center gap-1 font-semibold ${quote.urgency === 'URGENT' ? 'text-red-600 underline decoration-red-600 underline-offset-2' :
                                                quote.urgency === 'HIGH' ? 'text-orange-600' :
                                                    'text-gray-600'
                                                }`}>
                                                {quote.urgency}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => handleEdit(quote)}
                                        className={`p-2 transition-colors ${quote.deliveryOrder?.status === 'COMPLETED' ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 hover:text-blue-600'}`}
                                        title={quote.deliveryOrder?.status === 'COMPLETED' ? 'Cannot edit shipped orders' : 'Edit Quote'}
                                        disabled={quote.deliveryOrder?.status === 'COMPLETED'}
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={async () => {
                                            if (!confirm('Duplicate this quote?')) return
                                            try {
                                                const res = await fetch(`/api/crm/quotes/${quote.id}/duplicate`, { method: 'POST' })
                                                if (res.ok) {
                                                    router.refresh()
                                                }
                                            } catch (e) {
                                                console.error(e)
                                                alert('Failed to duplicate')
                                            }
                                        }}
                                        className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                                        title="Duplicate Quote"
                                    >
                                        <Copy className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => window.open(`/dashboard/crm/quotes/${quote.id}/print`, '_blank')}
                                        className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                                        title="Print Quote"
                                    >
                                        <FileText className="w-4 h-4" />
                                    </button>

                                    {quote.status !== 'ACCEPTED' && (
                                        <button
                                            onClick={() => setApprovingQuote(quote)}
                                            className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                                            title="Approve Quote"
                                        >
                                            <CheckCircle className="w-4 h-4" />
                                        </button>
                                    )}

                                    {quote.status === 'ACCEPTED' && !quote.deliveryOrder && (
                                        <button
                                            onClick={() => router.push(`/dashboard/transactions/delivery-orders/new?quoteId=${quote.id}`)}
                                            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                                            title="Convert to Delivery Order (Manual)"
                                        >
                                            <Package className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {approvingQuote && (
                <QuoteApprovalModal
                    isOpen={true}
                    onClose={() => setApprovingQuote(null)}
                    quoteNumber={approvingQuote.quoteNumber}
                    onApprove={async (data) => await handleApprove(approvingQuote.id, data)}
                />
            )}
        </div>
    )
}
