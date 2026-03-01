"use client"

import { useState } from "react"
import UsersTab from "./UsersTab"
import RolesTab from "./RolesTab"
import SalesRepsTab from "./SalesRepsTab"
import MaintenanceTab from "./MaintenanceTab"
import { Users, Shield, Database, UserCircle } from "lucide-react"
import BackButton from "@/components/BackButton"

type Tab = 'users' | 'roles' | 'sales-reps' | 'maintenance'

export default function UserManagementPage() {
    const [activeTab, setActiveTab] = useState<Tab>('users')

    const tabs: { id: Tab; label: string; icon: any }[] = [
        { id: 'users', label: 'Accounts Directory', icon: Users },
        { id: 'roles', label: 'Roles & Permissions Matrix', icon: Shield },
        { id: 'sales-reps', label: 'Sales Representatives', icon: UserCircle },
        { id: 'maintenance', label: 'System Maintenance', icon: Database },
    ]

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <BackButton />
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">User Management</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage system users, custom roles, access permissions, and sales staff</p>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                                whitespace-nowrap flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                                ${activeTab === tab.id
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }
                            `}
                        >
                            <tab.icon className={`h-5 w-5 ${activeTab === tab.id ? 'text-blue-500' : 'text-gray-400'}`} />
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Content */}
            <div className="mt-6">
                <div className={activeTab === 'users' ? 'block animate-in fade-in slide-in-from-bottom-2' : 'hidden'}>
                    <UsersTab />
                </div>
                <div className={activeTab === 'roles' ? 'block animate-in fade-in slide-in-from-bottom-2' : 'hidden'}>
                    <RolesTab />
                </div>
                <div className={activeTab === 'sales-reps' ? 'block animate-in fade-in slide-in-from-bottom-2' : 'hidden'}>
                    <SalesRepsTab />
                </div>
                <div className={activeTab === 'maintenance' ? 'block animate-in fade-in slide-in-from-bottom-2' : 'hidden'}>
                    <MaintenanceTab />
                </div>
            </div>
        </div>
    )
}
