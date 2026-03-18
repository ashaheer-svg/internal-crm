'use client'

import { useState, useEffect } from 'react'
import { X, Calendar } from 'lucide-react'
import SalesRepSelector from '@/components/selectors/SalesRepSelector'

interface EditProjectModalProps {
    isOpen: boolean
    onClose: () => void
    project: any
    onSuccess: () => void
}

export default function EditProjectModal({ isOpen, onClose, project, onSuccess }: EditProjectModalProps) {
    const [loading, setLoading] = useState(false)

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        expectedValue: '',
        currency: 'Rs.',
        expectedCloseDate: '',
        targetDate: '',
        salesRepId: '',
        brand: ''
    })

    useEffect(() => {
        if (project) {
            setFormData({
                title: project.title || '',
                description: project.description || '',
                expectedValue: project.expectedValue || '',
                currency: project.currency || 'Rs.',
                expectedCloseDate: project.expectedCloseDate ? project.expectedCloseDate.substring(0, 10) : '',
                targetDate: project.targetDate ? project.targetDate.substring(0, 10) : '',
                salesRepId: project.salesRepId || '',
                brand: project.brand || ''
            })
        }
    }, [project, isOpen])



    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const res = await fetch(`/api/crm/projects/${project.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    expectedCloseDate: formData.expectedCloseDate ? new Date(formData.expectedCloseDate) : null,
                    targetDate: formData.targetDate ? new Date(formData.targetDate) : null,
                    expectedValue: Number(formData.expectedValue)
                })
            })

            if (res.ok) {
                onSuccess()
                onClose()
            } else {
                alert('Failed to update project')
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-lg font-semibold">Edit Project</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Title</label>
                        <input
                            type="text"
                            required
                            className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Brand</label>
                        <input
                            type="text"
                            className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                            value={formData.brand}
                            onChange={e => setFormData({ ...formData, brand: e.target.value })}
                            placeholder="e.g. Cisco, HP, Dell"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Sales Representative</label>
                        <SalesRepSelector
                            label=""
                            selectedId={formData.salesRepId}
                            onSelect={(rep) => setFormData({ ...formData, salesRepId: rep?.id || '' })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Value</label>
                            <input
                                type="number"
                                className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                                value={formData.expectedValue}
                                onChange={e => setFormData({ ...formData, expectedValue: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Currency</label>
                            <select
                                className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                                value={formData.currency}
                                onChange={e => setFormData({ ...formData, currency: e.target.value })}
                            >
                                <option value="Rs.">Rs.</option>
                                <option value="USD">USD</option>
                                <option value="EUR">EUR</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Target Date</label>
                        <input
                            type="date"
                            className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                            value={formData.targetDate}
                            onChange={e => setFormData({ ...formData, targetDate: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Expected Closing (Month)</label>
                        <input
                            type="month"
                            className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                            value={formData.expectedCloseDate ? formData.expectedCloseDate.substring(0, 7) : ''}
                            onChange={e => setFormData({ ...formData, expectedCloseDate: e.target.value ? `${e.target.value}-01` : '' })}
                        />
                        <p className="text-xs text-gray-500 mt-1">For Sales Forecasting</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Description</label>
                        <textarea
                            className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                            rows={3}
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <div className="flex justify-end space-x-2 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border rounded-md hover:bg-gray-50 text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm disabled:opacity-50"
                        >
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
