'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, Search, Users, Shield, UserPlus, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import ConfirmModal from '@/components/ConfirmModal'

interface Member {
    id: string
    role: string
    userId: string
    user: { name: string, email?: string }
}

interface TeamSectionProps {
    projectId: string
    members: Member[]
    onUpdate: () => void
}

interface UserLookup {
    id: string
    name: string
    email: string
}

export default function CRMTeamSection({ projectId, members, onUpdate }: TeamSectionProps) {
    const [showAdd, setShowAdd] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [users, setUsers] = useState<UserLookup[]>([])
    const [loadingUsers, setLoadingUsers] = useState(false)
    const [selectedUser, setSelectedUser] = useState<UserLookup | null>(null)
    const [role, setRole] = useState<'MEMBER' | 'VIEWER'>('MEMBER')
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')
    const [isOpen, setIsOpen] = useState(false)
    const [confirmingMember, setConfirmingMember] = useState<Member | null>(null)
    const [removing, setRemoving] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const fetchUsers = async () => {
            if (!searchQuery) {
                setUsers([])
                return
            }
            setLoadingUsers(true)
            try {
                const res = await fetch(`/api/users/lookup?q=${encodeURIComponent(searchQuery)}`)
                if (res.ok) {
                    const data = await res.json()
                    // Filter out already added users
                    const filtered = (data as UserLookup[]).filter(
                        u => !members.some(m => m.userId === u.id)
                    )
                    setUsers(filtered)
                    if (filtered.length > 0) setIsOpen(true)
                }
            } catch (e) {
                console.error('Failed to fetch lookup users')
            } finally {
                setLoadingUsers(false)
            }
        }

        const debounce = setTimeout(fetchUsers, 300)
        return () => clearTimeout(debounce)
    }, [searchQuery, members])

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleAddMember = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedUser) return

        setSubmitting(true)
        setError('')

        try {
            const res = await fetch(`/api/crm/projects/${projectId}/members`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: selectedUser.id, role })
            })

            if (res.ok) {
                setShowAdd(false)
                setSelectedUser(null)
                setSearchQuery('')
                onUpdate()
            } else {
                const data = await res.json()
                setError(data.error || 'Failed to add member')
            }
        } catch (error) {
            setError('Something went wrong')
        } finally {
            setSubmitting(false)
        }
    }

    const handleConfirmRemove = async () => {
        if (!confirmingMember) return
        setRemoving(true)
        try {
            const res = await fetch(`/api/crm/projects/${projectId}/members`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: confirmingMember.userId })
            })
            if (res.ok) {
                setConfirmingMember(null)
                onUpdate()
            } else {
                const data = await res.json()
                setError(data.error || 'Failed to remove member')
                setConfirmingMember(null)
            }
        } catch (error) {
            setError('Something went wrong')
            setConfirmingMember(null)
        } finally {
            setRemoving(false)
        }
    }

    return (
        <div className="max-w-4xl space-y-6">

            <ConfirmModal
                open={!!confirmingMember}
                title="Remove Member"
                message={confirmingMember ? `Remove ${confirmingMember.user.name} from this project? This action cannot be undone.` : ''}
                confirmLabel="Confirm Remove"
                variant="danger"
                loading={removing}
                onConfirm={handleConfirmRemove}
                onCancel={() => setConfirmingMember(null)}
            />

            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-xl font-bold text-gray-900 tracking-tight">Project Team</h3>
                    <p className="text-xs text-gray-500 font-medium">Manage collaborator access and roles</p>
                </div>
                <button
                    onClick={() => {
                        setShowAdd(!showAdd)
                        setError('')
                        setSelectedUser(null)
                        setSearchQuery('')
                    }}
                    className={cn(
                        "inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border bg-white text-sm font-bold shadow-sm transition-all focus:ring-2 focus:ring-blue-100",
                        showAdd ? "border-red-200 text-red-600 hover:bg-red-50" : "border-gray-200 text-gray-700 hover:bg-gray-50"
                    )}
                >
                    {showAdd ? <X className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                    {showAdd ? 'Cancel' : 'Add Member'}
                </button>
            </div>

            {showAdd && (
                <div className="bg-white p-6 rounded-2xl border border-blue-100 shadow-xl shadow-blue-500/5 animate-in slide-in-from-top-4 duration-300">
                    <form onSubmit={handleAddMember} className="space-y-4">
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-xs font-medium rounded-xl">
                                {error}
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="relative" ref={dropdownRef}>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Search User</label>
                                {selectedUser ? (
                                    <div className="flex items-center justify-between p-3 border border-blue-200 bg-blue-50/50 rounded-xl">
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">{selectedUser.name}</p>
                                            <p className="text-xs text-gray-500">{selectedUser.email}</p>
                                        </div>
                                        <button type="button" onClick={() => setSelectedUser(null)} className="p-1.5 hover:bg-blue-100 rounded-lg text-blue-600">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Type name or email..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full rounded-xl border-gray-200 pl-10 pr-4 py-3 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all border outline-none font-medium"
                                        />
                                        {loadingUsers && (
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {isOpen && !selectedUser && users.length > 0 && (
                                    <div className="absolute z-50 mt-1 w-full bg-white shadow-2xl rounded-xl border border-gray-100 overflow-hidden max-h-48 overflow-y-auto">
                                        <ul className="divide-y divide-gray-50">
                                            {users.map((u) => (
                                                <li key={u.id}>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedUser(u)
                                                            setIsOpen(false)
                                                        }}
                                                        className="w-full text-left px-4 py-3 hover:bg-gray-50 flex flex-col"
                                                    >
                                                        <span className="text-sm font-bold text-gray-900">{u.name}</span>
                                                        <span className="text-xs text-gray-400">{u.email}</span>
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Project Role</label>
                                <select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value as any)}
                                    className="w-full rounded-xl border-gray-200 px-4 py-3 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all border outline-none font-medium bg-white"
                                >
                                    <option value="MEMBER">Member (Contributor)</option>
                                    <option value="VIEWER">Viewer (Read-Only)</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end mt-4">
                            <button
                                type="submit"
                                disabled={submitting || !selectedUser}
                                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/20 text-sm font-bold hover:bg-blue-700 transition-all disabled:opacity-50"
                            >
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                Add to Team
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-100 shadow-xl shadow-blue-500/5 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/50">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-400" /> Currently Enlisted ({members.length})
                    </span>
                </div>
                <ul className="divide-y divide-gray-100">
                    {members.map((member) => (
                        <li key={member.id} className="px-6 py-4 flex items-center justify-between group hover:bg-gray-50/50 transition-colors">
                            <div className="flex items-center">
                                <div className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shadow-sm",
                                    member.role === 'OWNER' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-blue-50 text-blue-700 border border-blue-100'
                                )}>
                                    {member.user.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm font-black text-gray-900 leading-snug">{member.user.name}</p>
                                    <p className="text-[11px] font-bold text-gray-400 mt-0.5">{member.user.email || 'No email'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className={cn(
                                    "flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border",
                                    member.role === 'OWNER' ? 'bg-amber-50 border-amber-100 text-amber-700' :
                                    member.role === 'MEMBER' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-gray-50 border-gray-200 text-gray-500'
                                )}>
                                    {member.role === 'OWNER' && <Shield className="w-3 h-3 text-amber-500" />}
                                    {member.role}
                                </span>
                                {member.role !== 'OWNER' && (
                                    <button
                                        onClick={() => setConfirmingMember(member)}
                                        className="text-gray-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                        title="Remove member"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    )
}
