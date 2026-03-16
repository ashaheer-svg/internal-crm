"use client"

import { useState } from "react"
import { Download, Upload, AlertCircle, CheckCircle2, Loader2, Database } from "lucide-react"
import ConfirmModal from "@/components/ConfirmModal"

export default function MaintenanceTab() {
    const [exportLoading, setExportLoading] = useState(false)
    const [importLoading, setImportLoading] = useState(false)
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null)
    const [pendingImport, setPendingImport] = useState<null | { content: string; fileName: string }>(null)

    async function handleExport() {
        setExportLoading(true)
        setStatus(null)
        try {
            const res = await fetch('/api/settings/maintenance/export')
            if (!res.ok) throw new Error('Export failed')

            const blob = await res.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `rbac_backup_${new Date().toISOString().split('T')[0]}.json`
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)

            setStatus({ type: 'success', message: 'RBAC configuration exported successfully.' })
        } catch (error: any) {
            setStatus({ type: 'error', message: error.message || 'Failed to export configuration.' })
        } finally {
            setExportLoading(false)
        }
    }

    async function handleImport(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0]
        if (!file) return
        event.target.value = ''

        const reader = new FileReader()
        reader.onload = (e) => {
            const content = e.target?.result as string
            setPendingImport({ content, fileName: file.name })
        }
        reader.readAsText(file)
    }

    async function confirmImport() {
        if (!pendingImport) return
        const content = pendingImport.content
        setPendingImport(null)
        setImportLoading(true)
        setStatus(null)
        try {
            const jsonData = JSON.parse(content)
            const res = await fetch('/api/settings/maintenance/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(jsonData)
            })
            const result = await res.json()
            if (res.ok) {
                setStatus({ type: 'success', message: result.message || 'Configuration imported successfully.' })
            } else {
                throw new Error(result.error || 'Import failed')
            }
        } catch (err: any) {
            setStatus({ type: 'error', message: err.message || 'Invalid JSON file format.' })
        } finally {
            setImportLoading(false)
        }
    }

    return (
        <div className="space-y-6 max-w-4xl">
            <ConfirmModal
                open={!!pendingImport}
                title="Restore RBAC Configuration"
                message={`Are you sure you want to restore/merge this RBAC configuration from "${pendingImport?.fileName ?? ''}"? This will update users, roles, and permissions based on the file content.`}
                variant="warning"
                onConfirm={confirmImport}
                onCancel={() => setPendingImport(null)}
            />
            <div className="bg-white shadow rounded-lg border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-blue-50 rounded-lg">
                        <Database className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                        <h2 className="text-lg font-medium text-gray-900">RBAC Maintenance</h2>
                        <p className="text-sm text-gray-500">Backup and restore Users, Sales Representatives, and Permissions Matrix.</p>
                    </div>
                </div>

                {status && (
                    <div className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${status.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                        }`}>
                        {status.type === 'success' ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                        ) : (
                            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                        )}
                        <span className={`text-sm font-medium ${status.type === 'success' ? 'text-green-800' : 'text-red-800'
                            }`}>
                            {status.message}
                        </span>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Export Card */}
                    <div className="p-5 border border-gray-100 rounded-xl bg-gray-50/50 hover:bg-gray-50 transition-colors">
                        <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                            <Download className="h-4 w-4 text-blue-500" />
                            Export Configuration
                        </h3>
                        <p className="text-sm text-gray-600 mb-6">
                            Download a JSON file containing all users, sales representatives, and the current roles and permissions matrix.
                        </p>
                        <button
                            onClick={handleExport}
                            disabled={exportLoading}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all font-medium shadow-sm hover:shadow"
                        >
                            {exportLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                            {exportLoading ? 'Generating Backup...' : 'Export JSON Backup'}
                        </button>
                    </div>

                    {/* Import Card */}
                    <div className="p-5 border border-gray-100 rounded-xl bg-gray-50/50 hover:bg-gray-50 transition-colors">
                        <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                            <Upload className="h-4 w-4 text-orange-500" />
                            Restore / Merge Configuration
                        </h3>
                        <p className="text-sm text-gray-600 mb-6">
                            Upload a previously exported JSON backup to restore or merge accounts and access settings into this system.
                        </p>
                        <div className="relative">
                            <input
                                type="file"
                                accept=".json"
                                onChange={handleImport}
                                disabled={importLoading}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                            />
                            <button
                                disabled={importLoading}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-all font-medium shadow-sm"
                            >
                                {importLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                                {importLoading ? 'Processing Import...' : 'Upload & Restore'}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-100">
                    <div className="rounded-lg bg-blue-50/50 p-4 border border-blue-100">
                        <h4 className="text-sm font-semibold text-blue-900 flex items-center gap-2 mb-2">
                            <AlertCircle className="h-4 w-4" />
                            Security & Data Merging
                        </h4>
                        <ul className="text-xs text-blue-800 space-y-1.5 list-disc pl-4">
                            <li><strong>Users</strong> are matched by email address.</li>
                            <li><strong>Roles</strong> are matched by unique system name.</li>
                            <li>Existing records will be <strong>updated</strong>; missing records will be <strong>created</strong>.</li>
                            <li>Passwords are stored in hashed format and will be preserved upon restoration.</li>
                            <li>Relational links to <strong>Sales Representatives</strong> will be maintained.</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    )
}
