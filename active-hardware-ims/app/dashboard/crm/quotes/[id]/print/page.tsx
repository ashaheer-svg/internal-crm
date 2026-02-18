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
        totalPrice: number
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

    const subtotal = quote.items.reduce((sum, item) => sum + item.totalPrice, 0)
    const tax = subtotal * 0.18 // Keeping consistent with builder

    return (
        <div className="bg-white min-h-screen p-8 text-gray-900 font-sans print:p-0">
            {/* Header */}
            <div className="flex justify-between items-start mb-8 border-b pb-6">
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
                        <p className="text-sm"><span className="font-semibold text-gray-600">Valid Until:</span> {format(new Date(quote.validUntil), 'dd MMM yyyy')}</p>
                    </div>
                </div>
            </div>

            {/* Customer & Bill To */}
            <div className="mb-8">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Quotation For</h3>
                <div className="bg-gray-50 p-4 rounded-md border border-gray-100">
                    <h4 className="font-bold text-lg">{quote.project.customer.name}</h4>
                    {quote.project.customer.address && <p className="text-gray-600 whitespace-pre-line">{quote.project.customer.address}</p>}
                    <div className="mt-2 text-sm text-gray-500">
                        {quote.project.customer.email && <p>Email: {quote.project.customer.email}</p>}
                        {quote.project.customer.phone && <p>Phone: {quote.project.customer.phone}</p>}
                    </div>
                </div>
            </div>

            {/* Line Items */}
            <table className="w-full mb-8">
                <thead>
                    <tr className="bg-gray-100 border-b border-gray-200">
                        <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase">Item & Description</th>
                        <th className="py-3 px-4 text-right text-xs font-semibold text-gray-600 uppercase w-24">Qty</th>
                        <th className="py-3 px-4 text-right text-xs font-semibold text-gray-600 uppercase w-32">Unit Price</th>
                        <th className="py-3 px-4 text-right text-xs font-semibold text-gray-600 uppercase w-32">Amount</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {quote.items.map((item) => (
                        <tr key={item.id}>
                            <td className="py-4 px-4">
                                <p className="font-medium text-gray-900">{item.product?.name || 'Custom Item'}</p>
                                <p className="text-sm text-gray-500 mt-0.5 whitespace-pre-wrap">{item.description}</p>
                            </td>
                            <td className="py-4 px-4 text-right text-gray-900">{item.quantity}</td>
                            <td className="py-4 px-4 text-right text-gray-900">
                                {formatCurrency(item.unitPrice)}
                            </td>
                            <td className="py-4 px-4 text-right font-medium text-gray-900">
                                {formatCurrency(item.totalPrice)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end mb-12">
                <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm text-gray-600">
                        <span>Subtotal</span>
                        <span>{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                        <span>Tax (18%)</span>
                        <span>{formatCurrency(tax)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold text-gray-900 border-t-2 border-gray-900 pt-2 text-blue-900">
                        <span>Total (INR)</span>
                        <span>{formatCurrency(quote.totalAmount)}</span>
                    </div>
                </div>
            </div>

            {/* Terms */}
            <div className="mb-12 grid grid-cols-2 gap-8">
                <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Terms & Conditions</h3>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{quote.terms}</p>
                </div>
                <div className="mt-8 pt-8 border-t border-gray-300 text-center">
                    <p className="text-sm font-semibold text-gray-900">Authorized Signatory</p>
                    <p className="text-xs text-gray-500">Active Solutions</p>
                </div>
            </div>

            {/* Print Button (Hidden when printing) */}
            <div className="fixed bottom-8 right-8 print:hidden">
                <button
                    onClick={() => window.print()}
                    className="bg-blue-600 text-white px-6 py-3 rounded-full shadow-lg hover:bg-blue-700 font-medium"
                >
                    Print Quote
                </button>
            </div>
        </div>
    )
}
