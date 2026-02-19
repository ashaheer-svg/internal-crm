'use client'

import { useState, use } from 'react'
import { useRouter } from 'next/navigation'
import QuoteForm from '@/components/crm/QuoteForm'

export default function NewQuotePage({ params }: { params: Promise<{ id: string }> }) {
    const { id: projectId } = use(params)
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    async function handleSave(data: any) {
        setLoading(true)
        try {
            const res = await fetch('/api/crm/quotes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            })

            if (res.ok) {
                router.push(`/dashboard/crm/projects/${projectId}`)
            } else {
                const err = await res.json()
                alert(err.error || 'Failed to save quote')
            }
        } catch (error) {
            console.error(error)
            alert('Error saving quote')
        } finally {
            setLoading(false)
        }
    }

    return (
        <QuoteForm
            projectId={projectId}
            onSubmit={handleSave}
            loading={loading}
            title="New Quote"
        />
    )
}
