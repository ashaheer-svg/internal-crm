'use client'

import { useState, useEffect, use } from 'react'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/format'
import DocumentHeader from '@/components/DocumentHeader'
import DocumentFooter from '@/components/DocumentFooter'
import BackButton from '@/components/BackButton'
import '@/styles/print.css'

interface Quote {
    id: string
    quoteNumber: string
    validUntil: string
    createdAt: string
    totalAmount: number
    subTotal: number
    taxAmount: number
    taxDetails: string | null
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
        productModel: string | null
        serialNumbers: string | null
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

    let taxDetails: any[] = []
    try { if (quote.taxDetails) taxDetails = JSON.parse(quote.taxDetails) } catch (e) { }

    return (
        <>
            {/* Print actions — fixed bottom-right, hidden on print via .print-actions */}
            <div className="print-actions">
                <BackButton className="print-btn print-btn-secondary" />
                <button onClick={() => window.close()} className="print-btn print-btn-secondary">
                    Close
                </button>
                <button onClick={() => window.print()} className="print-btn print-btn-primary">
                    Print Quote
                </button>
            </div>

            <div className="print-container" style={{ maxWidth: '210mm' }}>
                {/* Header */}
                <DocumentHeader title="Quotation" hideMeta />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '2rem', marginTop: '-1.5rem' }}>
                    <div style={{ textAlign: 'right', lineHeight: 1.8, fontSize: '0.875rem' }}>
                        <p><span style={{ fontWeight: 600, color: 'var(--print-text-muted)' }}>Quote #:</span> {quote.quoteNumber}</p>
                        <p><span style={{ fontWeight: 600, color: 'var(--print-text-muted)' }}>Date:</span> {format(new Date(quote.createdAt), 'dd MMM yyyy')}</p>
                        <p><span style={{ fontWeight: 600, color: 'var(--print-text-muted)' }}>Valid Until:</span> {quote.validUntil ? format(new Date(quote.validUntil), 'dd MMM yyyy') : 'N/A'}</p>
                    </div>
                </div>

                {/* Customer */}
                <div style={{ marginBottom: '2rem' }}>
                    <h3 className="print-info-label" style={{ marginBottom: '0.5rem' }}>Quotation For</h3>
                    <div className="print-info-section">
                        <h4 style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--print-text-base)' }}>{quote.project.customer.name}</h4>
                        {quote.project.customer.address && <p style={{ color: 'var(--print-text-muted)', whiteSpace: 'pre-line', marginTop: '0.25rem' }}>{quote.project.customer.address}</p>}
                        <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--print-text-muted)' }}>
                            {quote.project.customer.email && <p>Email: {quote.project.customer.email}</p>}
                            {quote.project.customer.phone && <p>Phone: {quote.project.customer.phone}</p>}
                        </div>
                    </div>
                </div>

                {/* Line Items */}
                <table className="print-table" style={{ marginBottom: '2rem' }}>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th style={{ width: '50%' }}>Item &amp; Description</th>
                            <th style={{ textAlign: 'right', width: '5rem' }}>Qty</th>
                            <th style={{ textAlign: 'right', width: '7rem' }}>Unit Price</th>
                            <th style={{ textAlign: 'right', width: '5rem' }}>Disc %</th>
                            <th style={{ textAlign: 'right', width: '8rem' }}>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {quote.items.map((item, idx) => (
                            <tr key={item.id}>
                                <td style={{ color: 'var(--print-text-muted)', fontSize: '0.875rem' }}>{idx + 1}</td>
                                <td>
                                    <p style={{ fontWeight: 500, fontSize: '0.875rem' }}>{item.product?.name || 'Custom Item'}</p>
                                    <p style={{ fontSize: '0.875rem', color: 'var(--print-text-muted)', marginTop: '0.25rem', whiteSpace: 'pre-wrap' }}>{item.description}</p>
                                    {(item.productModel || item.serialNumbers) && (
                                        <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'var(--print-bg-muted)', borderRadius: '4px', fontSize: '0.75rem', borderLeft: '2px solid var(--print-brand-primary)' }}>
                                            {item.productModel && <p><strong>Model:</strong> {item.productModel}</p>}
                                            {item.serialNumbers && <p style={{ marginTop: '0.25rem' }}><strong>Serial(s):</strong> {item.serialNumbers}</p>}
                                        </div>
                                    )}
                                </td>
                                <td style={{ textAlign: 'right', fontSize: '0.875rem' }}>{item.quantity}</td>
                                <td style={{ textAlign: 'right', fontSize: '0.875rem' }}>{formatCurrency(item.unitPrice)}</td>
                                <td style={{ textAlign: 'right', fontSize: '0.875rem' }}>{item.discount > 0 ? `${item.discount}%` : '-'}</td>
                                <td style={{ textAlign: 'right', fontWeight: 500, fontSize: '0.875rem' }}>{formatCurrency(item.total)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Totals */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '3rem' }}>
                    <div style={{ width: '20rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: 'var(--print-text-muted)', paddingBottom: '0.5rem', borderBottom: '1px solid var(--print-border)', marginBottom: '0.5rem' }}>
                            <span>Subtotal</span>
                            <span style={{ fontWeight: 500 }}>{formatCurrency(quote.subTotal)}</span>
                        </div>
                        {taxDetails.map((tax: any, idx: number) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: 'var(--print-text-muted)', marginBottom: '0.25rem' }}>
                                <span>{tax.name} ({tax.rate}%)</span>
                                <span>{formatCurrency(tax.amount)}</span>
                            </div>
                        ))}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: 700, borderTop: '2px solid var(--print-text-base)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                            <span>Total</span>
                            <span style={{ color: 'var(--print-brand-primary)' }}>{formatCurrency(quote.totalAmount)}</span>
                        </div>
                    </div>
                </div>

                {/* Terms */}
                <div style={{ marginBottom: '3rem' }}>
                    <h3 className="print-info-label" style={{ marginBottom: '0.5rem' }}>Terms &amp; Conditions</h3>
                    <div className="print-notes" style={{ fontFamily: 'monospace', fontSize: '0.875rem', color: 'var(--print-text-muted)', whiteSpace: 'pre-wrap' }}>
                        {quote.terms}
                    </div>
                </div>

                {/* Signatures */}
                <div className="print-signatures" style={{ marginTop: '4rem', borderTop: '1px solid var(--print-border)', paddingTop: '2rem' }}>
                    <div className="print-signature-box">
                        <p style={{ fontWeight: 600 }}>Customer Acceptance</p>
                    </div>
                    <div className="print-signature-box" style={{ textAlign: 'right' }}>
                        <p style={{ fontWeight: 600 }}>Authorized Signatory</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--print-text-muted)' }}>Active Solutions</p>
                    </div>
                </div>
                <DocumentFooter />
            </div>
        </>
    )
}
