"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"

type User = {
    id: string
    name: string
    email: string
    role: string
    isActive: boolean
}

type Props = {
    user: User | null
    onClose: () => void
    onSuccess: () => void
}

export default function UserFormModal({ user, onClose, onSuccess }: Props) {
    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        role: user?.role || 'VIEWER',
        isActive: user?.isActive ?? true,
        password: ''
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const isEditing = !!user

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const url = isEditing ? `/api/users/${user.id}` : '/api/users'
            const method = isEditing ? 'PATCH' : 'POST'

            const body: any = {
                name: formData.name,
                email: formData.email,
                role: formData.role,
                isActive: formData.isActive
            }

            // Only include password if provided
            if (formData.password) {
                body.password = formData.password
            } else if (!isEditing) {
                // Password is required for new users
                setError('Password is required for new users')
                setLoading(false)
                return
            }

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })

            const data = await res.json()

            if (res.ok) {
                onSuccess()
            } else {
                setError(data.error || 'Failed to save user')
            }
        } catch (err) {
            setError('An error occurred')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <div className="flex items-center justify-between p-6 border-b">
                    <h2 className="text-xl font-semibold">
                        {isEditing ? 'Edit User' : 'Add New User'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Name *
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email *
                        </label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Role *
                        </label>
                        <select
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            required
                        >
                            <option value="VIEWER">Viewer</option>
                            <option value="SALES">Sales</option>
                            <option value="WAREHOUSE">Warehouse</option>
                            <option value="MANAGER">Manager</option>
                            <option value="ADMIN">Admin</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Password {isEditing && '(leave blank to keep current)'}
                        </label>
                        <input
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            placeholder={isEditing ? "Leave blank to keep current" : "Enter password"}
                            minLength={8}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Minimum 8 characters. User will be required to change password on first login.
                        </p>
                    </div>

                    {isEditing && (
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="isActive"
                                checked={formData.isActive}
                                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                            />
                            <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                                Active
                            </label>
                        </div>
                    )}

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                            {loading ? 'Saving...' : (isEditing ? 'Update' : 'Create')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
