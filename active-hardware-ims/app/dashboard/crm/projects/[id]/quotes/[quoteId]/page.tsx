'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import {
    ArrowLeft,
    Edit,
    Copy,
    CheckCircle,
    Printer,
    FileText,
    Calendar,
    User,
    Building
} from 'lucide-react'
import { formatCurrency } from '@/lib/format'
import { format } from 'date-fns'

export default function QuoteDetailPage({ params }: { params: Promise<{ id: string, quoteId: string }> }) {
    const { id: projectId, quoteId } = use(params)
    const router = useRouter()

    // State
    const [quote, setQuote] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [processing, setProcessing] = useState(false)

    useEffect(() => {
        fetchQuote()
    }, [quoteId])

    async function fetchQuote() {
        try {
            const res = await fetch(`/api/crm/quotes/${quoteId}`)
            if (res.ok) {
                const data = await res.json()
                setQuote(data)
            } else {
                console.error('Quote not found')
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    async function handleDuplicate() {
        if (!confirm('Create a new quote based on this one?')) return
        setProcessing(true)
        try {
            const res = await fetch(`/api/crm/quotes/${quoteId}/duplicate`, {
                method: 'POST'
            })
            if (res.ok) {
                const newQuote = await res.json()
                router.push(`/dashboard/crm/projects/${projectId}/quotes/${newQuote.id}`)
            } else {
                alert('Failed to duplicate quote')
            }
        } catch (error) {
            console.error(error)
            alert('Error duplicating quote')
        } finally {
            setProcessing(false)
        }
    }

    async function handleConfirm() {
        if (!confirm('Mark this quote as Accepted? This will update the status.')) return
        setProcessing(true)
        try {
            const res = await fetch(`/api/crm/quotes/${quoteId}/confirm`, {
                method: 'POST'
            })
            if (res.ok) {
                fetchQuote()
            } else {
                alert('Failed to confirm quote')
            }
        } catch (error) {
            console.error(error)
            alert('Error confirming quote')
        } finally {
            setProcessing(false)
        }
    }

    if (loading) return <div className="p-8">Loading Quote...</div>
    if (!quote) return <div className="p-8">Quote not found</div>

    // Parse Tax Details for Display
    let taxDetails: any[] = []
    try {
        if (quote.taxDetails) {
            taxDetails = JSON.parse(quote.taxDetails)
        }
    } catch (e) { }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-8 py-6 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push(`/dashboard/crm/projects/${projectId}`)}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-bold text-gray-900">{quote.quoteNumber}</h1>
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${quote.status === 'ACCEPTED' ? 'bg-green-100 text-green-800' :
                                        quote.status === 'DRAFT' ? 'bg-gray-100 text-gray-800' :
                                            'bg-blue-100 text-blue-800'
                                    }`}>
                                    {quote.status}
                                </span>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">Version {quote.version} • Created on {format(new Date(quote.createdAt), 'PPP')}</p>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => router.push(`/dashboard/crm/projects/${projectId}/quotes/${quoteId}/edit`)}
                            className="flex items-center px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                            disabled={processing}
                        >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                        </button>
                        <button
                            onClick={handleDuplicate}
                            className="flex items-center px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                            disabled={processing}
                        >
                            <Copy className="w-4 h-4 mr-2" />
                            Duplicate
                        </button>
                        <button
                            onClick={() => window.open(`/dashboard/crm/quotes/${quoteId}/print`, '_blank')}
                            className="flex items-center px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50"
                        >
                            <Printer className="w-4 h-4 mr-2" />
                            Print
                        </button>
                        {quote.status !== 'ACCEPTED' && (
                            <button
                                onClick={handleConfirm}
                                className="flex items-center px-3 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                                disabled={processing}
                            >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Mark Accepted
                            </button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                    {/* Bill To */}
                    <div className="flex items-start gap-2">
                        <User className="w-4 h-4 text-gray-400 mt-0.5" />
                        <div>
                            <span className="block font-medium text-gray-900">Bill To</span>
                            {quote.billTo ? (
                                <span className="text-gray-600">{quote.billTo.name}</span>
                            ) : (
                                <span className="text-gray-500 italic">Same as Project Customer</span>
                            )}
                        </div>
                    </div>

                    {/* Valid Until */}
                    <div className="flex items-start gap-2">
                        <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
                        <div>
                            <span className="block font-medium text-gray-900">Valid Until</span>
                            <span className="text-gray-600">
                                {quote.validUntil ? format(new Date(quote.validUntil), 'PPP') : 'N/A'}
                            </span>
                        </div>
                    </div>

                    {/* Sale Type */}
                    <div className="flex items-start gap-2">
                        <Building className="w-4 h-4 text-gray-400 mt-0.5" />
                        <div>
                            <span className="block font-medium text-gray-900">Sale Type</span>
                            <span className="text-gray-600">{quote.saleType}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Items Content */}
            <div className="flex-1 p-8 max-w-6xl mx-auto w-full space-y-8">
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                <th className="px-6 py-3 w-12 text-center">#</th>
                                <th className="px-6 py-3">Description</th>
                                <th className="px-6 py-3 w-24 text-right">Qty</th>
                                <th className="px-6 py-3 w-32 text-right">Unit Price</th>
                                <th className="px-6 py-3 w-24 text-right">Disc %</th>
                                <th className="px-6 py-3 w-32 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {quote.items.map((item: any, idx: number) => (
                                <tr key={item.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-sm text-gray-500 text-center">{idx + 1}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900 whitespace-pre-wrap">{item.description}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600 text-right">{item.quantity}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600 text-right">{formatCurrency(item.unitPrice)}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600 text-right">{item.discount > 0 ? `${item.discount}%` : '-'}</td>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">{formatCurrency(item.total)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Footer Totals */}
                    <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                        <div className="flex justify-end">
                            <div className="w-64 space-y-2">
                                <div className="flex justify-between text-sm text-gray-600">
                                    <span>Subtotal</span>
                                    <span>{formatCurrency(quote.subTotal)}</span>
                                </div>

                                {taxDetails.map((tax: any, idx: number) => (
                                    <div key={idx} className="flex justify-between text-sm text-gray-600">
                                        <span>{tax.name} ({tax.rate}%)</span>
                                        <span>{formatCurrency(tax.amount)}</span>
                                    </div>
                                ))}

                                <div className="flex justify-between text-lg font-bold text-gray-900 border-t border-gray-300 pt-2 mt-2">
                                    <span>Total</span>
                                    <span>{formatCurrency(quote.totalAmount)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Terms View */}
                {quote.terms && (
                    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                        <h3 className="text-sm font-medium text-gray-900 mb-2 uppercase tracking-wide">Terms & Conditions</h3>
                        <div className="text-sm text-gray-600 whitespace-pre-wrap font-mono bg-gray-50 p-4 rounded border border-gray-100">
                            {quote.terms}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
