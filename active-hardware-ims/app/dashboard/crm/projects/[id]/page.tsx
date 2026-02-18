'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import {
    Calendar,
    CheckSquare,
    Clock,
    DollarSign,
    FileText,
    Users,
    User,
    Plus
} from 'lucide-react'
import { formatCurrency } from '@/lib/format'
import CRMActivityFeed from '@/components/crm/CRMActivityFeed'
import CRMTaskSection from '@/components/crm/CRMTaskSection'
import CRMTeamSection from '@/components/crm/CRMTeamSection'
import CRMQuoteSection from '@/components/crm/CRMQuoteSection'
import LogActivityModal from '@/components/crm/LogActivityModal'

// Types
interface ProjectData {
    id: string
    title: string
    projectCode: string
    description: string
    expectedValue: number
    currency: string
    status: string
    probability: number
    startDate: string
    targetDate: string

    customer: { id: string, name: string }
    partner?: { id: string, name: string }
    salesRep?: { id: string, name: string }
    stage: { id: string, name: string, color: string }
    pipeline: { stages: { id: string, name: string }[] }

    members: { id: string, userId: string, role: string, user: { name: string } }[]
    activities: any[]
    quotes: any[]
    tasks: any[]
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [project, setProject] = useState<ProjectData | null>(null)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('overview')
    const [showActivityModal, setShowActivityModal] = useState(false)

    useEffect(() => {
        fetchProject()
    }, [id])

    async function fetchProject() {
        try {
            const res = await fetch(`/api/crm/projects/${id}`)
            if (res.ok) {
                const data = await res.json()
                setProject(data)
            } else {
                console.error('Project not found')
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    async function updateStage(stageId: string) {
        try {
            const res = await fetch(`/api/crm/projects/${id}/move`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stageId })
            })
            if (res.ok) fetchProject()
        } catch (error) {
            console.error('Failed to update stage')
        }
    }

    if (loading) return <div className="p-8">Loading Project...</div>
    if (!project) return <div className="p-8">Project not found</div>

    const tabs = [
        { id: 'overview', label: 'Overview', icon: FileText },
        { id: 'activity', label: 'Activity', icon: Clock },
        { id: 'tasks', label: 'Tasks', icon: CheckSquare },
        { id: 'quotes', label: 'Quotes', icon: DollarSign },
        { id: 'team', label: 'Team', icon: Users },
    ]

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <LogActivityModal
                isOpen={showActivityModal}
                onClose={() => setShowActivityModal(false)}
                projectId={project.id}
                onSuccess={fetchProject}
            />

