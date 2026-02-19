'use client'

import { useState, useEffect, use } from 'react'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/format'

interface Quote {
    id: string
    quoteNumber: string
    validUntil: string
    createdAt: string
    totalAmount: number
    subTotal: number
    taxAmount: number
    taxDetails: string | null // JSON string
    terms: string
    project: {
        customer: {
            name: string
            address: string | null
            email: string | null
            phone: string | null
        }
    }
    items: {
        id: string
        description: string
        quantity: number
        unitPrice: number
        discount: number
        total: number
        product: { name: string } | null
    }[]
}

export default function QuotePrintPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const [quote, setQuote] = useState<Quote | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch(`/api/crm/quotes/${id}`)
            .then(res => res.json())
            .then(data => setQuote(data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false))
    }, [id])

    if (loading) return <div className="p-8">Loading Quote...</div>
    if (!quote) return <div className="p-8">Quote not found</div>

    // Parse Tax Details
    let taxDetails: any[] = []
    try {
        if (quote.taxDetails) {
            taxDetails = JSON.parse(quote.taxDetails)
        }
    } catch (e) { }

    return (
        <div className="bg-white min-h-screen p-8 text-gray-900 font-sans print:p-0 max-w-[210mm] mx-auto">
            {/* Header */}
            <div className="flex justify-between items-start mb-8 border-b border-gray-200 pb-6">
                <div>
                    <h1 className="text-3xl font-bold text-blue-900">Active Solutions</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        123 Tech Park, Innovation Street<br />
                        Mumbai, MH 400001<br />
                        contact@activesolutions.com | +91 98765 43210
                    </p>
                </div>
                <div className="text-right">
                    <h2 className="text-4xl font-light text-gray-300 uppercase tracking-widest">Quote</h2>
                    <div className="mt-4 space-y-1">
                        <p className="text-sm"><span className="font-semibold text-gray-600">Quote #:</span> {quote.quoteNumber}</p>
                        <p className="text-sm"><span className="font-semibold text-gray-600">Date:</span> {format(new Date(quote.createdAt), 'dd MMM yyyy')}</p>
                        <p className="text-sm"><span className="font-semibold text-gray-600">Valid Until:</span> {quote.validUntil ? format(new Date(quote.validUntil), 'dd MMM yyyy') : 'N/A'}</p>
                    </div>
                </div>
            </div>

            {/* Customer & Bill To */}
            <div className="mb-8">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Quotation For</h3>
                <div className="bg-gray-50 p-4 rounded-md border border-gray-100">
                    <h4 className="font-bold text-lg text-gray-900">{quote.project.customer.name}</h4>
                    {quote.project.customer.address && <p className="text-gray-600 whitespace-pre-line mt-1">{quote.project.customer.address}</p>}
                    <div className="mt-2 text-sm text-gray-500 flex flex-col gap-0.5">
                        {quote.project.customer.email && <p>Email: {quote.project.customer.email}</p>}
                        {quote.project.customer.phone && <p>Phone: {quote.project.customer.phone}</p>}
                    </div>
                </div>
            </div>

            {/* Line Items */}
            <table className="w-full mb-8 border-collapse">
                <thead>
                    <tr className="bg-gray-100 border-b border-gray-200">
                        <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase">#</th>
                        <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase w-1/2">Item & Description</th>
                        <th className="py-3 px-4 text-right text-xs font-semibold text-gray-600 uppercase w-20">Qty</th>
                        <th className="py-3 px-4 text-right text-xs font-semibold text-gray-600 uppercase w-28">Unit Price</th>
                        <th className="py-3 px-4 text-right text-xs font-semibold text-gray-600 uppercase w-20">Disc %</th>
                        <th className="py-3 px-4 text-right text-xs font-semibold text-gray-600 uppercase w-32">Amount</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {quote.items.map((item, idx) => (
                        <tr key={item.id}>
                            <td className="py-4 px-4 text-gray-500 text-sm align-top">{idx + 1}</td>
                            <td className="py-4 px-4 align-top">
                                <p className="font-medium text-gray-900 text-sm">{item.product?.name || 'Custom Item'}</p>
                                <p className="text-sm text-gray-500 mt-1 whitespace-pre-wrap leading-relaxed">{item.description}</p>
                            </td>
                            <td className="py-4 px-4 text-right text-gray-900 text-sm align-top">{item.quantity}</td>
                            <td className="py-4 px-4 text-right text-gray-900 text-sm align-top">
                                {formatCurrency(item.unitPrice)}
                            </td>
                            <td className="py-4 px-4 text-right text-gray-900 text-sm align-top">
                                {item.discount > 0 ? `${item.discount}%` : '-'}
                            </td>
                            <td className="py-4 px-4 text-right font-medium text-gray-900 text-sm align-top">
                                {formatCurrency(item.total)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end mb-12 page-break-inside-avoid">
                <div className="w-80 space-y-2">
                    <div className="flex justify-between text-sm text-gray-600 pb-2 border-b border-gray-100">
                        <span>Subtotal</span>
                        <span className="font-medium">{formatCurrency(quote.subTotal)}</span>
                    </div>

                    {taxDetails.map((tax: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-sm text-gray-600">
                            <span>{tax.name} ({tax.rate}%)</span>
                            <span>{formatCurrency(tax.amount)}</span>
                        </div>
                    ))}

                    <div className="flex justify-between text-xl font-bold text-gray-900 border-t-2 border-gray-900 pt-2 mt-2">
                        <span>Total</span>
                        <span className="text-blue-900">{formatCurrency(quote.totalAmount)}</span>
                    </div>
                </div>
            </div>

            {/* Terms */}
            <div className="mb-12 page-break-inside-avoid">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Terms & Conditions</h3>
                <div className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 p-4 rounded border border-gray-100 font-mono">
                    {quote.terms}
                </div>
            </div>

            {/* Signature Area */}
            <div className="mt-16 pt-8 border-t border-gray-300 flex justify-between items-end page-break-inside-avoid">
                <div className="text-center">
                    <p className="border-t border-gray-400 w-48 mb-2"></p>
                    <p className="text-sm font-semibold text-gray-900">Customer Acceptance</p>
                </div>
                <div className="text-center">
                    <p className="text-sm font-semibold text-gray-900">Authorized Signatory</p>
                    <p className="text-xs text-gray-500">Active Solutions</p>
                </div>
            </div>

            {/* Print Button (Hidden when printing) */}
            <div className="fixed bottom-8 right-8 print:hidden flex gap-2">
                <button
                    onClick={() => window.close()}
                    className="bg-gray-100 text-gray-700 px-6 py-3 rounded-full shadow-lg hover:bg-gray-200 font-medium"
                >
                    Close
                </button>
                <button
                    onClick={() => window.print()}
                    className="bg-blue-600 text-white px-6 py-3 rounded-full shadow-lg hover:bg-blue-700 font-medium"
                >
                    Print Quote
                </button>
            </div>

            <style jsx global>{`
                @media print {
                    @page { margin: 10mm; }
                    body { -webkit-print-color-adjust: exact; }
                }
            `}</style>
        </div>
    )
}
