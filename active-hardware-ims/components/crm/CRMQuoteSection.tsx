'use client'

import { Plus, FileText, Edit, Copy, CheckCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { formatCurrency } from '@/lib/format'

interface Quote {
    id: string
    quoteNumber: string
    status: string
    createdAt: string
    totalAmount: number
}

interface QuoteSectionProps {
    projectId: string
    quotes: Quote[]
}

export default function CRMQuoteSection({ projectId, quotes }: QuoteSectionProps) {
    const router = useRouter()

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Project Quotes</h3>
                <button
                    onClick={() => router.push(`/dashboard/crm/projects/${projectId}/quotes/new`)}
                    className="flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                >
                    <Plus className="w-4 h-4 mr-2" />
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
                            <li key={quote.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => router.push(`/dashboard/crm/projects/${projectId}/quotes/${quote.id}`)}
                                            className="font-medium text-blue-600 hover:underline"
                                        >
                                            {quote.quoteNumber}
                                        </button>
                                        <span className={`text-xs px-2 py-0.5 rounded ${quote.status === 'DRAFT' ? 'bg-gray-100 text-gray-700' :
                                            quote.status === 'SENT' ? 'bg-blue-100 text-blue-700' :
                                                quote.status === 'ACCEPTED' ? 'bg-green-100 text-green-700' :
                                                    'bg-red-100 text-red-700'
                                            }`}>
                                            {quote.status}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Created {formatDistanceToNow(new Date(quote.createdAt))} ago •
                                        Amount: {formatCurrency(quote.totalAmount)}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => router.push(`/dashboard/crm/projects/${projectId}/quotes/${quote.id}/edit`)}
                                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                                        title="Edit Quote"
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
                                            onClick={async () => {
                                                if (!confirm('Mark as Accepted?')) return
                                                try {
                                                    const res = await fetch(`/api/crm/quotes/${quote.id}/confirm`, { method: 'POST' })
                                                    if (res.ok) {
                                                        router.refresh()
                                                    }
                                                } catch (e) {
                                                    console.error(e)
                                                    alert('Failed to confirm')
                                                }
                                            }}
                                            className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                                            title="Approve Quote"
                                        >
                                            <CheckCircle className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    )
}
