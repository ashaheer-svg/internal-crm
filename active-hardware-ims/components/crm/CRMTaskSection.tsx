import { useState, useEffect } from 'react'
import { Calendar, CheckCircle, User, Users, FileText, ExternalLink } from 'lucide-react'

interface Task {
    id: string
    title: string
    status: 'TODO' | 'DONE'
    dueDate: string | null
    assignedTo: { name: string } | null
    assignedToRole: { name: string } | null
    attachmentUrl?: string | null
}

interface Member {
    userId: string
    user: { name: string }
}

interface TaskSectionProps {
    projectId: string
    tasks: Task[]
    members: Member[]
    onUpdate: () => void
}

export default function CRMTaskSection({ projectId, tasks, members, onUpdate }: TaskSectionProps) {
    const [title, setTitle] = useState('')
    const [assignedToId, setAssignedToId] = useState('')
    const [assignedToRoleId, setAssignedToRoleId] = useState('')
    const [dueDate, setDueDate] = useState('')

    const [recipients, setRecipients] = useState<{ users: any[], roles: any[] }>({ users: [], roles: [] })
    const [loadingRecipients, setLoadingRecipients] = useState(true)

    useEffect(() => {
        const fetchRecipients = async () => {
            try {
                const res = await fetch('/api/messaging/recipients')
                if (res.ok) {
                    const data = await res.json()
                    setRecipients(data)
                }
            } catch (error) {
                console.error('Failed to fetch recipients', error)
            } finally {
                setLoadingRecipients(false)
            }
        }
        fetchRecipients()
    }, [])

    async function addTask(e: React.FormEvent) {
        e.preventDefault()
        if (!title) return

        try {
            const res = await fetch('/api/crm/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId,
                    title,
                    assignedToId: assignedToId || null,
                    assignedToRoleId: assignedToRoleId || null,
                    dueDate: dueDate || null,
                    priority: 'MEDIUM'
                })
            })
            if (res.ok) {
                setTitle('')
                setAssignedToId('')
                setAssignedToRoleId('')
                setDueDate('')
                onUpdate()
            }
        } catch (error) {
            console.error(error)
        }
    }

    async function toggleTask(taskId: string, currentStatus: string) {
        const newStatus = currentStatus === 'DONE' ? 'TODO' : 'DONE'
        try {
            const res = await fetch('/api/crm/tasks', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: taskId, status: newStatus })
            })
            if (res.ok) onUpdate()
        } catch (error) {
            console.error(error)
        }
    }

    return (
        <div className="space-y-6 max-w-4xl">
            {/* Add Task Form */}
            <form onSubmit={addTask} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex gap-4 items-end">
                <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Task Title</label>
                    <input
                        type="text"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        className="w-full border-gray-300 rounded-md shadow-sm text-sm"
                        placeholder="e.g. Prepare Technical Specs"
                        required
                    />
                </div>
                <div className="w-48">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Assign To</label>
                    <select
                        value={assignedToId ? `user:${assignedToId}` : assignedToRoleId ? `role:${assignedToRoleId}` : ''}
                        onChange={e => {
                            const val = e.target.value
                            if (val.startsWith('user:')) {
                                setAssignedToId(val.replace('user:', ''))
                                setAssignedToRoleId('')
                            } else if (val.startsWith('role:')) {
                                setAssignedToRoleId(val.replace('role:', ''))
                                setAssignedToId('')
                            } else {
                                setAssignedToId('')
                                setAssignedToRoleId('')
                            }
                        }}
                        className="w-full border-gray-300 rounded-md shadow-sm text-sm"
                        disabled={loadingRecipients}
                    >
                        <option value="">Unassigned</option>
                        <optgroup label="Categories">
                            {recipients.roles.map((r) => (
                                <option key={r.id} value={`role:${r.id}`}>{r.name}</option>
                            ))}
                        </optgroup>
                        <optgroup label="Users">
                            {recipients.users.map((u) => (
                                <option key={u.id} value={`user:${u.id}`}>{u.name}</option>
                            ))}
                        </optgroup>
                    </select>
                </div>
                <div className="w-40">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Due Date</label>
                    <input
                        type="date"
                        value={dueDate}
                        onChange={e => setDueDate(e.target.value)}
                        className="w-full border-gray-300 rounded-md shadow-sm text-sm"
                    />
                </div>
                <button type="submit" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm">
                    Add
                </button>
            </form>

            {/* Task List */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                {tasks.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No tasks found.</div>
                ) : (
                    <ul className="divide-y divide-gray-200">
                        {tasks.map((task) => (
                            <li key={task.id} className="p-4 hover:bg-gray-50 flex items-center justify-between group">
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => toggleTask(task.id, task.status)}
                                        className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${task.status === 'DONE'
                                            ? 'bg-green-500 border-green-500 text-white'
                                            : 'border-gray-300 text-transparent hover:border-blue-500'
                                            }`}
                                    >
                                        <CheckCircle className="w-3.5 h-3.5" />
                                    </button>
                                    <div>
                                        <p className={`text-sm font-medium ${task.status === 'DONE' ? 'text-gray-400 line-through' : 'text-gray-900'
                                            }`}>
                                            {task.title}
                                        </p>
                                        <div className="flex items-center gap-3 mt-1">
                                            {task.dueDate && (
                                                <span className={`text-xs flex items-center ${new Date(task.dueDate) < new Date() && task.status !== 'DONE'
                                                    ? 'text-red-500 font-medium'
                                                    : 'text-gray-500'
                                                    }`}>
                                                    <Calendar className="w-3 h-3 mr-1" />
                                                    {new Date(task.dueDate).toLocaleDateString()}
                                                </span>
                                            )}
                                            {task.assignedTo && (
                                                <span className="text-xs text-gray-500 flex items-center">
                                                    <User className="w-3 h-3 mr-1" />
                                                    {task.assignedTo.name}
                                                </span>
                                            )}
                                            {task.assignedToRole && (
                                                <span className="text-xs text-blue-600 font-medium flex items-center bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                                                    <Users className="w-3 h-3 mr-1" />
                                                    {task.assignedToRole.name}
                                                </span>
                                            )}
                                            {task.attachmentUrl && (
                                                <a
                                                    href={task.attachmentUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs text-blue-600 font-bold flex items-center gap-1 hover:underline ml-2 px-2 py-0.5 bg-blue-50 rounded border border-blue-200"
                                                    title="View Attached Quote PDF"
                                                >
                                                    <FileText className="w-3 h-3" />
                                                    View Quote PDF
                                                    <ExternalLink className="w-2.5 h-2.5 opacity-50" />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    )
}
