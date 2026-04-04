"use client"

import { useState, useEffect } from "react"
import { Users, Plus, Edit, Trash2, LogOut, RefreshCw } from "lucide-react"
import UserFormModal from "./UserFormModal"
import UserTransferModal from "@/components/crm/UserTransferModal"
import { logoutAllUsers } from "@/app/actions/auth-actions"
import { formatDate } from "@/lib/utils"
import ConfirmModal from "@/components/ConfirmModal"

type User = {
    id: string
    name: string
    email: string
    role: string
    isActive: boolean
    lastLoginAt: string | null
    createdAt: string
}

export default function UsersTab() {
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editingUser, setEditingUser] = useState<User | null>(null)
    const [transferringUser, setTransferringUser] = useState<{ id: string, name: string } | null>(null) // State for transfer
    const [pendingAction, setPendingAction] = useState<null | {
        title: string; message: string; variant?: 'danger' | 'warning'; loading?: boolean; onConfirm: () => void
    }>(null)
    const [actionLoading, setActionLoading] = useState(false)

    useEffect(() => {
        fetchUsers()
    }, [])

    async function fetchUsers() {
        try {
            const res = await fetch('/api/users')
            if (res.ok) {
                const data = await res.json()
                setUsers(data.users || [])
            }
        } catch (error) {
            console.error('Failed to fetch users:', error)
        } finally {
            setLoading(false)
        }
    }

    async function handleDelete(id: string, name: string) {
        setPendingAction({
            title: 'Deactivate User',
            message: `Are you sure you want to deactivate user "${name}"?`,
            variant: 'warning',
            onConfirm: async () => {
                setPendingAction(null)
                try {
                    const res = await fetch(`/api/users/${id}`, { method: 'DELETE' })
                    if (res.ok || res.status === 204) {
                        await fetchUsers()
                    } else {
                        const data = await res.json()
                        console.error(data.error || 'Failed to delete user')
                    }
                } catch (error) {
                    console.error('Delete error:', error)
                }
            }
        })
    }

    function getRoleBadgeColor(role: string) {
        switch (role) {
            case 'ADMIN': return 'bg-red-100 text-red-800'
            case 'MANAGER': return 'bg-purple-100 text-purple-800'
            case 'SALES': return 'bg-blue-100 text-blue-800'
            case 'WAREHOUSE': return 'bg-green-100 text-green-800'
            case 'VIEWER': return 'bg-gray-100 text-gray-800'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    async function handleLogoutAll() {
        setPendingAction({
            title: 'Log Out All Users',
            message: 'Are you sure you want to log out ALL users? This will invalidate all active sessions immediately, including your own.',
            variant: 'danger',
            onConfirm: async () => {
                setPendingAction(null)
                setActionLoading(true)
                try {
                    await logoutAllUsers()
                    window.location.href = "/login"
                } catch (error) {
                    console.error("Failed to logout users:", error)
                } finally {
                    setActionLoading(false)
                }
            }
        })
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-gray-500">Loading users...</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <ConfirmModal
                open={!!pendingAction}
                title={pendingAction?.title ?? ''}
                message={pendingAction?.message ?? ''}
                variant={pendingAction?.variant ?? 'danger'}
                loading={actionLoading}
                onConfirm={() => pendingAction?.onConfirm()}
                onCancel={() => setPendingAction(null)}
            />
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-medium text-gray-900">User Accounts</h2>
                    <p className="text-sm text-gray-500">Manage individual user access and statuses.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleLogoutAll}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-600 text-sm font-medium text-white hover:bg-red-700 transition-colors shadow-sm"
                    >
                        <LogOut className="h-4 w-4" />
                        Logout All Users
                    </button>
                    <button
                        onClick={() => {
                            setEditingUser(null)
                            setShowModal(true)
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        <Plus className="h-4 w-4" />
                        Add User
                    </button>
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {users.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                    <Users className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                                    <p>No users found</p>
                                </td>
                            </tr>
                        ) : (
                            users.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div>
                                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                            <div className="text-sm text-gray-500">{user.email}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(user.role)}`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${user.isActive
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-red-100 text-red-800'
                                            }`}>
                                            {user.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {user.lastLoginAt
                                            ? formatDate(user.lastLoginAt)
                                            : 'Never'
                                        }
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {formatDate(user.createdAt)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => {
                                                setEditingUser(user)
                                                setShowModal(true)
                                            }}
                                            className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-gray-100 transition-colors"
                                            title="Edit User"
                                        >
                                            <Edit className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => setTransferringUser({ id: user.id, name: user.name })}
                                            className="p-2 rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                                            title="Transfer Records"
                                        >
                                            <RefreshCw className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(user.id, user.name)}
                                            className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                            title="Deactivate User"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* User Form Modal */}
            {showModal && (
                <UserFormModal
                    user={editingUser}
                    onClose={() => {
                        setShowModal(false)
                        setEditingUser(null)
                    }}
                    onSuccess={() => {
                        setShowModal(false)
                        setEditingUser(null)
                        fetchUsers()
                    }}
                />
            )}

            {/* User Transfer Modal */}
            {transferringUser && (
                <UserTransferModal
                    isOpen={true}
                    onClose={() => setTransferringUser(null)}
                    fromUserId={transferringUser.id}
                    fromUserName={transferringUser.name}
                    onSuccess={() => {
                        setTransferringUser(null)
                        fetchUsers()
                        alert("Records transferred successfully")
                    }}
                />
            )}
        </div>
    )
}
