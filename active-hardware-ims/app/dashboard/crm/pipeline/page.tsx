'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, BarChart3, Users, User, History, TrendingUp } from 'lucide-react'
import ListView from './ListView'
import CreateCustomerButton from '@/components/CreateCustomerButton'
import DashboardTasks from '@/components/crm/DashboardTasks'

export default function PipelinePage() {
    const [canViewAll, setCanViewAll] = useState(false)
    const [scope, setScope] = useState<'all' | 'mine'>('all')
    const [hideWon, setHideWon] = useState(false)
    const [hideApproved, setHideApproved] = useState(false)
    const [hideShipped, setHideShipped] = useState(false)
    const [doStatus, setDoStatus] = useState<string | null>(null) // null = no filter

    const router = useRouter()

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex flex-col border-b bg-white shadow-sm">
                {/* Row 1: Title + Primary Actions */}
                <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100">
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">CRM Pipeline</h1>

                    {/* Right: action buttons */}
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => router.push(`/dashboard/crm/reports?scope=${scope}`)}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                            >
                                <BarChart3 className="w-4 h-4 text-blue-600" />
                                Reports
                            </button>
                            <button
                                onClick={() => router.push(`/dashboard/crm/insights?scope=${scope}`)}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                            >
                                <TrendingUp className="w-4 h-4 text-emerald-600" />
                                Insights
                            </button>
                            <button
                                onClick={() => router.push(`/dashboard/crm/reports?scope=${scope}&range=history`)}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                            >
                                <History className="w-4 h-4 text-blue-600" />
                                History
                            </button>
                        </div>

                        <div className="h-6 w-px bg-gray-200" />

                        <div className="flex items-center gap-3">
                            <CreateCustomerButton variant="primary" />
                            <button
                                onClick={() => router.push('/dashboard/crm/projects/new')}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm"
                            >
                                <Plus className="w-4 h-4" />
                                Add Project
                            </button>
                        </div>
                    </div>
                </div>

                {/* Row 2: Scope + Filters */}
                <div className="flex items-center gap-6 px-6 py-2 bg-gray-50/50">
                    {/* Scope Toggle */}
                    {canViewAll && (
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Scope</span>
                            <div className="flex bg-gray-200/50 rounded-lg p-0.5 border border-gray-200">
                                <button
                                    onClick={() => setScope('all')}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-bold transition-all ${scope === 'all' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    <Users className="w-3.5 h-3.5" />
                                    ALL
                                </button>
                                <button
                                    onClick={() => setScope('mine')}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-bold transition-all ${scope === 'mine' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    <User className="w-3.5 h-3.5" />
                                    MINE
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="h-4 w-px bg-gray-300" />

                    <div className="flex items-center gap-3">
                        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Filters</span>
                        <div className="flex bg-gray-200/50 rounded-lg p-0.5 border border-gray-200">
                            <button
                                onClick={() => setHideWon(!hideWon)}
                                className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all ${hideWon ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                HIDE WON
                            </button>
                            <button
                                onClick={() => setHideApproved(!hideApproved)}
                                className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all ${hideApproved ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                HIDE APPROVED
                            </button>
                            <button
                                onClick={() => setHideShipped(!hideShipped)}
                                className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all ${hideShipped ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                HIDE SHIPPED
                            </button>
                        </div>
                    </div>

                    <div className="h-4 w-px bg-gray-300" />

                    {/* DO Status Filter */}
                    <div className="flex items-center gap-3">
                        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">DO Status</span>
                        <div className="flex flex-wrap gap-1">
                            {([
                                { value: 'DRAFT', label: 'Draft', cls: 'bg-gray-100 text-gray-600 border-gray-200' },
                                { value: 'CONFIRMED', label: 'Confirmed', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
                                { value: 'READY_FOR_BUILD', label: 'Ready to Build', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
                                { value: 'BUILDING', label: 'Building', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
                                { value: 'COMPLETED', label: 'Shipped', cls: 'bg-green-50 text-green-700 border-green-200' },
                            ] as const).map(({ value, label, cls }) => (
                                <button
                                    key={value}
                                    onClick={() => setDoStatus(doStatus === value ? null : value)}
                                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition-all ${doStatus === value
                                            ? cls + ' shadow-sm ring-1 ring-inset ring-current/30'
                                            : 'bg-white border-gray-200 text-gray-400 hover:text-gray-600'
                                        }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col">
                <DashboardTasks />
                <div className="flex-1 p-6">
                    <ListView
                        scope={scope}
                        onCanViewAllLoaded={setCanViewAll}
                        hideWon={hideWon}
                        hideApproved={hideApproved}
                        hideShipped={hideShipped}
                        doStatus={doStatus}
                    />
                </div>
            </div>
        </div>
    )
}
