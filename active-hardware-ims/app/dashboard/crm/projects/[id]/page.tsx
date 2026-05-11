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
    Plus,
    CheckCircle,
    Truck,
    AlertCircle,
    Tag
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'
import CRMActivityFeed from '@/components/crm/CRMActivityFeed'
import CRMTaskSection from '@/components/crm/CRMTaskSection'
import CRMTeamSection from '@/components/crm/CRMTeamSection'
import CRMQuoteSection from '@/components/crm/CRMQuoteSection'
import LogActivityModal from '@/components/crm/LogActivityModal'
import EditProjectModal from '@/components/crm/EditProjectModal'
import BackButton from '@/components/BackButton'

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
    expectedCloseDate?: string

    customer: { id: string, name: string }
    partner?: { id: string, name: string }
    salesRep?: { id: string, name: string }
    brand?: string
    stage: { id: string, name: string, color: string }
    pipeline: { stages: { id: string, name: string }[] }

    members: { id: string, userId: string, role: string, user: { name: string } }[]
    activities: any[]
    quotes: any[]
    tasks: any[]
    estimatedGP?: number
    estimatedMargin?: number
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [project, setProject] = useState<ProjectData | null>(null)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('overview')
    const [showActivityModal, setShowActivityModal] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)

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

            <EditProjectModal
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
                project={project}
                onSuccess={fetchProject}
            />

            {/* Header / Cockpit Top */}
            <div className="bg-white border-b border-gray-200 px-8 py-8 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <BackButton />
                            <div className="h-4 w-px bg-gray-200 mx-1" />
                            <span className="text-sm font-bold tracking-wider text-gray-400 font-mono">{project.projectCode}</span>
                            <span className={cn(
                                "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border",
                                project.status === 'WON' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' :
                                    project.status === 'LOST' ? 'bg-red-50 border-red-100 text-red-700' :
                                        'bg-blue-50 border-blue-100 text-blue-700'
                            )}>
                                {project.status}
                            </span>
                        </div>

                        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight leading-tight">
                            {project.title}
                        </h1>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setShowEditModal(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                        >
                            Edit Project
                        </button>
                        <button
                            onClick={() => router.push(`/dashboard/crm/projects/${project.id}/quotes/new/hardware`)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-sm font-medium text-white hover:bg-emerald-700 transition-colors shadow-sm"
                        >
                            <Plus className="w-4 h-4" />
                            Hardware Quote
                        </button>
                        <button
                            onClick={() => router.push(`/dashboard/crm/projects/${project.id}/quotes/new/service`)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            <Plus className="w-4 h-4" />
                            Service Quote
                        </button>
                    </div>
                </div>

                {/* Full Width Metadata Badges */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 items-stretch gap-4">
                    {/* Customer Pillar */}
                    <div className="flex items-center bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 shadow-sm min-w-0">
                        <div className="p-1.5 bg-white rounded-lg shadow-sm mr-3 flex-shrink-0">
                            <Users className="w-4 h-4 text-gray-400" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1.5">Customer</p>
                            <p className="text-xs font-black text-gray-900 leading-tight truncate" title={project.customer.name}>{project.customer.name}</p>
                        </div>
                    </div>

                    {/* Brand Pillar */}
                    {project.brand && (
                        <div className="flex items-center bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 shadow-sm min-w-0">
                            <div className="p-1.5 bg-white rounded-lg shadow-sm mr-3 flex-shrink-0">
                                <Tag className="w-4 h-4 text-blue-500" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1.5">Brand</p>
                                <p className="text-xs font-black text-gray-900 leading-none truncate">{project.brand}</p>
                            </div>
                        </div>
                    )}

                    {/* Partner Pillar */}
                    {project.partner && (
                        <div className="flex items-center bg-purple-50/50 border border-purple-100 rounded-xl px-4 py-3 shadow-sm min-w-0">
                            <div className="p-1.5 bg-white rounded-lg shadow-sm mr-3 flex-shrink-0">
                                <Users className="w-4 h-4 text-purple-600" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest leading-none mb-1.5">Partner</p>
                                <p className="text-xs font-black text-purple-700 leading-tight truncate" title={project.partner.name}>{project.partner.name}</p>
                            </div>
                        </div>
                    )}

                    {/* Sales Rep Pillar */}
                    {project.salesRep && (
                        <div className="flex items-center bg-blue-50/50 border border-blue-100 rounded-xl px-4 py-3 shadow-sm min-w-0">
                            <div className="p-1.5 bg-white rounded-lg shadow-sm mr-3 flex-shrink-0">
                                <User className="w-4 h-4 text-blue-600" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest leading-none mb-1.5">Owner</p>
                                <p className="text-xs font-black text-blue-700 leading-none truncate">{project.salesRep.name}</p>
                            </div>
                        </div>
                    )}

                    {/* Expected Value */}
                    <div className="flex items-center bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 shadow-sm min-w-0">
                        <div className="p-1.5 bg-white rounded-lg shadow-sm mr-3 flex-shrink-0">
                            <DollarSign className="w-4 h-4 text-emerald-500" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1.5">Expected Value</p>
                            <p className="text-xs font-black text-gray-900 leading-none truncate">{formatCurrency(project.expectedValue, project.currency)}</p>
                        </div>
                    </div>

                    {/* Target Date */}
                    <div className="flex items-center bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 shadow-sm min-w-0">
                        <div className="p-1.5 bg-white rounded-lg shadow-sm mr-3 flex-shrink-0">
                            <Calendar className="w-4 h-4 text-amber-500" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1.5">Target Date</p>
                            <p className="text-xs font-black text-gray-900 leading-none truncate">
                                {project.targetDate ? new Date(project.targetDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                            </p>
                        </div>
                    </div>

                    {/* GP Indicator */}
                    {project.estimatedGP !== undefined && (
                        <div className={cn(
                            "flex items-center rounded-xl px-4 py-3 shadow-sm border min-w-0",
                            project.estimatedGP >= 0 ? "bg-emerald-500 border-emerald-600" : "bg-red-500 border-red-600"
                        )}>
                            <div className="p-1.5 bg-white/20 rounded-lg mr-3 flex-shrink-0">
                                <DollarSign className="w-4 h-4 text-white" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest leading-none mb-1.5">Est. Profit</p>
                                <p className="text-xs font-black text-white leading-none truncate">
                                    {formatCurrency(project.estimatedGP, project.currency)}
                                    <span className="ml-1.5 text-[10px] font-bold opacity-80">({project.estimatedMargin?.toFixed(1)}%)</span>
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Pipeline Progress Indicator */}
                <div className="mt-10">
                    <div className="flex items-center justify-between gap-1">
                        {project.pipeline.stages.map((stage, idx) => {
                            const currentStageIndex = project.pipeline.stages.findIndex(s => s.id === project.stage.id);
                            const isCompleted = idx < currentStageIndex;
                            const isCurrent = idx === currentStageIndex;

                            return (
                                <button
                                    key={stage.id}
                                    onClick={() => updateStage(stage.id)}
                                    className="flex-1 group transition-all"
                                >
                                    <div className="relative mb-2">
                                        <div className={cn(
                                            "h-1.5 w-full rounded-full transition-all duration-300",
                                            isCurrent ? "bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.4)]" :
                                                isCompleted ? "bg-blue-200" : "bg-gray-100 group-hover:bg-gray-200"
                                        )} />
                                    </div>
                                    <span className={cn(
                                        "block text-[10px] font-black uppercase tracking-widest transition-colors",
                                        isCurrent ? "text-blue-600" :
                                            isCompleted ? "text-gray-900" : "text-gray-400 group-hover:text-gray-600"
                                    )}>
                                        {stage.name}
                                    </span>
                                </button>
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
                                {/* Approval Context Card */}
                                {project.quotes.find(q => q.status === 'ACCEPTED') && (
                                    <div className="bg-white border border-emerald-100 rounded-2xl overflow-hidden shadow-sm">
                                        <div className="bg-emerald-50/50 px-6 py-4 border-b border-emerald-100 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 bg-emerald-500 rounded-lg">
                                                    <CheckCircle className="w-4 h-4 text-white" />
                                                </div>
                                                <h3 className="text-sm font-black text-emerald-900 uppercase tracking-widest">Quotation Approved</h3>
                                            </div>
                                            {project.quotes.find(q => q.status === 'ACCEPTED')?.urgency === 'URGENT' && (
                                                <span className="px-3 py-1 bg-red-100 text-red-700 text-[10px] font-black rounded-full flex items-center gap-1 animate-pulse border border-red-200 uppercase tracking-tighter">
                                                    <AlertCircle className="w-3 h-3" />
                                                    Urgent Fulfillment
                                                </span>
                                            )}
                                        </div>

                                        <div className="p-6">
                                            {(() => {
                                                const acceptedQuote = project.quotes.find(q => q.status === 'ACCEPTED');
                                                if (!acceptedQuote) return null;
                                                return (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                                        <div className="space-y-1">
                                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Purchase Order (PO)</p>
                                                            <p className="text-sm font-black text-gray-900">{acceptedQuote.poNumber || 'N/A'}</p>
                                                            {acceptedQuote.poDocumentUrl && (
                                                                <a href={acceptedQuote.poDocumentUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 mt-1 transition-colors">
                                                                    <FileText className="w-3 h-3" />
                                                                    VIEW DOCUMENT
                                                                </a>
                                                            )}
                                                        </div>
                                                        <div className="space-y-1">
                                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Expected Delivery</p>
                                                            <p className="text-sm font-black text-gray-900">
                                                                {acceptedQuote.expectedDeliveryDate ? new Date(acceptedQuote.expectedDeliveryDate).toLocaleDateString(undefined, { dateStyle: 'medium' }) : 'Not Specified'}
                                                            </p>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Delivery Order</p>
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-sm font-black text-gray-900">{acceptedQuote.deliveryOrder?.orderNumber || 'Pending'}</p>
                                                                <Truck className="w-4 h-4 text-emerald-500" />
                                                            </div>
                                                            {acceptedQuote.deliveryOrder && (
                                                                <p className={cn(
                                                                    "text-[10px] font-black uppercase tracking-tighter mt-0.5",
                                                                    (acceptedQuote.deliveryOrder.isActive === false || acceptedQuote.deliveryOrder.status === 'CANCELLED') ? "text-red-500" : "text-emerald-600"
                                                                )}>
                                                                    Status: {acceptedQuote.deliveryOrder.isActive === false ? 'DEACTIVATED' : acceptedQuote.deliveryOrder.status}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <div className="space-y-1">
                                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Quote Reference</p>
                                                            <p className="text-sm font-black text-gray-900">{acceptedQuote.quoteNumber}</p>
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                )}

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
                                        className="mt-4 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                                    >
                                        <Plus className="w-4 h-4" />
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
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm"
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
                        <CRMQuoteSection projectId={project.id} quotes={project.quotes} onUpdate={fetchProject} />
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
