'use client'

import { Phone, Users, MessageSquare } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Activity {
    id: string
    type: 'CALL' | 'MEETING' | 'NOTE' | 'EMAIL'
    subject: string
    content: string | null
    outcome: string | null
    createdAt: string
    createdBy: { name: string }
}

export default function CRMActivityFeed({ activities }: { activities: Activity[] }) {
    if (activities.length === 0) {
        return <div className="text-gray-500 text-center py-8">No activities yet. Log a call or note.</div>
    }

    return (
        <div className="space-y-6">
            {activities.map((activity) => (
                <div key={activity.id} className="flex gap-4">
                    <div className="flex-shrink-0 mt-1">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                            {activity.type === 'CALL' ? <Phone className="w-4 h-4 text-blue-600" /> :
                                activity.type === 'MEETING' ? <Users className="w-4 h-4 text-purple-600" /> :
                                    <MessageSquare className="w-4 h-4 text-gray-600" />}
                        </div>
                    </div>
                    <div className="flex-1">
                        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                            <div className="flex justify-between items-start">
                                <div>
                                    <span className="font-medium text-gray-900">{activity.subject}</span>
                                    <span className="text-gray-500 text-sm ml-2">by {activity.createdBy.name}</span>
                                </div>
                                <span className="text-xs text-gray-400">
                                    {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                                </span>
                            </div>
                            {activity.content && (
                                <p className="text-gray-600 mt-2 text-sm whitespace-pre-wrap">{activity.content}</p>
                            )}
                            {activity.outcome && (
                                <div className="mt-2 text-xs bg-gray-50 inline-block px-2 py-1 rounded text-gray-500 border">
                                    Outcome: {activity.outcome}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}
