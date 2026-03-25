"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"

type User = {
    id: string
    name: string
    email: string
    role: string
    isActive: boolean
    salesRepId?: string | null
}

type SalesRep = {
    id: string
    name: string
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
        roleId: (user as any)?.roleId || '', // Directly map from backend provided projection
        isActive: user?.isActive ?? true,
        password: '',
        salesRepId: user?.salesRepId || ''
    })
    const [salesReps, setSalesReps] = useState<SalesRep[]>([])
    const [availableRoles, setAvailableRoles] = useState<{ id: string, name: string }[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const isEditing = !!user

    useEffect(() => {
        // Fetch Sales Reps for the dropdown
        fetch('/api/sales-reps')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setSalesReps(data)
                } else if (data && data.salesReps) {
                    setSalesReps(data.salesReps)
                }
            })
            .catch(err => console.error('Failed to fetch sales reps:', err))

        // Fetch dynamic roles
        fetch('/api/settings/roles', { cache: 'no-store' })
            .then(res => res.json())
            .then(data => {
                if (data.roles) {
                    setAvailableRoles(data.roles)
                }
            })
            .catch(err => console.error('Failed to fetch roles:', err))
    }, [])

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
                roleId: formData.roleId,
                isActive: formData.isActive,
                salesRepId: formData.salesRepId || null
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
                        className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
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
                            className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
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
                            className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Role *
                            </label>
                            <select
                                value={formData.roleId}
                                onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                                className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                                required
                            >
                                <option value="" disabled>Select Role...</option>
                                {availableRoles.map(r => (
                                    <option key={r.id} value={r.id}>{r.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Link to Sales Rep
                            </label>
                            <select
                                value={formData.salesRepId}
                                onChange={(e) => setFormData({ ...formData, salesRepId: e.target.value })}
                                className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                            >
                                <option value="">None</option>
                                {salesReps.map(rep => (
                                    <option key={rep.id} value={rep.id}>
                                        {rep.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Password {isEditing && '(leave blank to keep current)'}
                        </label>
                        <input
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            placeholder={isEditing ? "Leave blank to keep current" : "Enter password"}
                            minLength={8}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Minimum 8 characters. User will be required to change password on first login.
                        </p>
                    </div>

                    {isEditing && (
                        <div className="flex items-center pt-2">
                            <input
                                type="checkbox"
                                id="isActive"
                                checked={formData.isActive}
                                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                                Active Account
                            </label>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4 border-t mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Saving...' : (isEditing ? 'Update User' : 'Create User')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
