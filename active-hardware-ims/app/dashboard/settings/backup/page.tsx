"use client"

import { useState, useEffect } from "react"
import { Download, Upload, Database, AlertTriangle, CheckCircle, Info } from "lucide-react"
import { formatDateTime } from "@/lib/utils"

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

    async function handleRestoreBackup() {
        if (!selectedFile || !confirmRestore) return

        setUploading(true)
        setMessage(null)

        try {
            const formData = new FormData()
            formData.append('file', selectedFile)

            const res = await fetch('/api/backup/restore', {
                method: 'POST',
                body: formData
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Failed to restore backup')
            }

            setMessage({ type: 'success', text: data.message })
            setSelectedFile(null)
            setConfirmRestore(false)

            // Reload page after 2 seconds
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

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Database Backup & Restore</h1>
                <p className="text-sm text-gray-600 mt-1">Manage your database backups and restore operations</p>
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
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Upload className="h-4 w-4" />
                    {uploading ? 'Restoring...' : 'Restore Database'}
                </button>
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
                    className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
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
                                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleResetDatabase}
                                disabled={!confirmReset || resetting}
                                className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
