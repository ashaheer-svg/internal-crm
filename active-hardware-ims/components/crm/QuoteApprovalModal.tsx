import { useState } from 'react'
import { X, CheckCircle, Upload, Loader2 } from 'lucide-react'

interface QuoteApprovalModalProps {
    isOpen: boolean
    onClose: () => void
    onApprove: (data: { poNumber: string; poDocumentUrl: string; expectedDeliveryDate: string; urgency: string }) => Promise<void>
    quoteNumber: string
}

export default function QuoteApprovalModal({ isOpen, onClose, onApprove, quoteNumber }: QuoteApprovalModalProps) {
    const [poNumber, setPoNumber] = useState('')
    const [poDocumentUrl, setPoDocumentUrl] = useState('')
    const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('')
    const [urgency, setUrgency] = useState('MEDIUM')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState('')

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setIsSubmitting(true)

        try {
            await onApprove({ poNumber, poDocumentUrl, expectedDeliveryDate, urgency })
            onClose() // Only close on success
        } catch (err: any) {
            setError(err.message || 'Failed to approve quote')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">Approve Quote</h3>
                        <p className="text-sm text-gray-500 mt-1">Provide processing details for {quoteNumber}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-100">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <form id="approve-quote-form" onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                PO Number (Required)
                            </label>
                            <input
                                type="text"
                                required
                                value={poNumber}
                                onChange={(e) => setPoNumber(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                                placeholder="e.g. PO-2026-001"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                PO Document Link (Optional)
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Upload className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="url"
                                    value={poDocumentUrl}
                                    onChange={(e) => setPoDocumentUrl(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                                    placeholder="https://drive.google.com/..."
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Provide a link to the uploaded Purchase Order document.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Expected Delivery Date (Optional)
                            </label>
                            <input
                                type="date"
                                value={expectedDeliveryDate}
                                onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Urgency
                            </label>
                            <select
                                value={urgency}
                                onChange={(e) => setUrgency(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm bg-white"
                            >
                                <option value="LOW">Low - No rush</option>
                                <option value="MEDIUM">Medium - Standard processing</option>
                                <option value="HIGH">High - Expedite delivery</option>
                                <option value="URGENT">Urgent - Immediate attention required</option>
                            </select>
                        </div>
                    </form>
                </div>

                <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                        disabled={isSubmitting}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="approve-quote-form"
                        disabled={isSubmitting}
                        className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-green-600 rounded-xl hover:bg-green-700 transition-colors shadow-sm disabled:opacity-70"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <CheckCircle className="w-4 h-4" />
                                Mark as Approved
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
