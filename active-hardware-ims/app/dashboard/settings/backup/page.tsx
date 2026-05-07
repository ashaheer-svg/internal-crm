"use client"

import { useState, useEffect } from "react"
import { Download, Upload, Database, AlertTriangle, CheckCircle, Info, Users, History, FileJson } from "lucide-react"
import Link from "next/link"
import { formatDateTime } from "@/lib/utils"
import BackButton from "@/components/BackButton"
import ConfirmModal from "@/components/ConfirmModal"

type BackupHistory = {
    id: string
    createdAt: string
    userName: string
    metadata: any
}

export default function BackupPage() {
    const [uploading, setUploading] = useState(false)
    const [downloading, setDownloading] = useState(false)
    const [resetting, setResetting] = useState(false)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [confirmRestore, setConfirmRestore] = useState(false)
    const [confirmReset, setConfirmReset] = useState(false)
    const [showResetDialog, setShowResetDialog] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const [backupHistory, setBackupHistory] = useState<BackupHistory[]>([])
    const [exportingCustomers, setExportingCustomers] = useState(false)
    const [importingCustomers, setImportingCustomers] = useState(false)
    const [customerFile, setCustomerFile] = useState<File | null>(null)

    // Validation State
    const [validating, setValidating] = useState(false)
    const [validationResult, setValidationResult] = useState<{
        tempId: string;
        stats: { users: number; customers: number; products: number; deliveryOrders: number };
        backupTimestamp: string;
        filename: string;
    } | null>(null)
    const [showValidationModal, setShowValidationModal] = useState(false)

    // Legacy Data Migration State
    const [importingLegacy, setImportingLegacy] = useState(false)
    const [legacyFile, setLegacyFile] = useState<File | null>(null)
    const [pendingImport, setPendingImport] = useState<null | { label: string; action: () => Promise<void> }>(null)


    useEffect(() => {
        fetchBackupHistory()
    }, [])

    async function fetchBackupHistory() {
        try {
            const res = await fetch('/api/audit-logs?action=BACKUP&limit=5')
            if (res.ok) {
                const data = await res.json()
                setBackupHistory(data.logs || [])
            }
        } catch (error) {
            console.error('Failed to fetch backup history:', error)
        }
    }

    async function handleDownloadBackup() {
        setDownloading(true)
        setMessage(null)

        try {
            const res = await fetch('/api/backup/download')

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Failed to download backup')
            }

            // Get filename from Content-Disposition header
            const contentDisposition = res.headers.get('Content-Disposition')
            const filenameMatch = contentDisposition?.match(/filename="(.+)"/)
            const filename = filenameMatch ? filenameMatch[1] : 'backup.db'

            // Download file
            const blob = await res.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = filename
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)

            setMessage({ type: 'success', text: 'Backup downloaded successfully!' })
            fetchBackupHistory() // Refresh history
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message })
        } finally {
            setDownloading(false)
        }
    }

    async function handleValidateBackup(file: File) {
        setValidating(true)
        setMessage(null)
        setValidationResult(null)

        try {
            const formData = new FormData()
            formData.append('file', file)

            const res = await fetch('/api/backup/validate', {
                method: 'POST',
                body: formData
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Failed to validate backup')
            }

            setValidationResult(data)
            setShowValidationModal(true)
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message })
            setSelectedFile(null)
        } finally {
            setValidating(false)
        }
    }

    async function handleRestoreBackup() {
        if (!confirmRestore) return

        setUploading(true)
        setMessage(null)

        try {
            const payload = validationResult?.tempId 
                ? { tempId: validationResult.tempId }
                : null;

            let res;
            if (payload) {
                res = await fetch('/api/backup/restore', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })
            } else {
                if (!selectedFile) return;
                const formData = new FormData()
                formData.append('file', selectedFile)
                res = await fetch('/api/backup/restore', {
                    method: 'POST',
                    body: formData
                })
            }

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Failed to restore backup')
            }

            setMessage({ type: 'success', text: data.message })
            setSelectedFile(null)
            setValidationResult(null)
            setShowValidationModal(false)
            setConfirmRestore(false)

            setTimeout(() => {
                window.location.reload()
            }, 2000)
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message })
        } finally {
            setUploading(false)
        }
    }

    function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (file) {
            if (!file.name.endsWith('.db') && !file.name.endsWith('.gz')) {
                setMessage({ type: 'error', text: 'Please select a .db or .db.gz file' })
                return
            }
            setSelectedFile(file)
            setConfirmRestore(false)
            setMessage(null)
            
            // Trigger Validation
            handleValidateBackup(file)
        }
    }

    async function handleResetDatabase() {
        if (!confirmReset) return

        setResetting(true)
        setMessage(null)

        try {
            const res = await fetch('/api/backup/reset', {
                method: 'POST'
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Failed to reset database')
            }

            setMessage({ type: 'success', text: data.message })
            setShowResetDialog(false)
            setConfirmReset(false)

            // Reload page after 3 seconds
            setTimeout(() => {
                window.location.href = '/login'
            }, 3000)
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message })
        } finally {
            setResetting(false)
        }
    }

    async function handleExportCustomers() {
        setExportingCustomers(true)
        setMessage(null)
        try {
            const res = await fetch('/api/backup/customers/export')
            if (!res.ok) throw new Error('Failed to export customers')

            const blob = await res.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `customers_backup_${new Date().toISOString().split('T')[0]}.json`
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)

            setMessage({ type: 'success', text: 'Customer data exported successfully!' })
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message })
        } finally {
            setExportingCustomers(false)
        }
    }

    function handleCustomerFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (file) {
            if (!file.name.endsWith('.json')) {
                setMessage({ type: 'error', text: 'Please select a .json file' })
                return
            }
            setCustomerFile(file)
            setMessage(null)
        }
    }

    async function handleImportCustomers() {
        if (!customerFile) return
        setPendingImport({
            label: `Import customers from ${customerFile.name}? Existing records with matching IDs will be updated.`,
            action: async () => {
                setImportingCustomers(true)
                setMessage(null)
                try {
                    const reader = new FileReader()
                    const fileContent = await new Promise((resolve, reject) => {
                        reader.onload = (e) => resolve(e.target?.result)
                        reader.onerror = () => reject(new Error('Failed to read file'))
                        reader.readAsText(customerFile)
                    })
                    const res = await fetch('/api/backup/customers/import', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ data: JSON.parse(fileContent as string).data })
                    })
                    const data = await res.json()
                    if (!res.ok) throw new Error(data.error || 'Failed to import customers')
                    setMessage({ type: 'success', text: data.message })
                    setCustomerFile(null)
                } catch (error: any) {
                    setMessage({ type: 'error', text: error.message })
                } finally {
                    setImportingCustomers(false)
                }
            }
        })
    }

    function handleLegacyFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (file) {
            if (!file.name.endsWith('.json')) {
                setMessage({ type: 'error', message: 'Please select a .json file' } as any)
                return
            }
            setLegacyFile(file)
            setMessage(null)
        }
    }

    async function handleImportLegacy() {
        if (!legacyFile) return
        setPendingImport({
            label: `Import legacy delivery orders from ${legacyFile.name}? This will create completed orders and mark items as SOLD.`,
            action: async () => {
                setImportingLegacy(true)
                setMessage(null)
                try {
                    const reader = new FileReader()
                    const fileContent = await new Promise((resolve, reject) => {
                        reader.onload = (e) => resolve(e.target?.result)
                        reader.onerror = () => reject(new Error('Failed to read file'))
                        reader.readAsText(legacyFile)
                    })
                    const res = await fetch('/api/backup/legacy-import', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ data: JSON.parse(fileContent as string).data })
                    })
                    const data = await res.json()
                    if (!res.ok) throw new Error(data.error || 'Failed to import legacy data')
                    setMessage({ type: 'success', text: data.message })
                    setLegacyFile(null)
                } catch (error: any) {
                    setMessage({ type: 'error', text: error.message })
                } finally {
                    setImportingLegacy(false)
                }
            }
        })
    }

    return (
        <div className="space-y-6">
            <ConfirmModal
                open={!!pendingImport}
                title="Confirm Import"
                message={pendingImport?.label ?? ''}
                variant="warning"
                onConfirm={async () => { const action = pendingImport?.action; setPendingImport(null); if (action) await action() }}
                onCancel={() => setPendingImport(null)}
            />

            {/* Validation & Stats Summary Modal */}
            {showValidationModal && validationResult && (
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <CheckCircle className="h-8 w-8 text-green-600" />
                            <h3 className="text-lg font-semibold text-gray-900">Backup Validated</h3>
                        </div>

                        <p className="text-sm text-gray-600 mb-4">
                            This backup file appears compatible. Please review the contents before restoring.
                        </p>

                        <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
                            <h4 className="text-sm font-bold text-gray-700 mb-2 border-b pb-1">Backup Details:</h4>
                            <ul className="text-xs space-y-1 text-gray-600 mb-3">
                                <li><strong>File:</strong> {validationResult.filename}</li>
                                <li><strong>Created At:</strong> {validationResult.backupTimestamp !== "Unknown" ? formatDateTime(validationResult.backupTimestamp) : "Unknown"}</li>
                            </ul>
                            
                            <h4 className="text-sm font-bold text-gray-700 mb-2 border-b pb-1">Data Volume Breakdown:</h4>
                            <ul className="text-xs space-y-2 text-gray-600">
                                <li className="flex justify-between"><span>👥 Users</span> <span className="font-bold">{validationResult.stats.users}</span></li>
                                <li className="flex justify-between"><span>🤝 Customers</span> <span className="font-bold">{validationResult.stats.customers}</span></li>
                                <li className="flex justify-between"><span>📦 Products</span> <span className="font-bold">{validationResult.stats.products}</span></li>
                                <li className="flex justify-between"><span>📋 Delivery Orders</span> <span className="font-bold">{validationResult.stats.deliveryOrders}</span></li>
                            </ul>
                        </div>

                        <div className="mb-4">
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={confirmRestore}
                                    onChange={(e) => setConfirmRestore(e.target.checked)}
                                    className="h-4 w-4 text-red-600 border-gray-300 rounded"
                                />
                                <span className="text-sm text-gray-700">
                                    I understand this will replace ALL current data
                                </span>
                            </label>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setShowValidationModal(false)
                                    setConfirmRestore(false)
                                    setSelectedFile(null)
                                }}
                                className="inline-flex items-center px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRestoreBackup}
                                disabled={!confirmRestore || uploading}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 text-sm font-medium text-white hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50"
                            >
                                {uploading ? 'Restoring...' : 'Confirm Restore'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <div>
                <BackButton className="mb-4" />
                <h1 className="text-2xl font-bold text-background">Database Backup & Restore</h1>
                <p className="text-sm text-gray-400 mt-1">Manage your database backups and restore operations</p>
            </div>

            {/* Message Display */}
            {message && (
                <div className={`p-4 rounded-md ${message.type === 'success'
                    ? 'bg-green-50 border border-green-200 text-green-800'
                    : 'bg-red-50 border border-red-200 text-red-800'
                    }`}>
                    <div className="flex items-center gap-2">
                        {message.type === 'success' ? (
                            <CheckCircle className="h-5 w-5" />
                        ) : (
                            <AlertTriangle className="h-5 w-5" />
                        )}
                        <span>{message.text}</span>
                    </div>
                </div>
            )}

            {/* Backup Section */}
            <div className="bg-white shadow rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Database className="h-6 w-6 text-blue-600" />
                    <h2 className="text-lg font-semibold text-gray-900">Create Backup</h2>
                </div>

                <p className="text-sm text-gray-600 mb-4">
                    Download a complete backup of your database. The file is compressed using gzip to reduce size and can be used to restore your system.
                </p>

                <button
                    onClick={handleDownloadBackup}
                    disabled={downloading}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Download className="h-4 w-4" />
                    {downloading ? 'Downloading...' : 'Download Backup'}
                </button>

                {/* Backup History */}
                {backupHistory.length > 0 && (
                    <div className="mt-6">
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Recent Backups</h3>
                        <div className="space-y-2">
                            {backupHistory.map((backup) => (
                                <div key={backup.id} className="text-sm text-gray-600 flex items-center gap-2">
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                    <span>
                                        {formatDateTime(backup.createdAt)} by {backup.userName}
                                        {backup.metadata?.filename && ` - ${backup.metadata.filename}`}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Restore Section */}
            <div className="bg-white shadow rounded-lg p-6 border-2 border-red-200">
                <div className="flex items-center gap-3 mb-4">
                    <Upload className="h-6 w-6 text-red-600" />
                    <h2 className="text-lg font-semibold text-gray-900">Restore from Backup</h2>
                </div>

                {/* Warning */}
                <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-red-800">
                            <p className="font-semibold mb-1">⚠️ WARNING: This action cannot be undone!</p>
                            <p>Restoring a backup will completely replace your current database. All existing data will be lost. A safety backup will be created automatically before restore.</p>
                        </div>
                    </div>
                </div>

                {/* File Upload */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Backup File (.db or .db.gz)
                    </label>
                    <input
                        type="file"
                        accept=".db,.gz"
                        onChange={handleFileSelect}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {selectedFile && (
                        <p className="text-sm text-gray-600 mt-2">
                            Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                        </p>
                    )}
                </div>

                {/* Confirmation Checkbox */}
                {selectedFile && (
                    <div className="mb-4">
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={confirmRestore}
                                onChange={(e) => setConfirmRestore(e.target.checked)}
                                className="h-4 w-4 text-red-600 border-gray-300 rounded"
                            />
                            <span className="text-sm text-gray-700">
                                I understand this will replace all current data
                            </span>
                        </label>
                    </div>
                )}

                {/* Restore Button */}
                <button
                    onClick={handleRestoreBackup}
                    disabled={!selectedFile || !confirmRestore || uploading}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-600 text-sm font-medium text-white hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Upload className="h-4 w-4" />
                    {uploading ? 'Restoring...' : 'Restore Database'}
                </button>
            </div>

            {/* Customer Data Backup & Restore Section */}
            <div className="bg-white shadow rounded-lg p-6 border-2 border-green-200">
                <div className="flex items-center gap-3 mb-4">
                    <Users className="h-6 w-6 text-green-600" />
                    <h2 className="text-lg font-semibold text-gray-900">Customer Data Portable Backup</h2>
                </div>

                <p className="text-sm text-gray-600 mb-6">
                    Export or import only Customer, Partner, and Supplier records. This is useful for migrating contact data without affecting inventory or transaction history.
                </p>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Export Section */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-gray-900 border-b pb-2">Export Customer Data</h3>
                        <p className="text-xs text-gray-500">Download all partners, employees, and addresses as a portable JSON file.</p>
                        <button
                            onClick={handleExportCustomers}
                            disabled={exportingCustomers}
                            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-green-600 text-sm font-medium text-white hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50"
                        >
                            <Download className="h-4 w-4" />
                            {exportingCustomers ? 'Exporting...' : 'Export Customers (JSON)'}
                        </button>
                    </div>

                    {/* Import Section */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-gray-900 border-b pb-2">Import Customer Data</h3>
                        <p className="text-xs text-gray-500">Upload a customers_export.json file to update or create partner records.</p>

                        <div className="flex flex-col gap-3">
                            <input
                                type="file"
                                accept=".json"
                                onChange={handleCustomerFileSelect}
                                className="block w-full text-xs text-gray-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                            />
                            {customerFile && (
                                <button
                                    onClick={handleImportCustomers}
                                    disabled={importingCustomers}
                                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-green-600 text-sm font-medium text-green-700 hover:bg-green-50 transition-colors shadow-sm disabled:opacity-50"
                                >
                                    <Upload className="h-4 w-4" />
                                    {importingCustomers ? 'Importing...' : `Import ${customerFile.name}`}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Legacy Data Migration Section */}
            <div className="bg-white shadow rounded-lg p-6 border-2 border-blue-200">
                <div className="flex items-center gap-3 mb-4">
                    <History className="h-6 w-6 text-blue-600" />
                    <h2 className="text-lg font-semibold text-gray-900">Legacy Data Migration (Orders & SNs)</h2>
                </div>

                <p className="text-sm text-gray-600 mb-6">
                    Import historical delivery orders to track past serial number movements and include old sales in profitability reports.
                    Use the <strong>Legacy Data Entry Form</strong> to prepare your data correctly.
                </p>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Entry Tool Section */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-gray-900 border-b pb-2">1. Prepare Import Data</h3>
                        <p className="text-xs text-gray-500">Manually enter historical orders and generate the migration JSON file.</p>
                        <Link
                            href="/dashboard/settings/backup/legacy-import"
                            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-blue-50 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors shadow-sm"
                        >
                            <FileJson className="h-4 w-4" />
                            Open Legacy Data Entry Form
                        </Link>
                    </div>

                    {/* Project Migration Section */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-gray-900 border-b pb-2">2. Legacy Project Migration</h3>
                        <p className="text-xs text-gray-500">Bulk import historical CRM projects with individual row approval.</p>
                        <Link
                            href="/dashboard/settings/backup/project-import"
                            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition-colors shadow-sm"
                        >
                            <Upload className="h-4 w-4" />
                            Open Legacy Project Importer
                        </Link>
                    </div>

                    {/* Import Section */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-gray-900 border-b pb-2">3. Import Legacy JSON File</h3>
                        <p className="text-xs text-gray-500">Upload the generated legacy_migration.json file to ingest historical records.</p>

                        <div className="flex flex-col gap-3">
                            <input
                                type="file"
                                accept=".json"
                                onChange={handleLegacyFileSelect}
                                className="block w-full text-xs text-gray-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            />
                            {legacyFile && (
                                <button
                                    onClick={handleImportLegacy}
                                    disabled={importingLegacy}
                                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
                                >
                                    <Upload className="h-4 w-4" />
                                    {importingLegacy ? 'Importing...' : `Import ${legacyFile.name}`}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Reset Database Section */}
            <div className="bg-white shadow rounded-lg p-6 border-2 border-orange-200">
                <div className="flex items-center gap-3 mb-4">
                    <AlertTriangle className="h-6 w-6 text-orange-600" />
                    <h2 className="text-lg font-semibold text-gray-900">Reset Database</h2>
                </div>

                <p className="text-sm text-gray-600 mb-4">
                    Reset the database to a clean state. This will delete ALL data and create a fresh database with only the default admin user.
                </p>

                <button
                    onClick={() => setShowResetDialog(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-orange-600 text-sm font-medium text-white hover:bg-orange-700 transition-colors shadow-sm"
                >
                    <AlertTriangle className="h-4 w-4" />
                    Reset Database
                </button>
            </div>

            {/* Reset Confirmation Dialog */}
            {showResetDialog && (
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <AlertTriangle className="h-8 w-8 text-orange-600" />
                            <h3 className="text-lg font-semibold text-gray-900">Reset Database?</h3>
                        </div>

                        <div className="bg-orange-50 border border-orange-200 rounded-md p-4 mb-4">
                            <p className="text-sm text-orange-800 font-semibold mb-2">
                                ⚠️ EXTREME CAUTION: This action is IRREVERSIBLE!
                            </p>
                            <p className="text-sm text-orange-800">
                                This will permanently delete:
                            </p>
                            <ul className="list-disc list-inside text-sm text-orange-800 mt-2 space-y-1">
                                <li>All customers</li>
                                <li>All products and inventory</li>
                                <li>All invoices and delivery orders</li>
                                <li>All GRNs and backorders</li>
                                <li>All users (except current admin)</li>
                                <li>All audit logs</li>
                            </ul>
                            <p className="text-sm text-orange-800 mt-2 font-semibold">
                                The database will be reset to factory defaults with admin credentials: admin@activehardware.com / Admin@123
                            </p>
                        </div>

                        <div className="mb-4">
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={confirmReset}
                                    onChange={(e) => setConfirmReset(e.target.checked)}
                                    className="h-4 w-4 text-orange-600 border-gray-300 rounded"
                                />
                                <span className="text-sm text-gray-700">
                                    I understand this will delete ALL data permanently
                                </span>
                            </label>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setShowResetDialog(false)
                                    setConfirmReset(false)
                                }}
                                className="inline-flex items-center px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleResetDatabase}
                                disabled={!confirmReset || resetting}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-orange-600 text-sm font-medium text-white hover:bg-orange-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {resetting ? 'Resetting...' : 'Reset Database'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Info className="h-6 w-6 text-blue-600" />
                    <h2 className="text-lg font-semibold text-gray-900">Instructions & Best Practices</h2>
                </div>

                <div className="space-y-4 text-sm text-gray-700">
                    <div>
                        <h3 className="font-semibold mb-2">📥 How to Create a Backup:</h3>
                        <ol className="list-decimal list-inside space-y-1 ml-2">
                            <li>Click the "Download Backup" button</li>
                            <li>Save the .db file to a safe location</li>
                            <li>Store backups in multiple locations (local + cloud)</li>
                        </ol>
                    </div>

                    <div>
                        <h3 className="font-semibold mb-2">📤 How to Restore from Backup:</h3>
                        <ol className="list-decimal list-inside space-y-1 ml-2">
                            <li>Click "Select Backup File" and choose your .db file</li>
                            <li>Read the warning carefully</li>
                            <li>Check the confirmation checkbox</li>
                            <li>Click "Restore Database"</li>
                            <li>Wait for the process to complete</li>
                            <li>The page will reload automatically</li>
                        </ol>
                    </div>

                    <div>
                        <h3 className="font-semibold mb-2">✅ Best Practices:</h3>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                            <li>Create backups regularly (daily or weekly recommended)</li>
                            <li>Test your backups by restoring in a development environment</li>
                            <li>Keep multiple backup versions (at least 3-5)</li>
                            <li>Store backups in a secure, separate location</li>
                            <li>Label backups with dates and descriptions</li>
                            <li>Verify backup file integrity before deleting old backups</li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="font-semibold mb-2">⚠️ Important Notes:</h3>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                            <li>Only ADMIN users can create and restore backups</li>
                            <li>All backup and restore operations are logged in Audit Logs</li>
                            <li>A safety backup is automatically created before each restore</li>
                            <li>The application will reload after a successful restore</li>
                            <li>Ensure no other users are making changes during restore</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    )
}