            {/* Header / Cockpit Top */}
            <div className="bg-white border-b border-gray-200 px-8 py-6 shadow-sm">
                <div className="flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium text-gray-500">{project.projectCode}</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${project.status === 'WON' ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-700'}`}>
                                {project.status}
                            </span>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900">{project.title}</h1>
                        <div className="flex items-center gap-4 mt-2 text-gray-600">
                            <span className="flex items-center text-sm">
                                <User className="w-4 h-4 mr-1" />
                                {project.customer.name}
                            </span>
                            {project.partner && (
                                <span className="flex items-center text-sm px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full border border-purple-100">
                                    <Users className="w-4 h-4 mr-1" />
                                    Partner: {project.partner.name}
                                </span>
                            )}
                            {project.salesRep && (
                                <span className="flex items-center text-sm px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full border border-blue-100">
                                    <User className="w-4 h-4 mr-1" />
                                    Rep: {project.salesRep.name}
                                </span>
                            )}
                            <span className="flex items-center text-sm">
                                <DollarSign className="w-4 h-4 mr-1" />
                                {formatCurrency(project.expectedValue, project.currency)}
                            </span>
                            <span className="flex items-center text-sm">
                                <Calendar className="w-4 h-4 mr-1" />
                                Target: {project.targetDate ? new Date(project.targetDate).toLocaleDateString() : 'N/A'}
                            </span>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">
                            Edit Project
                        </button>
                        <button
                            onClick={() => router.push(`/dashboard/crm/projects/${project.id}/quotes/new`)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm text-sm font-medium hover:bg-blue-700"
                        >
                            New Quote
                        </button>
                    </div>
                </div>

                {/* Pipeline Progress Bar */}
                <div className="mt-8">
                    <div className="flex items-center w-full">
                        {project.pipeline.stages.map((stage, idx) => {
                            // Determine status
                            const currentStageIndex = project.pipeline.stages.findIndex(s => s.id === project.stage.id);
                            const isCompleted = idx <= currentStageIndex;
                            const isCurrent = idx === currentStageIndex;

                            return (
                                <div key={stage.id} className="flex-1 relative group">
                                    <div className="flex items-center">
                                        {/* Bar */}
                                        <div
                                            className={`h-2 w-full transition-colors ${isCompleted ? 'bg-blue-500' : 'bg-gray-200'
                                                } ${idx === 0 ? 'rounded-l-full' : ''} ${idx === project.pipeline.stages.length - 1 ? 'rounded-r-full' : ''}`}
                                        />
                                        {/* Divider (white space) */}
                                        {idx < project.pipeline.stages.length - 1 && (
                                            <div className="w-1 h-2 bg-white z-10" />
                                        )}
                                    </div>

                                    {/* Label Button */}
                                    <button
                                        onClick={() => updateStage(stage.id)}
                                        className={`absolute top-4 left-0 w-full text-center text-xs font-semibold transition-colors ${isCurrent ? 'text-blue-600' : isCompleted ? 'text-gray-900' : 'text-gray-400'
                                            } hover:text-blue-500`}
                                    >
                                        {stage.name}
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden pt-8">
                {/* Sidebar / Tabs */}
                <div className="w-64 bg-white border-r border-gray-200 flex-shrink-0">
                    <nav className="p-4 space-y-1">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === tab.id
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                    }`}
                            >
                                <tab.icon className={`mr-3 h-5 w-5 ${activeTab === tab.id ? 'text-blue-500' : 'text-gray-400'}`} />
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Tab Panels */}
                <div className="flex-1 overflow-y-auto p-8">
                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-3 gap-6">
                            <div className="col-span-2 space-y-6">
                                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                                    <h3 className="text-lg font-medium text-gray-900 mb-4">Description</h3>
                                    <p className="text-gray-600 whitespace-pre-wrap">{project.description || 'No description provided.'}</p>
                                </div>

                                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                                    <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
                                    <CRMActivityFeed activities={project.activities.slice(0, 3)} />
                                    <button
                                        onClick={() => setActiveTab('activity')}
                                        className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
                                    >
                                        View all history &rarr;
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">Team</h3>
                                    <div className="space-y-3">
                                        {project.members.map(member => (
                                            <div key={member.id} className="flex items-center">
                                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                                                    {member.user.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="ml-3">
                                                    <p className="text-sm font-medium text-gray-900">{member.user.name}</p>
                                                    <p className="text-xs text-gray-500">{member.role}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => setActiveTab('team')}
                                        className="mt-4 w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Manage Team
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'activity' && (
                        <div className="max-w-3xl">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-gray-900">Activity Timeline</h2>
                                <button
                                    onClick={() => setShowActivityModal(true)}
                                    className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                                >
                                    Log Activity
                                </button>
                            </div>
                            <CRMActivityFeed activities={project.activities} />
                        </div>
                    )}

                    {activeTab === 'tasks' && (
                        <CRMTaskSection
                            projectId={project.id}
                            tasks={project.tasks}
                            members={project.members}
                            onUpdate={fetchProject}
                        />
                    )}

                    {activeTab === 'quotes' && (
                        <CRMQuoteSection projectId={project.id} quotes={project.quotes} />
                    )}

                    {activeTab === 'team' && (
                        <CRMTeamSection
                            projectId={project.id}
                            members={project.members}
                            onUpdate={fetchProject}
                        />
                    )}
                </div>
            </div>
        </div>
    )
}
