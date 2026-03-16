"use client"

import { useState, useEffect, useCallback } from "react"
import {
    Mail,
    Send,
    Inbox,
    Search,
    Plus,
    Filter,
    Clock,
    CheckCircle2,
    AlertCircle,
    Paperclip,
    ArrowLeft,
    User,
    Users as UsersIcon,
    Calendar,
    ChevronRight,
    MessageSquare,
    ChevronUp,
    ChevronDown
} from "lucide-react"
import { formatDateTime, cn } from "@/lib/utils"
import SortIcon from "@/components/SortIcon"
import PaginationControls from "@/components/PaginationControls"

type Message = {
    id: string
    subject: string
    content: string
    category: string
    priority: string
    deadline: string | null
    isSystemGenerated: boolean
    createdAt: string
    sender: { name: string; email: string }
    recipientUser?: { name: string; email: string }
    recipientRole?: { name: string }
    attachments: Array<{
        id: string
        fileName: string
        filePath: string
        fileType: string
    }>
    receipts: Array<{
        userId: string
        viewedAt: string | null
        isDone: boolean
        doneAt: string | null
        comment: string | null
        user: { name: string }
    }>
}

export default function MessagingPage() {
    const [messages, setMessages] = useState<Message[]>([])
    const [meta, setMeta] = useState<any>({ total: 0, page: 1, limit: 10, totalPages: 0 })
    const [stats, setStats] = useState({ unreadCount: 0, urgentCount: 0, taskCount: 0 })
    const [loading, setLoading] = useState(true)
    const [tab, setTab] = useState<'inbox' | 'sent' | 'admin'>('inbox')
    const [searchQuery, setSearchQuery] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [categoryFilter, setCategoryFilter] = useState('ALL')
    const [isNewMessageModalOpen, setIsNewMessageModalOpen] = useState(false)
    const [currentUser, setCurrentUser] = useState<any>(null)
    const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null)
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
    const [sort, setSort] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' })

    // Resolution state
    const [resolutionComment, setResolutionComment] = useState('')
    const [submittingResolution, setSubmittingResolution] = useState(false)

    useEffect(() => {
        const fetchCurrentUser = async () => {
            const res = await fetch('/api/auth/me')
            if (res.ok) {
                const data = await res.json()
                setCurrentUser(data.user)
            }
        }
        fetchCurrentUser()
    }, [])

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchQuery), 500)
        return () => clearTimeout(timer)
    }, [searchQuery])

    const fetchMessages = useCallback(async (page: number = 1, isBackground: boolean = false) => {
        if (!isBackground) setLoading(true)
        try {
            const params = new URLSearchParams({
                type: tab,
                page: page.toString(),
                limit: '10',
                search: debouncedSearch,
                sortKey: sort.key,
                sortDir: sort.direction,
                category: categoryFilter
            })
            const res = await fetch(`/api/messaging?${params}`)
            if (res.ok) {
                const data = await res.json()
                setMessages(data.messages)
                setMeta(data.meta || { total: data.messages.length, page: 1, limit: 10, totalPages: 1 })
                if (data.stats) setStats(data.stats)
            }
        } catch (error) {
            console.error('Failed to fetch messages:', error)
        } finally {
            setLoading(false)
        }
    }, [tab, debouncedSearch, sort, categoryFilter])

    useEffect(() => {
        fetchMessages()
    }, [fetchMessages])

    useEffect(() => {
        const interval = setInterval(() => {
            fetchMessages(meta.page, true)
        }, 15000) // 15 seconds
        return () => clearInterval(interval)
    }, [fetchMessages, meta.page])

    const handleReadMessage = async (messageId: string) => {
        try {
            await fetch(`/api/messaging/${messageId}/receipt`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'read' })
            })
            setMessages(prev => prev.map(m => {
                if (m.id === messageId) {
                    return {
                        ...m,
                        receipts: m.receipts.map(r =>
                            r.userId === currentUser.id ? { ...r, viewedAt: new Date().toISOString() } : r
                        )
                    }
                }
                return m
            }))
            // Refetch stats from server to stay in sync across tabs
            fetchMessages(meta.page)
        } catch (error) {
            console.error('Failed to mark as read:', error)
        }
    }

    const handleMarkDone = async (messageId: string) => {
        if (!resolutionComment.trim()) {
            setNotification({ type: 'error', message: "Please provide a comment before marking as done." })
            return
        }

        setSubmittingResolution(true)
        try {
            const res = await fetch(`/api/messaging/${messageId}/receipt`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'done', comment: resolutionComment })
            })

            if (res.ok) {
                setResolutionComment('')
                setMessages(prev => prev.map(m => {
                    if (m.id === messageId) {
                        return {
                            ...m,
                            receipts: m.receipts.map(r =>
                                r.userId === currentUser.id
                                    ? { ...r, isDone: true, doneAt: new Date().toISOString(), comment: resolutionComment }
                                    : r
                            )
                        }
                    }
                    return m
                }))
                // Refetch stats from server to stay in sync across tabs
                fetchMessages(meta.page)
                setNotification({ type: 'success', message: "Task completed successfully!" })
                setTimeout(() => setNotification(null), 3000)
            }
        } catch (error) {
            console.error('Failed to mark as done:', error)
        } finally {
            setSubmittingResolution(false)
        }
    }

    const unreadCount = stats.unreadCount
    const urgentCount = stats.urgentCount
    const taskCount = stats.taskCount

    const toggleExpand = (id: string, isUnread: boolean) => {
        const newExpanded = new Set(expandedIds)
        if (newExpanded.has(id)) {
            newExpanded.delete(id)
        } else {
            newExpanded.add(id)
            if (isUnread) handleReadMessage(id)
        }
        setExpandedIds(newExpanded)
    }

    const handleSort = (key: string) => {
        setSort(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }))
    }

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'URGENT': return 'text-red-600 bg-red-50 border-red-100'
            case 'HIGH': return 'text-orange-600 bg-orange-50 border-orange-100'
            case 'MEDIUM': return 'text-blue-600 bg-blue-50 border-blue-100'
            case 'LOW': return 'text-gray-500 bg-gray-50 border-gray-100'
            default: return 'text-gray-500 bg-gray-50 border-gray-100'
        }
    }

    return (
        <div className="space-y-6 flex flex-col min-h-screen pb-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-200">
                        <Mail className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Communication Center</h1>
                        <p className="text-sm text-gray-500 font-medium">Manage team updates and critical tasks</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {notification && (
                        <div className={cn(
                            "px-4 py-2 rounded-xl text-sm font-bold shadow-sm animate-in fade-in slide-in-from-top-2",
                            notification.type === 'success' ? "bg-green-100 text-green-700 border border-green-200" : "bg-red-100 text-red-700 border border-red-200"
                        )}>
                            {notification.message}
                        </div>
                    )}
                    <button
                        onClick={() => setIsNewMessageModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95 text-sm font-bold"
                    >
                        <Plus className="w-4 h-4" /> New Message
                    </button>
                </div>
            </div>

            {/* Summary Bar */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Messages', count: meta.total, icon: Mail, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Unread', count: unreadCount, icon: Inbox, color: 'text-orange-600', bg: 'bg-orange-50' },
                    { label: 'Urgent', count: urgentCount, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
                    { label: 'Tasks', count: taskCount, icon: CheckCircle2, color: 'text-purple-600', bg: 'bg-purple-50' },
                ].map((stat, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3 transition-all hover:shadow-md">
                        <div className={cn("p-2.5 rounded-xl", stat.bg, stat.color)}>
                            <stat.icon className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">{stat.label}</p>
                            <p className="text-xl font-bold text-gray-900 leading-none">{stat.count}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                {/* Filters/Tabs Bar */}
                <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/30">
                    <div className="flex bg-gray-200 p-1 rounded-xl w-fit">
                        <button
                            onClick={() => setTab('inbox')}
                            className={cn("px-4 py-1.5 text-xs font-bold rounded-lg transition-all", tab === 'inbox' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700")}
                        >
                            Inbox
                        </button>
                        <button
                            onClick={() => setTab('sent')}
                            className={cn("px-4 py-1.5 text-xs font-bold rounded-lg transition-all", tab === 'sent' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700")}
                        >
                            Sent
                        </button>
                        {(currentUser?.role === 'ADMIN' || currentUser?.permissions?.includes('all:manage')) && (
                            <button
                                onClick={() => setTab('admin')}
                                className={cn("px-4 py-1.5 text-xs font-bold rounded-lg transition-all", tab === 'admin' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700")}
                            >
                                Admin Feed
                            </button>
                        )}
                    </div>

                    <div className="flex gap-1">
                        <SortIcon sort={sort} column="date" label="Date" onSort={handleSort} />
                        <SortIcon sort={sort} column="priority" label="Priority" onSort={handleSort} />
                        <SortIcon sort={sort} column="category" label="Type" onSort={handleSort} />
                    </div>

                    <div className="flex flex-col md:flex-row gap-3">
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="bg-white border-gray-200 rounded-xl text-xs font-bold px-3 py-1.5 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                        >
                            <option value="ALL">All Categories</option>
                            <option value="TASK">Tasks</option>
                            <option value="UPDATE">Updates</option>
                            <option value="ALERT">Alerts</option>
                            <option value="GENERAL">General</option>
                        </select>
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search conversations..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 pr-4 py-2 text-sm border-gray-200 rounded-xl focus:ring-blue-500 focus:border-blue-500 w-full md:w-64 shadow-sm"
                            />
                        </div>
                    </div>
                </div>

                {/* Full-width Expandable List */}
                <div className="divide-y divide-gray-100 min-h-[400px]">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center p-20 gap-3">
                            <Clock className="w-8 h-8 animate-spin text-blue-500" />
                            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Hydrating Inbox...</p>
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-20 text-center">
                            <div className="p-4 bg-gray-50 rounded-full mb-3">
                                <MessageSquare className="w-8 h-8 text-gray-300" />
                            </div>
                            <p className="text-gray-500 font-medium">No messages found in {tab} view</p>
                            <p className="text-xs text-gray-400 mt-1">Try adjusting your filters or search terms</p>
                        </div>
                    ) : (
                        messages.map((m: any) => {
                            const userReceipt = m.receipts.find((r: any) => r.userId === currentUser?.id)
                            const isUnread = tab === 'inbox' && !userReceipt?.viewedAt
                            const isDone = userReceipt?.isDone
                            const isExpanded = expandedIds.has(m.id)

                            return (
                                <div
                                    key={m.id}
                                    className={cn(
                                        "transition-all duration-200 border-l-4",
                                        isExpanded ? "bg-blue-50/30 border-blue-600" : (isUnread ? "bg-white border-blue-400" : "bg-white border-transparent hover:bg-gray-50")
                                    )}
                                >
                                    {/* Single Line Summary */}
                                    <div
                                        onClick={() => toggleExpand(m.id, isUnread)}
                                        className="p-4 flex items-center justify-between cursor-pointer group"
                                    >
                                        <div className="flex items-center gap-4 flex-1 min-w-0">
                                            <div className={cn(
                                                "w-2 h-2 rounded-full flex-shrink-0 transition-all",
                                                isUnread ? "bg-blue-600 scale-125 shadow-lg shadow-blue-200" : "bg-transparent"
                                            )} />

                                            <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4 flex-1 min-w-0">
                                                <div className="flex items-center gap-2 md:w-48 flex-shrink-0">
                                                    <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                                                        <User className="w-4 h-4 text-gray-500" />
                                                    </div>
                                                    <span className={cn("text-sm truncate", isUnread ? "font-bold text-gray-900" : "text-gray-600 font-medium")}>
                                                        {m.sender.name}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                    <span className={cn("text-xs font-bold px-1.5 py-0.5 rounded flex-shrink-0 uppercase tracking-tighter",
                                                        m.category === 'TASK' ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600")}>
                                                        {m.category}
                                                    </span>
                                                    <h3 className={cn("text-sm truncate pr-4 transition-colors",
                                                        isUnread ? "font-bold text-gray-900" : "text-gray-700",
                                                        !isExpanded && "group-hover:text-blue-600")}>
                                                        {m.subject}
                                                    </h3>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                                            <div className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold border", getPriorityColor(m.priority))}>
                                                {m.priority}
                                            </div>
                                            {isDone && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                                            <span className="text-[10px] text-gray-400 font-bold whitespace-nowrap uppercase tracking-tighter hidden sm:block">
                                                {formatDateTime(m.createdAt)}
                                            </span>
                                            <ChevronRight className={cn("w-4 h-4 text-gray-300 transition-transform duration-300", isExpanded && "rotate-90 text-blue-600")} />
                                        </div>
                                    </div>

                                    {/* Expanded Detail View */}
                                    {isExpanded && (
                                        <div className="px-12 pb-6 animate-in slide-in-from-top-2 duration-300">
                                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mt-2">
                                                <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap mb-8 leading-relaxed">
                                                    {m.content}
                                                </div>

                                                {m.attachments.length > 0 && (
                                                    <div className="mt-6 pt-6 border-t border-gray-50">
                                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center">
                                                            <Paperclip className="w-3.5 h-3.5 mr-2" />
                                                            Files & Attachments
                                                        </h4>
                                                        <div className="flex flex-wrap gap-3">
                                                            {m.attachments.map((att: any) => (
                                                                <a
                                                                    key={att.id}
                                                                    href={att.filePath}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="flex items-center p-3 bg-gray-50 border border-transparent rounded-xl hover:bg-white hover:border-blue-200 hover:shadow-sm transition-all group/file"
                                                                >
                                                                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600 group-hover/file:bg-blue-100">
                                                                        <Paperclip className="w-3.5 h-3.5" />
                                                                    </div>
                                                                    <div className="ml-3 overflow-hidden">
                                                                        <p className="text-xs font-bold text-gray-900 truncate max-w-[200px]">{att.fileName}</p>
                                                                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{att.fileType.split('/')[1] || 'FILE'}</p>
                                                                    </div>
                                                                </a>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Inline Resolution Tracking */}
                                                <div className="mt-8 pt-6 border-t border-gray-100">
                                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center">
                                                        <UsersIcon className="w-3.5 h-3.5 mr-2" />
                                                        Recipient Progress
                                                    </h4>
                                                    <div className="space-y-3">
                                                        {m.receipts.map((receipt: any) => (
                                                            <div key={receipt.userId} className="flex items-start gap-4 text-sm bg-gray-50/50 p-4 rounded-2xl border border-gray-100/50">
                                                                <div className="p-2 bg-white rounded-xl border border-gray-100 shadow-sm">
                                                                    <User className="w-4 h-4 text-gray-400" />
                                                                </div>
                                                                <div className="flex-1">
                                                                    <div className="flex justify-between items-center">
                                                                        <span className="font-bold text-gray-900">{receipt.user.name}</span>
                                                                        <div className="flex items-center gap-2">
                                                                            {receipt.viewedAt ? (
                                                                                <span className="text-[10px] text-green-600 font-bold uppercase tracking-tighter">
                                                                                    Seen {formatDateTime(receipt.viewedAt)}
                                                                                </span>
                                                                            ) : (
                                                                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter mb-1.5 ml-1">Unseen</span>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    {receipt.isDone ? (
                                                                        <div className="mt-2 p-3 bg-green-50 rounded-xl border border-green-100">
                                                                            <div className="flex items-center justify-between mb-1">
                                                                                <span className="text-[10px] font-bold text-green-700 uppercase">Resolved</span>
                                                                                <span className="text-[10px] text-green-600 font-medium">{formatDateTime(receipt.doneAt!)}</span>
                                                                            </div>
                                                                            <p className="text-sm text-green-800 font-medium italic">"{receipt.comment}"</p>
                                                                        </div>
                                                                    ) : (
                                                                        receipt.userId === currentUser?.id && (
                                                                            <div className="mt-3">
                                                                                <div className="relative">
                                                                                    <textarea
                                                                                        placeholder="Action taken / Resolution comment..."
                                                                                        value={resolutionComment}
                                                                                        onChange={(e) => setResolutionComment(e.target.value)}
                                                                                        className="w-full p-3 text-sm border-gray-200 rounded-xl focus:ring-blue-500 focus:border-blue-500 mb-2 shadow-inner bg-white"
                                                                                        rows={2}
                                                                                    />
                                                                                    <div className="absolute right-3 bottom-5">
                                                                                        <button
                                                                                            onClick={() => handleMarkDone(m.id)}
                                                                                            disabled={submittingResolution}
                                                                                            className="px-4 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg shadow-lg shadow-green-200 hover:bg-green-700 disabled:opacity-50 transition-all active:scale-95"
                                                                                        >
                                                                                            {submittingResolution ? 'Saving...' : 'Complete Task'}
                                                                                        </button>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        )
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })
                    )}
                </div>
                <PaginationControls
                    currentPage={meta.page}
                    totalPages={meta.totalPages}
                    onPageChange={(p) => fetchMessages(p)}
                    totalResults={meta.total}
                    limit={meta.limit}
                    className="bg-gray-50/50 border-t border-gray-100"
                />
            </div>

            {isNewMessageModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <NewMessageForm
                            onClose={() => setIsNewMessageModalOpen(false)}
                            onSuccess={() => {
                                setIsNewMessageModalOpen(false)
                                fetchMessages()
                                setNotification({ type: 'success', message: 'Message successfully dispatched!' })
                                setTimeout(() => setNotification(null), 3000)
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    )
}

function NewMessageForm({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
    const [users, setUsers] = useState<any[]>([])
    const [roles, setRoles] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)

    // Form state
    const [recipientType, setRecipientType] = useState<'USER' | 'ROLE'>('USER')
    const [recipientId, setRecipientId] = useState('')
    const [subject, setSubject] = useState('')
    const [category, setCategory] = useState('TASK')
    const [priority, setPriority] = useState('MEDIUM')
    const [deadline, setDeadline] = useState('')
    const [content, setContent] = useState('')
    const [files, setFiles] = useState<File[]>([])
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchData = async () => {
            const res = await fetch('/api/messaging/recipients')
            if (res.ok) {
                const data = await res.json()
                setUsers(data.users || [])
                setRoles(data.roles || [])
            }
            setLoading(false)
        }
        fetchData()
    }, [])

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files)
            const oversized = newFiles.some(f => f.size > 10 * 1024 * 1024)
            if (oversized) {
                setError("One or more files exceed the 10MB limit.")
                return
            }
            setError(null)
            setFiles(prev => [...prev, ...newFiles])
        }
    }

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        if (!recipientId || !subject || !content) {
            setError("Please fill in recipient, subject and content.")
            return
        }

        setSubmitting(true)
        try {
            const formData = new FormData()
            formData.append('subject', subject)
            formData.append('content', content)
            formData.append('category', category)
            formData.append('priority', priority)
            formData.append('deadline', deadline)
            if (recipientType === 'USER') formData.append('recipientUserId', recipientId)
            else formData.append('recipientRoleId', recipientId)

            files.forEach(file => formData.append('files', file))

            const res = await fetch('/api/messaging', {
                method: 'POST',
                body: formData
            })

            if (res.ok) {
                onSuccess()
            } else {
                const data = await res.json()
                setError(data.error || 'Failed to send message')
            }
        } catch (error) {
            console.error('Send message error:', error)
            setError('An error occurred while sending.')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col h-full max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                <h3 className="text-xl font-bold">New Message</h3>
                <button type="button" onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
                    <ArrowLeft className="w-5 h-5 rotate-45" />
                </button>
            </div>

            {error && (
                <div className="m-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg animate-in fade-in duration-300">
                    <div className="flex items-center">
                        <AlertCircle className="w-4 h-4 mr-2" />
                        {error}
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                    <div className="col-span-2">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Recipient Type</label>
                        <div className="flex bg-gray-100 p-1 rounded-xl">
                            <button
                                type="button"
                                onClick={() => { setRecipientType('USER'); setRecipientId('') }}
                                className={cn("flex-1 py-2 text-sm font-semibold rounded-lg flex items-center justify-center transition-all", recipientType === 'USER' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500")}
                            >
                                <User className="w-4 h-4 mr-2" /> Direct User
                            </button>
                            <button
                                type="button"
                                onClick={() => { setRecipientType('ROLE'); setRecipientId('') }}
                                className={cn("flex-1 py-2 text-sm font-semibold rounded-lg flex items-center justify-center transition-all", recipientType === 'ROLE' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500")}
                            >
                                <UsersIcon className="w-4 h-4 mr-2" /> Role Category
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-tighter mb-1.5 ml-1">Send To</label>
                        {loading ? <div className="h-10 bg-gray-100 animate-pulse rounded-lg" /> : recipientType === 'USER' ? (
                            <select
                                value={recipientId}
                                onChange={(e) => setRecipientId(e.target.value)}
                                className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2.5 bg-gray-50 border transition-all"
                            >
                                <option value="">Select User...</option>
                                {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                            </select>
                        ) : (
                            <select
                                value={recipientId}
                                onChange={(e) => setRecipientId(e.target.value)}
                                className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2.5 bg-gray-50 border transition-all"
                            >
                                <option value="">Select Category...</option>
                                {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-tighter mb-1.5 ml-1">Category</label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2.5 bg-gray-50 border transition-all"
                        >
                            <option value="TASK">Task / Action Required</option>
                            <option value="UPDATE">General Update</option>
                            <option value="ALERT">Alert / Problem</option>
                            <option value="GENERAL">General Discussion</option>
                        </select>
                    </div>

                    <div className="col-span-1">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-tighter mb-1.5 ml-1">Priority</label>
                        <div className="flex bg-gray-50 border rounded-xl p-1">
                            {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map(p => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => setPriority(p)}
                                    className={cn("flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all", priority === p ? (p === 'URGENT' ? "bg-red-600 text-white" : "bg-blue-600 text-white") : "text-gray-400 hover:text-gray-600")}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="col-span-1">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-tighter mb-1.5 ml-1">Deadline (Optional)</label>
                        <input
                            type="datetime-local"
                            value={deadline}
                            onChange={(e) => setDeadline(e.target.value)}
                            className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 bg-gray-50 border transition-all"
                        />
                    </div>

                    <div className="col-span-2">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-tighter mb-1.5 ml-1">Subject</label>
                        <input
                            type="text"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="Brief summary of the message..."
                            className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2.5 bg-gray-50 border transition-all"
                        />
                    </div>

                    <div className="col-span-2">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-tighter mb-1.5 ml-1">Content</label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Write your message here..."
                            className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-3 bg-gray-50 border h-32 transition-all"
                        />
                    </div>

                    <div className="col-span-2">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-tighter mb-1.5 ml-1">Attachments (10MB Limit)</label>
                        <div className="flex flex-wrap gap-2">
                            {files.map((f, i) => (
                                <div key={i} className="flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-xs font-semibold border border-blue-100 group animate-in fade-in zoom-in duration-200">
                                    <Paperclip className="w-3 h-3" />
                                    <span className="truncate max-w-[150px]">{f.name}</span>
                                    <button onClick={() => removeFile(i)} className="ml-1 p-0.5 hover:bg-red-100 hover:text-red-700 rounded-full transition-colors">
                                        <ArrowLeft className="w-3 h-3 rotate-45" />
                                    </button>
                                </div>
                            ))}
                            <label className="cursor-pointer flex items-center gap-2 px-4 py-1.5 border-2 border-dashed border-gray-300 rounded-full text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-all active:bg-blue-50">
                                <Plus className="w-3.5 h-3.5" />
                                <span className="text-xs font-bold tracking-tight">Add File</span>
                                <input type="file" multiple onChange={handleFileChange} className="hidden" />
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-2.5 text-sm font-bold text-gray-600 hover:text-gray-800 transition-colors"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={submitting}
                    className="px-8 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95 disabled:opacity-50 transition-all flex items-center"
                >
                    {submitting ? 'Sending...' : (
                        <>
                            Send Message <Send className="w-4 h-4 ml-2" />
                        </>
                    )}
                </button>
            </div>
        </form>
    )
}
