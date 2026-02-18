'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronRight, AlertCircle, Calendar, CheckCircle2 } from 'lucide-react'

interface Task {
    id: string
    title: string
    description: string
    dueDate: string | null
    priority: string
    project: {
        id: string
        title: string
        customer: { name: string }
    }
}

export default function DashboardTasks() {
    const [isOpen, setIsOpen] = useState(true)
    const [tasks, setTasks] = useState<{ overdue: Task[], today: Task[] }>({ overdue: [], today: [] })
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    useEffect(() => {
        fetchTasks()
    }, [])

    const fetchTasks = async () => {
        try {
            const res = await fetch('/api/crm/tasks/mine')
            if (res.ok) {
                const data = await res.json()
                setTasks(data)
            }
        } catch (error) {
            console.error('Failed to fetch tasks', error)
        } finally {
            setLoading(false)
        }
    }

    const totalCount = tasks.overdue.length + tasks.today.length

    if (!loading && totalCount === 0) return null

    return (
        <div className="border-b border-gray-200 bg-white">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors"
            >
                <div className="flex items-center gap-2 font-medium text-gray-700">
                    {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    <span>My Tasks</span>
                    {loading ? (
                        <span className="text-xs text-gray-400 ml-2">Loading...</span>
                    ) : (
                        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                            {totalCount}
                        </span>
                    )}
                </div>
            </button>

            {isOpen && !loading && (
                <div className="px-6 pb-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Overdue Tasks */}
                    {tasks.overdue.length > 0 && (
                        <div className="space-y-3">
                            <h4 className="text-sm font-semibold text-red-600 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                Overdue ({tasks.overdue.length})
                            </h4>
                            <div className="space-y-2">
                                {tasks.overdue.map(task => (
                                    <div
                                        key={task.id}
                                        onClick={() => router.push(`/dashboard/crm/projects/${task.project.id}`)}
                                        className="p-3 bg-red-50 border border-red-100 rounded-lg cursor-pointer hover:shadow-sm transition-shadow group"
                                    >
                                        <div className="flex justify-between items-start">
                                            <h5 className="text-sm font-medium text-gray-900 group-hover:text-blue-600">
                                                {task.title}
                                            </h5>
                                            <span className="text-xs text-red-600 font-medium">
                                                {new Date(task.dueDate!).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                                            {task.project.customer.name} - {task.project.title}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Today's Tasks */}
                    {tasks.today.length > 0 && (
                        <div className="space-y-3">
                            <h4 className="text-sm font-semibold text-blue-600 flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                Due Today ({tasks.today.length})
                            </h4>
                            <div className="space-y-2">
                                {tasks.today.map(task => (
                                    <div
                                        key={task.id}
                                        onClick={() => router.push(`/dashboard/crm/projects/${task.project.id}`)}
                                        className="p-3 bg-blue-50 border border-blue-100 rounded-lg cursor-pointer hover:shadow-sm transition-shadow group"
                                    >
                                        <div className="flex justify-between items-start">
                                            <h5 className="text-sm font-medium text-gray-900 group-hover:text-blue-600">
                                                {task.title}
                                            </h5>
                                            <span className="text-xs text-blue-600 font-medium">Today</span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                                            {task.project.customer.name} - {task.project.title}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {tasks.overdue.length === 0 && tasks.today.length === 0 && (
                        <div className="col-span-2 text-center py-8 text-gray-400 text-sm flex flex-col items-center">
                            <CheckCircle2 className="w-8 h-8 mb-2 text-green-500" />
                            All caught up! No urgent tasks.
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
