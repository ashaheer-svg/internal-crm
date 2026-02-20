"use client"

import { useState } from "react"
import { Users, Shield } from "lucide-react"
import BackButton from "@/components/BackButton"
import UsersTab from "./UsersTab"
import RolesTab from "./RolesTab"

export default function UserManagementPage() {
    const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users')

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <BackButton />
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">User Management</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage system users, custom roles, and access permissions</p>
                </div>
            </div>

            {/* Custom Tab Navigation */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`
                            whitespace-nowrap flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                            ${activeTab === 'users'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }
                        `}
                    >
                        <Users className={`h-5 w-5 ${activeTab === 'users' ? 'text-blue-500' : 'text-gray-400'}`} />
                        Accounts Directory
                    </button>

                    <button
                        onClick={() => setActiveTab('roles')}
                        className={`
                            whitespace-nowrap flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                            ${activeTab === 'roles'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }
                        `}
                    >
                        <Shield className={`h-5 w-5 ${activeTab === 'roles' ? 'text-blue-500' : 'text-gray-400'}`} />
                        Roles & Permissions Matrix
                    </button>
                </nav>
            </div>

            {/* Tab Content Rendering */}
            <div className="mt-6">
                <div className={activeTab === 'users' ? 'block animate-in fade-in slide-in-from-bottom-2' : 'hidden'}>
                    <UsersTab />
                </div>

                <div className={activeTab === 'roles' ? 'block animate-in fade-in slide-in-from-bottom-2' : 'hidden'}>
                    <RolesTab />
                </div>
            </div>
        </div>
    )
}
