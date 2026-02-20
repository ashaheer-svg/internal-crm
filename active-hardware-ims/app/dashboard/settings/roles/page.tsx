"use client"

import { useState, useEffect } from "react"
import { Shield, Plus, Trash2, Check, X, AlertCircle } from "lucide-react"
import BackButton from "@/components/BackButton"

export default function RolesSettingsPage() {
    const [isLoading, setIsLoading] = useState(true)
    const [roles, setRoles] = useState<any[]>([])
    const [permissions, setPermissions] = useState<any[]>([])
    const [error, setError] = useState('')

    // New Role Form
    const [isCreating, setIsCreating] = useState(false)
    const [newRoleName, setNewRoleName] = useState('')

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            const res = await fetch("/api/settings/roles")
            if (!res.ok) throw new Error("Failed to fetch roles")
            const data = await res.json()
            setRoles(data.roles)
            setPermissions(data.allPermissions)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsLoading(false)
        }
    }

    const handleTogglePermission = async (roleId: string, permissionId: string, currentlyHas: boolean) => {
        try {
            const action = currentlyHas ? 'REVOKE' : 'GRANT'
            const res = await fetch("/api/settings/roles", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ roleId, permissionId, action })
            })

            if (!res.ok) throw new Error("Failed to update permission")

            // Optimistic UI update
            await fetchData() // Simple refetch for now
        } catch (err: any) {
            alert(err.message)
        }
    }

    const handleCreateRole = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const res = await fetch("/api/settings/roles", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newRoleName })
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error)
            }

            setNewRoleName('')
            setIsCreating(false)
            fetchData()
        } catch (err: any) {
            alert(err.message)
        }
    }

    // Group permissions by resource for the matrix rows
    const resources = Array.from(new Set(permissions.map(p => p.resource))).sort()
    const actions = ['create', 'read', 'update', 'delete', 'manage']

    if (isLoading) return <div className="p-4">Loading Role Matrix...</div>

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <BackButton />
                    <h1 className="mt-4 text-2xl font-bold tracking-tight text-gray-900">Roles & Permissions</h1>
                    <p className="text-gray-500">Manage user access rights across the platform.</p>
                </div>
                {!isCreating && (
                    <button
                        onClick={() => setIsCreating(true)}
                        className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Create Custom Role
                    </button>
                )}
            </div>

            {error && (
                <div className="rounded-md bg-red-50 p-4">
                    <div className="flex">
                        <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-800">Error loading page</h3>
                            <div className="mt-2 text-sm text-red-700"><p>{error}</p></div>
                        </div>
                    </div>
                </div>
            )}

            {isCreating && (
                <form onSubmit={handleCreateRole} className="flex gap-4 p-4 border rounded-md bg-white">
                    <input
                        required
                        value={newRoleName}
                        onChange={e => setNewRoleName(e.target.value)}
                        placeholder="e.g. WAREHOUSE_LEAD"
                        className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                    />
                    <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-md font-medium hover:bg-green-500">Save Role</button>
                    <button type="button" onClick={() => setIsCreating(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md font-medium hover:bg-gray-300">Cancel</button>
                </form>
            )}

            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm mt-8">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10 border-r">
                                Resource / Action
                            </th>
                            {roles.map(role => (
                                <th key={role.id} scope="col" className="px-6 py-3 text-center text-xs font-bold text-gray-900 uppercase tracking-wider border-l">
                                    <div className="flex flex-col items-center gap-1">
                                        <Shield className={`h-5 w-5 ${role.name === 'ADMIN' ? 'text-red-500' : 'text-blue-500'}`} />
                                        {role.name}
                                        <span className="text-[10px] text-gray-400 font-normal">({role._count?.users || 0} users)</span>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {resources.map(resource => (
                            <tr key={resource as string} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 sticky left-0 bg-white border-r capitalize">
                                    {(resource as string).replace('_', ' ')}
                                </td>
                                {roles.map(role => (
                                    <td key={`${resource}-${role.id}`} className="px-6 py-4 whitespace-nowrap text-sm text-center border-l bg-gray-50/30">
                                        <div className="flex flex-col gap-2">
                                            {actions.map(action => {
                                                const permission = permissions.find(p => p.resource === resource && p.action === action)
                                                if (!permission) return null

                                                const hasPermission = role.permissions.some((rp: any) => rp.permissionId === permission.id)
                                                const isAdmin = role.name === 'ADMIN'

                                                return (
                                                    <div key={action} className="flex items-center justify-between px-2 py-1 rounded bg-white border border-gray-100 shadow-sm">
                                                        <span className="text-xs text-gray-500 uppercase w-16 text-left">{action}</span>
                                                        <button
                                                            disabled={isAdmin}
                                                            onClick={() => handleTogglePermission(role.id, permission.id, hasPermission)}
                                                            className={`p-1 rounded-full ${hasPermission ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'} ${isAdmin ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-200'}`}
                                                            title={isAdmin ? "Admins have implicit access" : "Click to toggle"}
                                                        >
                                                            {hasPermission ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                                                        </button>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
