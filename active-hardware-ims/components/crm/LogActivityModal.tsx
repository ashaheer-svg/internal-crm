'use client'

import { useState } from 'react'
import { X, Phone, Users, MessageSquare, Mail } from 'lucide-react'

interface LogActivityModalProps {
    isOpen: boolean
    onClose: () => void
    projectId: string
    onSuccess: () => void
}

export default function LogActivityModal({ isOpen, onClose, projectId, onSuccess }: LogActivityModalProps) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        type: 'CALL',
        subject: '',
        content: '',
        outcome: '',
        followUpDate: ''
    })

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const res = await fetch(`/api/crm/projects/${projectId}/activity`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            if (res.ok) {
                onSuccess()
                onClose()
                setFormData({ type: 'CALL', subject: '', content: '', outcome: '', followUpDate: '' })
            } else {
                alert('Failed to log activity')
            }
        } catch (error) {
            console.error(error)
            alert('Error logging activity')
        } finally {
            setLoading(false)
        }
    }

    const activityTypes = [
        { id: 'CALL', label: 'Call', icon: Phone },
        { id: 'MEETING', label: 'Meeting', icon: Users },
        { id: 'EMAIL', label: 'Email', icon: Mail },
        { id: 'NOTE', label: 'Note', icon: MessageSquare },
    ]

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="text-lg font-semibold text-gray-900">Log Activity</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                        <div className="flex gap-2">
                            {activityTypes.map(type => (
                                <button
                                    key={type.id}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type: type.id })}
                                    className={`flex-1 flex flex-col items-center justify-center p-3 rounded-lg border ${formData.type === type.id
                                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                        }`}
                                >
                                    <type.icon className="w-5 h-5 mb-1" />
                                    <span className="text-xs font-medium">{type.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Subject</label>
                        <input
                            type="text"
                            required
                            className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                            value={formData.subject}
                            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                            placeholder="e.g. Initial discovery call"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Content</label>
                        <textarea
                            required
                            className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                            rows={3}
                            value={formData.content}
                            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                            placeholder="Details about the interaction..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Outcome (Optional)</label>
                        <input
                            type="text"
                            className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                            value={formData.outcome}
                            onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
                            placeholder="e.g. Schedule follow-up"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Follow Up Task (Optional)</label>
                        <input
                            type="datetime-local"
                            className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                            value={formData.followUpDate}
                            onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
                        />
                        <p className="text-xs text-gray-500 mt-1">Selecting a date will create a task for you.</p>
                    </div>

                    <div className="flex justify-end pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="mr-3 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md border"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
                        >
                            {loading ? 'Saving...' : 'Save Activity'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
