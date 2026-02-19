'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import QuoteForm from '@/components/crm/QuoteForm'

export default function EditQuotePage({ params }: { params: Promise<{ id: string, quoteId: string }> }) {
    const { id: projectId, quoteId } = use(params)
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [quote, setQuote] = useState<any>(null)
    const [fetching, setFetching] = useState(true)

    useEffect(() => {
        fetchQuote()
    }, [quoteId])

    async function fetchQuote() {
        try {
            const res = await fetch(`/api/crm/quotes/${quoteId}`)
            if (res.ok) {
                const data = await res.json()
                // Transform if necessary, but QuoteForm seems flexible
                setQuote({
                    ...data,
                    validUntil: data.validUntil ? new Date(data.validUntil).toISOString().split('T')[0] : '',
                })
            } else {
                alert('Quote not found')
                router.back()
            }
        } catch (error) {
            console.error(error)
            alert('Error fetching quote')
        } finally {
            setFetching(false)
        }
    }

    async function handleSave(data: any) {
        setLoading(true)
        try {
            const res = await fetch(`/api/crm/quotes/${quoteId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            })

            if (res.ok) {
                router.push(`/dashboard/crm/projects/${projectId}`)
            } else {
                const err = await res.json()
                alert(err.error || 'Failed to update quote')
            }
        } catch (error) {
            console.error(error)
            alert('Error updating quote')
        } finally {
            setLoading(false)
        }
    }

    if (fetching) return <div className="p-8">Loading Quote...</div>
    if (!quote) return <div className="p-8">Quote not found</div>

    return (
        <QuoteForm
            projectId={projectId}
            initialData={quote}
            onSubmit={handleSave}
            loading={loading}
            title={`Edit Quote ${quote.quoteNumber}`}
        />
    )
}
