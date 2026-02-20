"use client"

import { useState, useEffect } from "react"
import { Users, Plus, Edit, Trash2, LogOut } from "lucide-react"
import UserFormModal from "./UserFormModal"
import { logoutAllUsers } from "@/app/actions/auth-actions"
import { formatDate } from "@/lib/utils"

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
        if (!confirm(`Are you sure you want to deactivate user "${name}"?`)) {
            return
        }

        try {
            const res = await fetch(`/api/users/${id}`, {
                method: 'DELETE'
            })

            if (res.ok || res.status === 204) {
                await fetchUsers()
            } else {
                const data = await res.json()
                alert(data.error || 'Failed to delete user')
            }
        } catch (error) {
            console.error('Delete error:', error)
            alert('Failed to delete user')
        }
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
        if (!confirm("Are you sure you want to log out ALL users? This will invalidate all active sessions immediately, including your own.")) {
            return
        }

        try {
            await logoutAllUsers()
            alert("All users have been logged out.")
            window.location.href = "/login"
        } catch (error) {
            console.error("Failed to logout users:", error)
            alert("Failed to logout users")
        }
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
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-medium text-gray-900">User Accounts</h2>
                    <p className="text-sm text-gray-500">Manage individual user access and statuses.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleLogoutAll}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 text-sm font-medium"
                    >
                        <LogOut className="h-4 w-4" />
                        Logout All Users
                    </button>
                    <button
                        onClick={() => {
                            setEditingUser(null)
                            setShowModal(true)
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-sm font-medium"
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
                                            className="text-blue-600 hover:text-blue-900 mr-4 transition-colors"
                                            title="Edit User"
                                        >
                                            <Edit className="h-4 w-4 inline" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(user.id, user.name)}
                                            className="text-red-600 hover:text-red-900 transition-colors"
                                            title="Deactivate User"
                                        >
                                            <Trash2 className="h-4 w-4 inline" />
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
        </div>
    )
}
