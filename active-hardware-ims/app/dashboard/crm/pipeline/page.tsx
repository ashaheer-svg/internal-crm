'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, LayoutTemplate, List, BarChart3, Users, User, History } from 'lucide-react'
import ListView from './ListView'
import { formatCurrency } from '@/lib/format'
import CreateCustomerButton from '@/components/CreateCustomerButton'

import DashboardTasks from '@/components/crm/DashboardTasks'

// Types
interface PipelineData {
    id: string
    name: string
    stages: Stage[]
}

interface Stage {
    id: string
    name: string
    color: string | null
    projects: Project[]
}

interface Project {
    id: string
    title: string
    expectedValue: number
    currency: string
    customer: { name: string }
    status: string
}

export default function KanbanPage() {
    const [pipeline, setPipeline] = useState<PipelineData | null>(null)
    const [loading, setLoading] = useState(true)
    const [viewMode, setViewMode] = useState<'BOARD' | 'LIST'>('BOARD') // View Toggle State
    const [canViewAll, setCanViewAll] = useState(false)  // from API: has projects:view_all permission
    const [scope, setScope] = useState<'all' | 'mine'>('all') // scope toggle
    const router = useRouter()

    // Drag and Drop State
    const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null)

    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (viewMode === 'BOARD') {
            fetchPipeline()
        } else {
            setLoading(false) // ListView fetches its own data
        }
    }, [viewMode, scope])

    async function fetchPipeline() {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch(`/api/crm/pipeline?scope=${scope}`)
            const data = await res.json()

            if (res.ok) {
                setPipeline(data)
                if (typeof data.canViewAll === 'boolean') setCanViewAll(data.canViewAll)
            } else {
                setError(data.error || 'Failed to load pipeline')
            }
        } catch (error) {
            console.error('Failed to load pipeline:', error)
            setError('Network error. More details in console.')
        } finally {
            setLoading(false)
        }
    }

    // Handlers
    const handleDragStart = (e: React.DragEvent, projectId: string) => {
        setDraggedProjectId(projectId)
        e.dataTransfer.effectAllowed = 'move'
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
    }

    const handleDrop = async (e: React.DragEvent, targetStageId: string) => {
        e.preventDefault()
        if (!draggedProjectId || !pipeline) return

        // 1. Find the project and source stage
        let sourceStageId = ''
        let projectToMove: Project | undefined

        pipeline.stages.forEach(stage => {
            const found = stage.projects.find(p => p.id === draggedProjectId)
            if (found) {
                sourceStageId = stage.id
                projectToMove = found
            }
        })

        if (!projectToMove || sourceStageId === targetStageId) {
            setDraggedProjectId(null)
            return
        }

        // 2. Optimistic Update
        const newStages = pipeline.stages.map(stage => {
            if (stage.id === sourceStageId) {
                return { ...stage, projects: stage.projects.filter(p => p.id !== draggedProjectId) }
            }
            if (stage.id === targetStageId) {
                return { ...stage, projects: [...stage.projects, { ...projectToMove!, status: 'MOVED' }] }
            }
            return stage
        })

        setPipeline({ ...pipeline, stages: newStages })
        setDraggedProjectId(null)

        // 3. API Call
        try {
            const res = await fetch(`/api/crm/projects/${draggedProjectId}/move`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stageId: targetStageId })
            })

            if (!res.ok) {
                throw new Error('Failed to update stage')
            }

            // Optionally refetch to ensure consistency
            fetchPipeline()

        } catch (error) {
            console.error(error)
            alert('Failed to move project. Reverting...')
            fetchPipeline() // Revert to server state
        }
    }

    // Render Board View
    const renderBoard = () => {
        if (loading) return <div className="p-8">Loading CRM...</div>
        if (error) return (
            <div className="p-8 text-center">
                <div className="bg-red-50 text-red-700 p-4 rounded-md inline-block">
                    <h3 className="font-bold">Error Loading CRM</h3>
                    <p>{error}</p>
                </div>
            </div>
        )
        if (!pipeline) return <div className="p-8">No pipeline found. Please seed the CRM.</div>

        return (
            <div className="flex-1 overflow-x-auto p-6 bg-gray-50">
                <div className="flex space-x-6">
                    {pipeline.stages?.map((stage) => (
                        <div
                            key={stage.id}
                            className="w-56 flex-shrink-0 flex flex-col bg-gray-100 rounded-lg"
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, stage.id)}
                        >
                            {/* Stage Header */}
                            <div className={`px-4 py-3 font-semibold text-sm uppercase tracking-wider border-b border-gray-200 flex justify-between items-center ${stage.color || 'bg-gray-200'}`}>
                                <span>{stage.name}</span>
                                <span className="bg-white/50 px-2 py-0.5 rounded text-xs">
                                    {stage.projects.length}
                                </span>
                            </div>

                            {/* Projects List */}
                            <div className="p-3 space-y-3 max-h-[1000px] overflow-y-auto custom-scrollbar">
                                {stage.projects.map((project) => (
                                    <div
                                        key={project.id}
                                        className="bg-white p-4 rounded-md shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer active:cursor-grabbing"
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, project.id)}
                                        onClick={() => router.push(`/dashboard/crm/projects/${project.id}`)}
                                    >
                                        <h3 className="font-medium text-gray-900 truncate">{project.title}</h3>
                                        <p className="text-sm text-gray-500 mt-1 truncate">{project.customer?.name || 'Unknown Customer'}</p>
                                        <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                                            <span className="font-semibold text-gray-700">
                                                {formatCurrency(project.expectedValue, project.currency)}
                                            </span>
                                            <span className={`px-1.5 py-0.5 rounded ${project.status === 'WON' ? 'bg-green-100 text-green-700' :
                                                project.status === 'LOST' ? 'bg-red-100 text-red-700' :
                                                    'bg-gray-100'
                                                }`}>
                                                {project.status || 'OPEN'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                {stage.projects.length === 0 && (
                                    <div className="text-center py-8 text-gray-400 text-sm">
                                        Drop here
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-3 border-b bg-white shadow-sm">
                {/* Left: title + view controls */}
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                        {pipeline ? pipeline.name : 'CRM Pipeline'}
                    </h1>

                    {/* View Toggle */}
                    <div className="flex bg-gray-100 rounded-lg p-0.5 border border-gray-200">
                        <button
                            onClick={() => setViewMode('BOARD')}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === 'BOARD' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <LayoutTemplate className="w-3.5 h-3.5" />
                            Board
                        </button>
                        <button
                            onClick={() => setViewMode('LIST')}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === 'LIST' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <List className="w-3.5 h-3.5" />
                            List
                        </button>
                    </div>

                    {/* Scope Toggle — only for users with projects:view_all permission */}
                    {canViewAll && (
                        <div className="flex bg-gray-100 rounded-lg p-0.5 border border-gray-200">
                            <button
                                onClick={() => setScope('all')}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${scope === 'all' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <Users className="w-3.5 h-3.5" />
                                All
                            </button>
                            <button
                                onClick={() => setScope('mine')}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${scope === 'mine' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <User className="w-3.5 h-3.5" />
                                Mine
                            </button>
                        </div>
                    )}
                </div>

                {/* Right: action buttons */}
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push(`/dashboard/crm/reports?scope=${scope}`)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                        >
                            <BarChart3 className="w-4 h-4" />
                            Reports
                        </button>
                        <button
                            onClick={() => router.push(`/dashboard/crm/reports?scope=${scope}&range=history`)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                        >
                            <History className="w-4 h-4" />
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



            {/* Main Content */}
            <div className="flex-1 flex flex-col">
                <DashboardTasks />
                {viewMode === 'BOARD' ? renderBoard() : (
                    <div className="flex-1 p-6">
                        <ListView scope={scope} onCanViewAllLoaded={setCanViewAll} />
                    </div>
                )}
            </div>
        </div>
    )
}
