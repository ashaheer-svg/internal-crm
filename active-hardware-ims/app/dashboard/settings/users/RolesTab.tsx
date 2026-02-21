"use client"

import { useState, useEffect } from "react"
import { Shield, Plus, Check, X, AlertCircle, Trash2, Printer } from "lucide-react"

export default function RolesTab() {
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

    const handleDeleteRole = async (roleId: string, roleName: string) => {
        if (!confirm(`Are you sure you want to permanently delete the "${roleName}" role? This cannot be undone.`)) return
        try {
            const res = await fetch(`/api/settings/roles?roleId=${roleId}`, { method: 'DELETE' })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            await fetchData()
        } catch (err: any) {
            alert(`Failed to delete role: ${err.message}`)
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

    if (isLoading) return <div className="p-8 text-center text-gray-500">Loading Role Matrix...</div>

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-medium text-gray-900">Access Matrix</h2>
                    <p className="text-sm text-gray-500">Manage user access rights across the platform via role assignments.</p>
                </div>
                {!isCreating && (
                    <div className="flex gap-2 print:hidden">
                        <button
                            onClick={() => window.print()}
                            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                        >
                            <Printer className="mr-1.5 h-4 w-4" />
                            Print
                        </button>
                        <button
                            onClick={() => setIsCreating(true)}
                            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Create Custom Role
                        </button>
                    </div>
                )}
            </div>

            {error && (
                <div className="rounded-md bg-red-50 p-4 border border-red-200">
                    <div className="flex">
                        <AlertCircle className="h-5 w-5 text-red-500" aria-hidden="true" />
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-800">Error loading page</h3>
                            <div className="mt-2 text-sm text-red-700"><p>{error}</p></div>
                        </div>
                    </div>
                </div>
            )}

            {isCreating && (
                <form onSubmit={handleCreateRole} className="flex gap-4 p-5 border rounded-lg bg-gray-50 shadow-sm animate-in fade-in slide-in-from-top-2">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Role Name</label>
                        <input
                            required
                            value={newRoleName}
                            onChange={e => setNewRoleName(e.target.value.toUpperCase())}
                            placeholder="e.g. WAREHOUSE_LEAD"
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                        />
                    </div>
                    <div className="flex items-end gap-2">
                        <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-md font-medium hover:bg-green-700 shadow-sm">Save Role</button>
                        <button type="button" onClick={() => setIsCreating(false)} className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md font-medium hover:bg-gray-50 shadow-sm">Cancel</button>
                    </div>
                </form>
            )}

            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm print:shadow-none print:border-0">
                <table className="min-w-full divide-y divide-gray-200 text-xs">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wide sticky left-0 bg-gray-50 z-10 border-r border-b min-w-[100px]">
                                Resource
                            </th>
                            {roles.map(role => (
                                <th key={role.id} scope="col" className="px-2 py-2 text-center text-[10px] font-bold text-gray-900 uppercase tracking-wider border-l border-b bg-gray-50 min-w-[70px] max-w-[90px]">
                                    <div className="flex flex-col items-center gap-0.5">
                                        <Shield className={`h-3.5 w-3.5 ${role.name === 'ADMIN' ? 'text-red-500' : 'text-blue-500'}`} />
                                        <span className="truncate max-w-[80px]">{role.name}</span>
                                        <span className="text-[9px] font-normal text-gray-500">{role._count?.users || 0}u</span>
                                        {!role.isSystemDefault && (role._count?.users || 0) === 0 && (
                                            <button
                                                onClick={() => handleDeleteRole(role.id, role.name)}
                                                className="mt-0.5 p-0.5 rounded text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors print:hidden"
                                                title={`Delete ${role.name} role`}
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </button>
                                        )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {resources.map(resource => (
                            <tr key={resource as string} className="hover:bg-gray-50 transition-colors">
                                <td className="px-3 py-1.5 whitespace-nowrap text-[11px] font-semibold text-gray-800 sticky left-0 bg-white/95 backdrop-blur border-r capitalize">
                                    {(resource as string).replace('_', ' ')}
                                </td>
                                {roles.map(role => (
                                    <td key={`${resource}-${role.id}`} className="px-1.5 py-1.5 whitespace-nowrap text-center border-l bg-gray-50/20">
                                        <div className="flex flex-wrap justify-center gap-0.5">
                                            {actions.map(action => {
                                                const permission = permissions.find(p => p.resource === resource && p.action === action)
                                                if (!permission) return null

                                                const hasPermission = role.permissions.some((rp: any) => rp.permissionId === permission.id)
                                                const isAdmin = role.name === 'ADMIN'

                                                return (
                                                    <button
                                                        key={action}
                                                        disabled={isAdmin}
                                                        onClick={() => handleTogglePermission(role.id, permission.id, hasPermission)}
                                                        title={`${action} — ${isAdmin ? 'Admin has implicit access' : hasPermission ? 'Click to revoke' : 'Click to grant'}`}
                                                        className={`w-5 h-5 rounded flex items-center justify-center border text-[10px] font-bold transition-all
                                                            ${hasPermission
                                                                ? 'bg-green-100 text-green-700 border-green-300'
                                                                : 'bg-gray-100 text-gray-400 border-gray-200'}
                                                            ${isAdmin ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110 active:scale-95 print:cursor-default'}`}
                                                    >
                                                        {hasPermission ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : <X className="h-2.5 w-2.5" strokeWidth={2} />}
                                                    </button>
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
            <p className="text-[10px] text-gray-400 text-right mt-1 print:block hidden">Printed: {new Date().toLocaleString()}</p>
        </div>
    )
}
