"use client"

import { useState, useEffect } from "react"
import { RefreshCw, X, AlertTriangle } from "lucide-react"

interface User {
    id: string
    name: string
    email: string
    isActive: boolean
}

interface UserTransferModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    fromUserId: string
    fromUserName: string
}

export default function UserTransferModal({ isOpen, onClose, onSuccess, fromUserId, fromUserName }: UserTransferModalProps) {
    const [users, setUsers] = useState<User[]>([])
    const [selectedToUserId, setSelectedToUserId] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    useEffect(() => {
        if (isOpen) {
            fetchUsers()
        }
    }, [isOpen])

    async function fetchUsers() {
        try {
            const res = await fetch('/api/users')
            if (res.ok) {
                const data = await res.json()
                // Filter out the "from" user and only show Active targets
                const activeTargets = (data.users || []).filter((u: User) => u.id !== fromUserId && u.isActive)
                setUsers(activeTargets)
            }
        } catch (err) {
            console.error('Failed to fetch users:', err)
        }
    }

    async function handleTransfer() {
        if (!selectedToUserId) {
            setError("Please select a target user.")
            return
        }

        setLoading(true)
        setError("")

        try {
            const res = await fetch('/api/users/transfer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fromUserId,
                    toUserId: selectedToUserId
                })
            })

            if (res.ok) {
                onSuccess()
            } else {
                const data = await res.json()
                setError(data.error || 'Failed to transfer records')
            }
        } catch (err: any) {
            setError(err.message || 'Error occurred during transfer')
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-md w-full overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-base font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 text-orange-500" />
                        Transfer User Records
                    </h3>
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                        <X className="w-4 h-4 text-gray-400" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-xs font-bold text-amber-800 uppercase tracking-wide">Warning!</p>
                            <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                                This will reassign all Quotes, Projects, Tasks, and related ownerships from **{fromUserName}** to the selected user. This action cannot be undone automatically.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Transfer From</label>
                        <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-700">
                            {fromUserName}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Transfer To <span className="text-red-500">*</span></label>
                        <select
                            value={selectedToUserId}
                            onChange={(e) => setSelectedToUserId(e.target.value)}
                            disabled={loading || users.length === 0}
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 transition-shadow"
                        >
                            <option value="">-- Select Active User --</option>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                            ))}
                        </select>
                        {users.length === 0 && !loading && (
                            <p className="text-[10px] text-red-500 font-bold">No other active users found to transfer to.</p>
                        )}
                    </div>

                    {error && (
                        <p className="text-xs font-medium text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                            {error}
                        </p>
                    )}
                </div>

                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="px-4 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-medium text-xs rounded-lg transition-colors shadow-sm disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleTransfer}
                        disabled={loading || !selectedToUserId}
                        className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-xs rounded-lg transition-all shadow-md disabled:opacity-50 flex items-center gap-1.5"
                    >
                        {loading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                        Execute Transfer
                    </button>
                </div>
            </div>
        </div>
    )
}
