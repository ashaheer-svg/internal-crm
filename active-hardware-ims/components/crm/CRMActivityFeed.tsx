'use client'

import { Phone, Users, MessageSquare, Mail, GitCommit, ArrowRight } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Activity {
    id: string
    type: 'CALL' | 'MEETING' | 'NOTE' | 'EMAIL' | 'SYSTEM'
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
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${activity.type === 'SYSTEM' ? 'bg-gray-100' : 'bg-blue-100'
                            }`}>
                            {activity.type === 'CALL' ? <Phone className="w-4 h-4 text-blue-600" /> :
                                activity.type === 'MEETING' ? <Users className="w-4 h-4 text-purple-600" /> :
                                    activity.type === 'EMAIL' ? <Mail className="w-4 h-4 text-yellow-600" /> :
                                        activity.type === 'SYSTEM' ? <GitCommit className="w-4 h-4 text-gray-500" /> :
                                            <MessageSquare className="w-4 h-4 text-gray-600" />}
                        </div>
                    </div>
                    <div className="flex-1">
                        {activity.type === 'SYSTEM' ? (
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <span className="text-sm font-medium text-gray-700">{activity.subject}</span>
                                <span className="text-xs text-gray-400 mx-2">•</span>
                                <span className="text-xs text-gray-400">
                                    {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                                </span>
                                <p className="text-sm text-gray-600 mt-1">{activity.content}</p>
                            </div>
                        ) : (
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
                        )}
                    </div>
                </div>
            ))}
        </div>
    )
}
