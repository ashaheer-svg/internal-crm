'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'

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
    const router = useRouter()

    // Drag and Drop State
    const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null)

    useEffect(() => {
        fetchPipeline()
    }, [])

    async function fetchPipeline() {
        try {
            const res = await fetch('/api/crm/pipeline')
            if (res.ok) {
                const data = await res.json()
                setPipeline(data)
            }
        } catch (error) {
            console.error('Failed to load pipeline:', error)
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

    if (loading) return <div className="p-8">Loading CRM...</div>

    if (!pipeline) return <div className="p-8">No pipeline found. Please seed the CRM.</div>

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-white">
                <h1 className="text-2xl font-bold">{pipeline.name}</h1>
                <button
                    onClick={() => router.push('/dashboard/crm/projects/new')}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    New Project
                </button>
            </div>

            {/* Kanban Board */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 bg-gray-50">
                <div className="flex h-full space-x-6">
                    {pipeline.stages.map((stage) => (
                        <div
                            key={stage.id}
                            className="w-80 flex-shrink-0 flex flex-col bg-gray-100 rounded-lg max-h-full"
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
                            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                                {stage.projects.map((project) => (
                                    <div
                                        key={project.id}
                                        className="bg-white p-4 rounded-md shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer active:cursor-grabbing"
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, project.id)}
                                        onClick={() => router.push(`/dashboard/crm/projects/${project.id}`)}
                                    >
                                        <h3 className="font-medium text-gray-900 truncate">{project.title}</h3>
                                        <p className="text-sm text-gray-500 mt-1 truncate">{project.customer.name}</p>
                                        <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                                            <span className="font-semibold text-gray-700">
                                                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: project.currency }).format(project.expectedValue)}
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
        </div>
    )
}
