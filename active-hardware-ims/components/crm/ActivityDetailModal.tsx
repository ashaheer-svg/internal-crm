'use client'

import { X, Phone, Users, Mail, FileText, Clock } from 'lucide-react'
import { format } from 'date-fns'

interface ActivityDetailModalProps {
    isOpen: boolean
    onClose: () => void
    userName: string
    date: string
    activities: {
        id: string
        type: string
        subject: string
        content: string | null
        createdAt: string
    }[]
}

export default function ActivityDetailModal({ isOpen, onClose, userName, date, activities }: ActivityDetailModalProps) {
    if (!isOpen) return null

    const typeIcons: Record<string, any> = {
        CALL: Phone,
        MEETING: Users,
        EMAIL: Mail,
        NOTE: FileText
    }

    const typeColors: Record<string, string> = {
        CALL: 'bg-green-100 text-green-700',
        MEETING: 'bg-blue-100 text-blue-700',
        EMAIL: 'bg-purple-100 text-purple-700',
        NOTE: 'bg-orange-100 text-orange-700'
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">{userName}</h3>
                        <p className="text-sm text-gray-500">{format(new Date(date), 'EEEE, do MMMM yyyy')}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="max-h-[60vh] overflow-y-auto p-6 space-y-4">
                    {activities.length === 0 ? (
                        <div className="text-center py-10">
                            <p className="text-gray-400">No activities found for this day.</p>
                        </div>
                    ) : (
                        activities.map((activity) => {
                            const Icon = typeIcons[activity.type] || FileText
                            return (
                                <div key={activity.id} className="flex gap-4 p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors group">
                                    <div className={`p-3 rounded-xl h-fit ${typeColors[activity.type] || 'bg-gray-100 text-gray-600'}`}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center justify-between">
                                            <h4 className="font-bold text-gray-900">{activity.subject}</h4>
                                            <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                                <Clock className="w-3 h-3" />
                                                {format(new Date(activity.createdAt), 'h:mm a')}
                                            </div>
                                        </div>
                                        <div className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                                            {activity.content || 'No details provided.'}
                                        </div>
                                        <div className="pt-1 flex items-center gap-2">
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${typeColors[activity.type] || 'bg-gray-100 text-gray-600'}`}>
                                                {activity.type}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>

                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    )
}
