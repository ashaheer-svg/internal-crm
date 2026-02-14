'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Package, Calendar, AlertCircle, CheckCircle } from 'lucide-react'
import { formatDate, formatDateTime } from '@/lib/utils'

interface ReplacementDetailsProps {
    claimId: string
    replacementType: string
    replacementItemDetails?: {
        id: string
        serialNumber: string
        status: string
        warrantyExpiry: Date | null
        product: {
            name: string
            sku: string
            brand: string | null
        }
    } | null
    replacementExternalInfo?: string | null
    replacementProvidedAt: Date
    replacementReturnedAt: Date | null
}

export default function ReplacementDetails({
    claimId,
    replacementType,
    replacementItemDetails,
    replacementExternalInfo,
    replacementProvidedAt,
    replacementReturnedAt
}: ReplacementDetailsProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    const canReturn = replacementType === 'TEMPORARY' && !replacementReturnedAt

    async function handleReturnReplacement() {
        if (!confirm('Are you sure you want to mark this temporary replacement as returned?')) {
            return
        }

        setLoading(true)
        setError('')
        setSuccess('')

        try {
            const res = await fetch(`/api/warranty/${claimId}/return`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    notes: 'Temporary replacement returned'
                })
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Failed to return replacement')
            }

            setSuccess('Replacement returned successfully!')
            setTimeout(() => {
                router.refresh()
            }, 1500)

        } catch (error: any) {
            setError(error.message || 'Failed to return replacement')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="bg-white shadow sm:rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Replacement Details</h3>
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${replacementType === 'TEMPORARY'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-purple-100 text-purple-800'
                    }`}>
                    {replacementType}
                </span>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-800">{error}</p>
                </div>
            )}

            {success && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-green-800">{success}</p>
                </div>
            )}

            {/* Replacement Item Info */}
            <div className="space-y-4">
                {replacementItemDetails ? (
                    <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-md">
                        <Package className="w-5 h-5 text-gray-400 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-gray-500">Replacement Device (Tracked)</p>
                            <p className="mt-1 text-base font-semibold text-gray-900">
                                {replacementItemDetails.serialNumber}
                            </p>
                            <p className="mt-1 text-sm text-gray-600">
                                {replacementItemDetails.product.name}
                                {replacementItemDetails.product.brand && ` • ${replacementItemDetails.product.brand}`}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                                SKU: {replacementItemDetails.product.sku}
                            </p>
                        </div>
                    </div>
                ) : replacementExternalInfo ? (
                    <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-100 rounded-md">
                        <Package className="w-5 h-5 text-yellow-500 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-yellow-800">Replacement Device (Untracked)</p>
                            <p className="mt-1 text-base font-semibold text-yellow-900">
                                {replacementExternalInfo}
                            </p>
                            <p className="mt-1 text-xs text-yellow-600 italic">
                                This unit is not tracked in the central inventory.
                            </p>
                        </div>
                    </div>
                ) : null}


                {/* Status (Only for tracked) */}
                {replacementItemDetails && (
                    <div>
                        <p className="text-sm font-medium text-gray-500">Current Status</p>
                        <p className="mt-1 text-sm text-gray-900">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${replacementItemDetails.status === 'WARRANTY_REPLACED'
                                ? 'bg-purple-100 text-purple-800'
                                : replacementItemDetails.status === 'LOANED'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                {replacementItemDetails.status}
                            </span>
                        </p>
                    </div>
                )}

                {/* Warranty (Only for tracked) */}
                {replacementItemDetails?.warrantyExpiry && (
                    <div className="flex items-start gap-2">
                        <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-gray-500">Warranty Expiry (Transferred)</p>
                            <p className="mt-1 text-sm text-gray-900">
                                {formatDate(replacementItemDetails.warrantyExpiry)}
                            </p>
                        </div>
                    </div>
                )}

                {/* Provided Date */}
                <div>
                    <p className="text-sm font-medium text-gray-500">Provided On</p>
                    <p className="mt-1 text-sm text-gray-900">
                        {formatDateTime(replacementProvidedAt)}
                    </p>
                </div>

                {/* Returned Date (if applicable) */}
                {replacementReturnedAt && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                        <p className="text-sm font-medium text-green-900">Returned On</p>
                        <p className="mt-1 text-sm text-green-800">
                            {formatDateTime(replacementReturnedAt)}
                        </p>
                    </div>
                )}

                {/* Return Button (for temporary replacements) */}
                {canReturn && (
                    <button
                        onClick={handleReturnReplacement}
                        disabled={loading}
                        className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
                    >
                        {loading ? 'Processing...' : 'Mark as Returned'}
                    </button>
                )}

                {/* Info for permanent replacements */}
                {replacementType === 'PERMANENT' && !replacementReturnedAt && (
                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-md">
                        <p className="text-sm text-purple-900">
                            <strong>Permanent Replacement:</strong> Customer keeps this device.
                            Original device should be returned to inventory.
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
