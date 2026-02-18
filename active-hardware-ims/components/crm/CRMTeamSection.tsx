'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'

interface Member {
    id: string
    role: string
    userId: string
    user: { name: string }
}

interface TeamSectionProps {
    projectId: string
    members: Member[]
    onUpdate: () => void
}

export default function CRMTeamSection({ projectId, members, onUpdate }: TeamSectionProps) {
    const [showAdd, setShowAdd] = useState(false)

    return (
        <div className="max-w-3xl space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Project Team</h3>
                <button
                    onClick={() => setShowAdd(!showAdd)}
                    className="flex items-center px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Member
                </button>
            </div>

            {showAdd && (
                <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200 text-sm text-yellow-800">
                    User search functionality is pending. Currently, only the project creator (Owner) is in the team.
                </div>
            )}

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <ul className="divide-y divide-gray-200">
                    {members.map((member) => (
                        <li key={member.id} className="p-4 flex items-center justify-between">
                            <div className="flex items-center">
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                                    {member.user.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-900">{member.user.name}</p>
                                    <p className="text-sm text-gray-500">{member.role}</p>
                                </div>
                            </div>
                            {member.role !== 'OWNER' && (
                                <button className="text-red-600 hover:text-red-800 p-2">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    )
}
