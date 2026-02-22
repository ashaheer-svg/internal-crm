"use client"

import { useState, useEffect } from "react"
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
    MessageSquare
} from "lucide-react"
import { formatDateTime } from "@/lib/utils"
import { cn } from "@/lib/utils"

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
    const [loading, setLoading] = useState(true)
    const [tab, setTab] = useState<'inbox' | 'sent' | 'admin'>('inbox')
    const [searchQuery, setSearchQuery] = useState('')
    const [categoryFilter, setCategoryFilter] = useState('ALL')
    const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
    const [isNewMessageModalOpen, setIsNewMessageModalOpen] = useState(false)
    const [currentUser, setCurrentUser] = useState<any>(null)
    const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null)

    // Resolution state
    const [resolutionComment, setResolutionComment] = useState('')
    const [submittingResolution, setSubmittingResolution] = useState(false)

    useEffect(() => {
        fetchCurrentUser()
    }, [])

    useEffect(() => {
        fetchMessages()
    }, [tab])

    const fetchCurrentUser = async () => {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
            const data = await res.json()
            setCurrentUser(data.user)
            if (data.user.role === 'ADMIN' || (data.user.permissions && data.user.permissions.includes('all:manage'))) {
                // Admin can see admin tab
            }
        }
    }

    const fetchMessages = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/messaging?type=${tab}`)
            if (res.ok) {
                const data = await res.json()
                setMessages(data.messages)
            }
        } catch (error) {
            console.error('Failed to fetch messages:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleReadMessage = async (messageId: string) => {
        try {
            await fetch(`/api/messaging/${messageId}/receipt`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'read' })
            })
            // Refresh to update read status locally if needed
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
                // Update local state instead of full refetch
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
                // update selected message too
                if (selectedMessage?.id === messageId) {
                    setSelectedMessage(prev => {
                        if (!prev) return null
                        return {
                            ...prev,
                            receipts: prev.receipts.map(r =>
                                r.userId === currentUser.id
                                    ? { ...r, isDone: true, doneAt: new Date().toISOString(), comment: resolutionComment }
                                    : r
                            )
                        }
                    })
                }
            }
        } catch (error) {
            console.error('Failed to mark as done:', error)
        } finally {
            setSubmittingResolution(false)
        }
    }

    const filteredMessages = messages.filter(m => {
        const matchesSearch = m.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.sender.name.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesCategory = categoryFilter === 'ALL' || m.category === categoryFilter
        return matchesSearch && matchesCategory
    })

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'URGENT': return 'text-red-600 bg-red-100'
            case 'HIGH': return 'text-orange-600 bg-orange-100'
            case 'MEDIUM': return 'text-blue-600 bg-blue-100'
            case 'LOW': return 'text-gray-600 bg-gray-100'
            default: return 'text-gray-600 bg-gray-100'
        }
    }

    return (
        <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)]">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center">
                    <Mail className="w-6 h-6 mr-2 text-blue-600" />
                    Messaging
                </h1>

                {notification && (
                    <div className={cn(
                        "px-4 py-2 rounded-lg text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-300",
                        notification.type === 'success' ? "bg-green-100 text-green-800 border border-green-200" : "bg-red-100 text-red-800 border border-red-200"
                    )}>
                        {notification.message}
                    </div>
                )}
            </div>

            <div className="flex-1 flex bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                {/* Sidebar / List View */}
                <div className={cn(
                    "flex flex-col border-r border-gray-200 bg-white transition-all duration-300",
                    selectedMessage ? "hidden md:flex md:w-1/3" : "w-full"
                )}>
                    <div className="p-4 border-b border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center">
                                <Mail className="w-5 h-5 mr-2 text-blue-600" />
                                Messaging
                            </h2>
                            <button
                                onClick={() => setIsNewMessageModalOpen(true)}
                                className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 shadow-sm"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex bg-gray-100 p-1 rounded-lg mb-4">
                            <button
                                onClick={() => setTab('inbox')}
                                className={cn("flex-1 flex items-center justify-center py-1.5 text-xs font-medium rounded-md", tab === 'inbox' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700")}
                            >
                                <Inbox className="w-3.5 h-3.5 mr-1.5" /> Inbox
                            </button>
                            <button
                                onClick={() => setTab('sent')}
                                className={cn("flex-1 flex items-center justify-center py-1.5 text-xs font-medium rounded-md", tab === 'sent' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700")}
                            >
                                <Send className="w-3.5 h-3.5 mr-1.5" /> Sent
                            </button>
                            {(currentUser?.role === 'ADMIN' || currentUser?.permissions?.includes('all:manage')) && (
                                <button
                                    onClick={() => setTab('admin')}
                                    className={cn("flex-1 flex items-center justify-center py-1.5 text-xs font-medium rounded-md", tab === 'admin' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700")}
                                >
                                    <Filter className="w-3.5 h-3.5 mr-1.5" /> Admin
                                </button>
                            )}
                        </div>

                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search messages..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {loading ? (
                            <div className="flex justify-center p-8"><Clock className="w-5 h-5 animate-spin text-gray-400" /></div>
                        ) : filteredMessages.length === 0 ? (
                            <div className="text-center p-8 text-gray-500">No messages found</div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {filteredMessages.map((m) => {
                                    const userReceipt = m.receipts.find(r => r.userId === currentUser?.id)
                                    const isUnread = tab === 'inbox' && !userReceipt?.viewedAt
                                    const isDone = userReceipt?.isDone

                                    return (
                                        <button
                                            key={m.id}
                                            onClick={() => {
                                                setSelectedMessage(m)
                                                if (isUnread) handleReadMessage(m.id)
                                            }}
                                            className={cn(
                                                "w-full text-left p-4 hover:bg-gray-50 transition-colors border-l-4",
                                                selectedMessage?.id === m.id ? "bg-blue-50 border-blue-600" : (isUnread ? "bg-white border-blue-400 font-semibold" : "bg-white border-transparent")
                                            )}
                                        >
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">{m.category}</span>
                                                <span className="text-[10px] text-gray-400">{formatDateTime(m.createdAt)}</span>
                                            </div>
                                            <h3 className="text-sm text-gray-900 line-clamp-1">{m.subject}</h3>
                                            <div className="flex items-center mt-2 gap-2">
                                                <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold", getPriorityColor(m.priority))}>
                                                    {m.priority}
                                                </span>
                                                {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
                                                {m.deadline && (
                                                    <span className="flex items-center text-[10px] text-orange-600">
                                                        <Calendar className="w-3 h-3 mr-0.5" />
                                                        {new Date(m.deadline).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Detail View */}
                <div className={cn(
                    "flex-1 flex flex-col bg-white",
                    !selectedMessage && "hidden md:flex items-center justify-center bg-gray-50"
                )}>
                    {!selectedMessage ? (
                        <div className="text-center">
                            <div className="p-4 bg-gray-100 rounded-full inline-block mb-3">
                                <MessageSquare className="w-8 h-8 text-gray-400" />
                            </div>
                            <p className="text-gray-500">Select a message to view details</p>
                        </div>
                    ) : (
                        <>
                            {/* Header */}
                            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                                <div className="flex items-center">
                                    <button onClick={() => setSelectedMessage(null)} className="md:hidden mr-3 p-2 text-gray-400 hover:text-gray-600">
                                        <ArrowLeft className="w-5 h-5" />
                                    </button>
                                    <div>
                                        <h2 className="text-lg font-bold text-gray-900">{selectedMessage.subject}</h2>
                                        <div className="flex items-center text-xs text-gray-500 mt-0.5">
                                            <span className="font-medium text-gray-700">{selectedMessage.sender.name}</span>
                                            <ChevronRight className="w-3 h-3 mx-1" />
                                            <span>
                                                {selectedMessage.recipientUser?.name || selectedMessage.recipientRole?.name || 'Multiple Recipients'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <span className={cn("px-2 py-1 rounded-full text-[10px] font-bold", getPriorityColor(selectedMessage.priority))}>
                                        {selectedMessage.priority}
                                    </span>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-6">
                                <div className="flex items-center justify-between mb-6 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                    <div className="flex gap-6">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-gray-400 uppercase tracking-tighter">Category</span>
                                            <span className="text-sm font-semibold">{selectedMessage.category}</span>
                                        </div>
                                        {selectedMessage.deadline && (
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-gray-400 uppercase tracking-tighter">Deadline</span>
                                                <span className="text-sm font-semibold text-orange-600 flex items-center">
                                                    <AlertCircle className="w-3.5 h-3.5 mr-1" />
                                                    {formatDateTime(selectedMessage.deadline)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-[10px] text-gray-400 flex items-center">
                                        <Clock className="w-3 h-3 mr-1" />
                                        Sent on {formatDateTime(selectedMessage.createdAt)}
                                    </div>
                                </div>

                                <div className="prose prose-sm max-w-none text-gray-800 whitespace-pre-wrap mb-8">
                                    {selectedMessage.content}
                                </div>

                                {selectedMessage.attachments.length > 0 && (
                                    <div className="mt-8 border-t pt-4">
                                        <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center">
                                            <Paperclip className="w-4 h-4 mr-2" />
                                            Attachments ({selectedMessage.attachments.length})
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {selectedMessage.attachments.map(att => (
                                                <a
                                                    key={att.id}
                                                    href={att.filePath}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group"
                                                >
                                                    <div className="p-2 bg-blue-50 rounded text-blue-600 group-hover:bg-blue-100 transition-colors">
                                                        <Paperclip className="w-4 h-4" />
                                                    </div>
                                                    <div className="ml-3 overflow-hidden">
                                                        <p className="text-xs font-medium text-gray-900 truncate">{att.fileName}</p>
                                                        <p className="text-[10px] text-gray-400 uppercase">{att.fileType.split('/')[1] || 'FILE'}</p>
                                                    </div>
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Tracking / Receipts */}
                                <div className="mt-8 border-t pt-4">
                                    <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center">
                                        <UsersIcon className="w-4 h-4 mr-2" />
                                        Read & Resolution Tracking
                                    </h4>
                                    <div className="space-y-4">
                                        {selectedMessage.receipts.map(receipt => (
                                            <div key={receipt.userId} className="flex items-start gap-4 text-sm bg-gray-50 p-4 rounded-xl border border-gray-100">
                                                <div className="p-2 bg-white rounded-full border border-gray-200 shadow-sm">
                                                    <User className="w-4 h-4 text-gray-400" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between">
                                                        <span className="font-bold text-gray-900">{receipt.user.name}</span>
                                                        <div className="flex items-center gap-2">
                                                            {receipt.viewedAt ? (
                                                                <span className="text-[10px] text-green-600 font-medium flex items-center">
                                                                    Seen {formatDateTime(receipt.viewedAt)}
                                                                </span>
                                                            ) : (
                                                                <span className="text-[10px] text-gray-400 font-medium underline decoration-dotted decoration-gray-300">Unseen</span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {receipt.isDone ? (
                                                        <div className="mt-2 p-3 bg-green-50 rounded-lg border border-green-100">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <span className="text-[10px] font-bold text-green-700 uppercase">Resolution</span>
                                                                <span className="text-[10px] text-green-600">{formatDateTime(receipt.doneAt!)}</span>
                                                            </div>
                                                            <p className="text-sm text-green-800 font-medium italic">"{receipt.comment}"</p>
                                                        </div>
                                                    ) : (
                                                        receipt.userId === currentUser?.id && (
                                                            <div className="mt-3">
                                                                <textarea
                                                                    placeholder="Add a comment to mark as done..."
                                                                    value={resolutionComment}
                                                                    onChange={(e) => setResolutionComment(e.target.value)}
                                                                    className="w-full p-3 text-sm border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 mb-2 transition-all shadow-inner"
                                                                    rows={2}
                                                                />
                                                                <button
                                                                    onClick={() => handleMarkDone(selectedMessage.id)}
                                                                    disabled={submittingResolution}
                                                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-semibold rounded-lg text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 shadow-md transform active:scale-95 transition-all"
                                                                >
                                                                    {submittingResolution ? 'Saving...' : 'Mark as Done'}
                                                                </button>
                                                            </div>
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {isNewMessageModalOpen && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden scale-in-center">
                            <NewMessageForm
                                onClose={() => setIsNewMessageModalOpen(false)}
                                onSuccess={() => {
                                    setIsNewMessageModalOpen(false)
                                    fetchMessages()
                                    setNotification({ type: 'success', message: 'Message sent successfully!' })
                                }}
                            />
                        </div>
                    </div>
                )}
            </div>
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
            const [uRes, rRes] = await Promise.all([
                fetch('/api/users'),
                fetch('/api/settings/roles')
            ])
            if (uRes.ok) {
                const uData = await uRes.json()
                setUsers(uData.users || [])
            }
            if (rRes.ok) {
                const rData = await rRes.json()
                setRoles(rData.roles || [])
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
