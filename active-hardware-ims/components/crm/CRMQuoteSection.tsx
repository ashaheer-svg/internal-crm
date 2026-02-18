'use client'

import { Plus, FileText } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'

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
                                        <span className="font-medium text-gray-900">{quote.quoteNumber}</span>
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
                                        Amount: {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(quote.totalAmount)}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => window.open(`/dashboard/crm/quotes/${quote.id}/print`, '_blank')}
                                        className="p-2 text-gray-400 hover:text-gray-600"
                                        title="Print Quote"
                                    >
                                        <FileText className="w-4 h-4" />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    )
}
