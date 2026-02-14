"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface StatusUpdateFormProps {
    claimId: string
    currentStatus: string
}

export default function StatusUpdateForm({ claimId, currentStatus }: StatusUpdateFormProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    const statusFlow = {
        'PENDING': 'IN_PROGRESS',
        'IN_PROGRESS': 'AWAITING_SUPPLIER',
        'AWAITING_SUPPLIER': 'RESOLVED',
        'RESOLVED': 'CLOSED',
        'CLOSED': null
    }

    const nextStatus = statusFlow[currentStatus as keyof typeof statusFlow]

    const getNextStatusLabel = (status: string | null) => {
        if (!status) return null
        switch (status) {
            case 'IN_PROGRESS':
                return 'Start Working on Claim'
            case 'AWAITING_SUPPLIER':
                return 'Send to Supplier'
            case 'RESOLVED':
                return 'Mark as Resolved'
            case 'CLOSED':
                return 'Close Claim'
            default:
                return status
        }
    }

    async function handleStatusUpdate() {
        if (!nextStatus) return

        setLoading(true)

        try {
            const res = await fetch(`/api/warranty/${claimId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: nextStatus })
            })

            if (!res.ok) {
                throw new Error('Failed to update status')
            }

            router.refresh()
        } catch (error) {
            console.error('Failed to update status:', error)
            alert('Failed to update status')
        } finally {
            setLoading(false)
        }
    }

    if (!nextStatus) {
        return (
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <p className="text-sm text-green-800">
                    ✅ This claim has been closed.
                </p>
            </div>
        )
    }

    return (
        <div className="border-t pt-4">
            <p className="text-sm text-gray-600 mb-3">Update claim to next status:</p>
            <button
                onClick={handleStatusUpdate}
                disabled={loading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? 'Updating...' : getNextStatusLabel(nextStatus)}
            </button>
        </div>
    )
}
