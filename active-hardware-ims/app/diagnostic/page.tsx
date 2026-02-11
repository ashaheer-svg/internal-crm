'use client'

import { useEffect, useState } from 'react'
import { logoutAllUsers } from '@/app/actions/auth-actions'
import { Download, Trash2, RefreshCw, Activity, HardDrive, Cpu, Terminal, LogOut, Database, RotateCcw, CheckCircle, Wrench, ChevronLeft, ChevronRight, Edit, Save, X, RefreshCcw as RefreshIcon } from 'lucide-react'

export default function DiagnosticPage() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [cleanupResult, setCleanupResult] = useState<any>(null)
    const [cleaning, setCleaning] = useState(false)

    async function handleLogoutAll() {
        if (!confirm("Are you sure you want to log out ALL users? This will invalidate all active sessions immediately.")) {
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

    async function handleCleanup() {
        if (!confirm("Run system cleanup? This will optimize the database (VACUUM) and clear temp files.")) return

        setCleaning(true)
        setCleanupResult(null)
        try {
            const res = await fetch('/api/diagnostic/cleanup', { method: 'POST' })
            const result = await res.json()
            setCleanupResult(result)
        } catch (e: any) {
            setCleanupResult({ success: false, message: e.message })
        } finally {
            setCleaning(false)
        }
    }

    useEffect(() => {
        fetch('/api/diagnostic')
            .then(res => res.json())
            .then(data => {
                setData(data)
                setLoading(false)
            })
            .catch(err => {
                setData({ error: err.message })
                setLoading(false)
            })
    }, [])

    if (loading) {
        return (
            <div style={{ padding: '20px', fontFamily: 'monospace' }}>
                <h1>🔍 System Diagnostics</h1>
                <p>Loading...</p>
            </div>
        )
    }

    const isHealthy = data?.overallStatus?.healthy

    return (
        <div style={{ padding: '20px', fontFamily: 'monospace', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header & Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    🔍 System Diagnostics
                </h1>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <a
                        href="/api/diagnostic/download-db"
                        style={{
                            display: 'flex', alignItems: 'center', gap: '5px',
                            padding: '8px 16px',
                            backgroundColor: '#0d6efd',
                            color: 'white',
                            textDecoration: 'none',
                            borderRadius: '4px',
                            fontSize: '14px',
                            fontWeight: 'bold'
                        }}
                    >
                        <Download size={16} /> Download DB
                    </a>
                    <button
                        onClick={handleCleanup}
                        disabled={cleaning}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '5px',
                            padding: '8px 16px',
                            backgroundColor: '#ffc107',
                            color: '#000',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            opacity: cleaning ? 0.7 : 1
                        }}
                    >
                        {cleaning ? <RefreshCw size={16} className="animate-spin" /> : <Trash2 size={16} />}
                        {cleaning ? 'Cleaning...' : 'Cleanup System'}
                    </button>
                    <button
                        onClick={handleLogoutAll}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '5px',
                            padding: '8px 16px',
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 'bold'
                        }}
                    >
                        <LogOut size={16} /> Logout All
                    </button>
                </div>
            </div>

            {/* Cleanup Result */}
            {cleanupResult && (
                <div style={{
                    padding: '15px', marginBottom: '20px',
                    backgroundColor: cleanupResult.success ? '#d1e7dd' : '#f8d7da',
                    color: cleanupResult.success ? '#0f5132' : '#842029',
                    border: `1px solid ${cleanupResult.success ? '#badbcc' : '#f5c2c7'}`,
                    borderRadius: '4px'
                }}>
                    <strong>{cleanupResult.message}</strong>
                    {cleanupResult.details && (
                        <ul style={{ margin: '5px 0 0 0', paddingLeft: '20px', fontSize: '13px' }}>
                            {cleanupResult.details.map((d: string, i: number) => <li key={i}>{d}</li>)}
                        </ul>
                    )}
                </div>
            )}

            {/* Database Management Tools */}
            <DbToolsSection />

            {/* Table Manager */}
            <TableManager />

            <p style={{ color: '#666' }}>Generated: {data?.timestamp}</p>

            {/* System Stats Section */}
            {data?.system && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px', marginBottom: '20px' }}>
                    <StatCard
                        title="Memory Usage"
                        icon={<Activity size={18} />}
                        value={`${(data.system.memory.used / 1024 / 1024 / 1024).toFixed(2)} GB / ${(data.system.memory.total / 1024 / 1024 / 1024).toFixed(2)} GB`}
                        subtext={`${data.system.memory.percentUsed}% Used`}
                        color={data.system.memory.percentUsed > 90 ? '#dc3545' : '#198754'}
                    />
                    <StatCard
                        title="Disk Space"
                        icon={<HardDrive size={18} />}
                        value={data.system.disk.error ? 'Error' : `${(data.system.disk.free / 1024 / 1024 / 1024).toFixed(2)} GB Free`}
                        subtext={data.system.disk.error ? data.system.disk.error : `${data.system.disk.percentFree}% Free of ${(data.system.disk.total / 1024 / 1024 / 1024).toFixed(2)} GB`}
                        color={!data.system.disk.error && data.system.disk.percentFree < 10 ? '#dc3545' : '#0d6efd'}
                    />
                    <StatCard
                        title="System Load"
                        icon={<Cpu size={18} />}
                        value={JSON.stringify(data.system.loadAvg)}
                        subtext={`Uptime: ${(data.system.uptime / 3600).toFixed(1)} hrs`}
                        color="#6610f2"
                    />
                </div>
            )}

            {/* Top Processes */}
            {data?.system?.top && (
                <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Terminal size={18} /> Top Processes
                    </h3>
                    <pre style={{
                        backgroundColor: '#212529',
                        color: '#00ff00',
                        padding: '15px',
                        borderRadius: '5px',
                        overflow: 'auto',
                        fontSize: '12px',
                        maxHeight: '300px'
                    }}>
                        {data.system.top}
                    </pre>
                </div>
            )}

            {/* Overall Status */}
            <div style={{
                padding: '20px',
                marginBottom: '20px',
                backgroundColor: isHealthy ? '#d4edda' : '#f8d7da',
                border: `2px solid ${isHealthy ? '#28a745' : '#dc3545'}`,
                borderRadius: '8px'
            }}>
                <h2 style={{ margin: '0 0 10px 0' }}>
                    {isHealthy ? '✅ System Healthy' : '❌ Issues Detected'}
                </h2>
                {data?.overallStatus?.issues?.length > 0 && (
                    <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
                        {data.overallStatus.issues.map((issue: string, i: number) => (
                            <li key={i} style={{ color: '#721c24' }}>{issue}</li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Recommendations */}
            {data?.recommendations?.length > 0 && (
                <div style={{
                    padding: '20px',
                    marginBottom: '20px',
                    backgroundColor: '#fff3cd',
                    border: '2px solid #ffc107',
                    borderRadius: '8px'
                }}>
                    <h2 style={{ margin: '0 0 10px 0' }}>💡 Recommendations</h2>
                    <ol style={{ margin: '10px 0', paddingLeft: '20px' }}>
                        {data.recommendations.map((rec: string, i: number) => (
                            <li key={i} style={{ marginBottom: '5px' }}>{rec}</li>
                        ))}
                    </ol>
                </div>
            )}

            {/* Detailed Checks */}
            <h2>Detailed Checks</h2>
            {/* Environment */}
            <CheckSection title="Environment Variables" data={data?.checks?.environment} />
            {/* Database File */}
            <CheckSection title="Database File" data={data?.checks?.database} />
            {/* Database Connection */}
            <CheckSection title="Database Connection" data={data?.checks?.databaseConnection} />
            {/* User Table */}
            <CheckSection title="User Table" data={data?.checks?.userTable} />
            {/* Admin User */}
            <CheckSection title="Admin User" data={data?.checks?.adminUser} />
            {/* Tables */}
            <CheckSection title="Database Tables" data={data?.checks?.tables} />
            {/* Prisma Schema */}
            <CheckSection title="Prisma Schema" data={data?.checks?.prismaSchema} />
            {/* Migrations */}
            <CheckSection title="Migrations" data={data?.checks?.migrations} />

            {/* Raw JSON */}
            <details style={{ marginTop: '30px' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                    📄 View Raw JSON
                </summary>
                <pre style={{
                    backgroundColor: '#f5f5f5',
                    padding: '15px',
                    borderRadius: '5px',
                    overflow: 'auto',
                    fontSize: '12px'
                }}>
                    {JSON.stringify(data, null, 2)}
                </pre>
            </details>
        </div>
    )
}

function StatCard({ title, value, subtext, icon, color }: any) {
    return (
        <div style={{
            padding: '15px',
            backgroundColor: 'white',
            border: '1px solid #dee2e6',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px', color: '#666', fontWeight: 'bold', fontSize: '0.9rem' }}>
                {icon} {title}
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: color }}>
                {value}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#888' }}>
                {subtext}
            </div>
        </div>
    )
}

function CheckSection({ title, data }: { title: string, data: any }) {
    return (
        <div style={{
            marginBottom: '20px',
            padding: '15px',
            backgroundColor: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '5px'
        }}>
            <h3 style={{ margin: '0 0 10px 0' }}>{title}</h3>
            <pre style={{
                margin: 0,
                fontSize: '13px',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
            }}>
                {JSON.stringify(data, null, 2)}
            </pre>
        </div>
    )
}

function DbToolsSection() {
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
    const [output, setOutput] = useState<string>('')
    const [activeAction, setActiveAction] = useState<string>('')

    async function handleAction(action: 'reset' | 'check' | 'fix' | 'restore-admin') {
        if (action === 'reset') {
            const confirmed = confirm("⚠️ DANGER: This will delete ALL data and reset the database to factory defaults.\\n\\nAre you absolutely sure?")
            if (!confirmed) return
            const doubleConfirmed = prompt("Type 'RESET' to confirm deletion:")
            if (doubleConfirmed !== 'RESET') return
        }
        if (action === 'restore-admin') {
            if (!confirm("This will reset the 'admin@activehardware.com' user's password to 'Admin@123'. Existing data will be preserved.")) return
        }

        setStatus('loading')
        setActiveAction(action)
        setOutput(`Running ${action}...`)

        try {
            const res = await fetch('/api/diagnostic/db-tools', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action })
            })
            const data = await res.json()

            setStatus(res.ok ? 'success' : 'error')
            setOutput(data.output || data.message || data.error || 'Operation success')
        } catch (error: any) {
            setStatus('error')
            setOutput(`Error: ${error.message}`)
        } finally {
            setActiveAction('')
        }
    }

    return (
        <div style={{ marginBottom: '20px', padding: '20px', backgroundColor: '#e9ecef', borderRadius: '8px', border: '1px solid #ced4da' }}>
            <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Database size={20} /> Database Management Tools
            </h3>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '15px' }}>
                <button
                    onClick={() => handleAction('reset')}
                    disabled={activeAction !== ''}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '10px 20px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        opacity: activeAction ? 0.6 : 1
                    }}
                >
                    <RotateCcw size={16} /> Reset DB (Default User)
                </button>
                <button
                    onClick={() => handleAction('check')}
                    disabled={activeAction !== ''}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '10px 20px',
                        backgroundColor: '#0d6efd',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        opacity: activeAction ? 0.6 : 1
                    }}
                >
                    <CheckCircle size={16} /> Check DB Sync
                </button>
                <button
                    onClick={() => handleAction('fix')}
                    disabled={activeAction !== ''}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '10px 20px',
                        backgroundColor: '#fd7e14',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        opacity: activeAction ? 0.6 : 1
                    }}
                >
                    <Wrench size={16} /> Fix/Migrate DB
                </button>
                <button
                    onClick={() => handleAction('restore-admin')}
                    disabled={activeAction !== ''}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '10px 20px',
                        backgroundColor: '#198754',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        opacity: activeAction ? 0.6 : 1
                    }}
                >
                    <CheckCircle size={16} /> Restore Admin (Keep Data)
                </button>
            </div>

            {/* Output Console */}
            <div style={{
                backgroundColor: '#212529',
                color: '#f8f9fa',
                padding: '15px',
                borderRadius: '5px',
                fontFamily: 'monospace',
                fontSize: '13px',
                minHeight: '100px',
                maxHeight: '300px',
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                border: status === 'error' ? '1px solid #dc3545' : status === 'success' ? '1px solid #198754' : '1px solid #495057'
            }}>
                {output || 'Ready to run database operations...'}
            </div>
        </div>
    )
}

function TableManager() {
    const [models, setModels] = useState<string[]>([])
    const [selectedModel, setSelectedModel] = useState<string>('')
    const [records, setRecords] = useState<any[]>([])
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [loading, setLoading] = useState(false)
    const [editingRecord, setEditingRecord] = useState<any>(null)
    const [editJson, setEditJson] = useState('')

    useEffect(() => {
        // Load models
        fetch('/api/diagnostic/models')
            .then(res => res.json())
            .then(data => {
                if (data.models) setModels(data.models)
            })
    }, [])

    useEffect(() => {
        if (selectedModel) {
            loadRecords(1)
        } else {
            setRecords([])
        }
    }, [selectedModel])

    function loadRecords(p: number) {
        setLoading(true)
        fetch(`/api/diagnostic/models?model=${selectedModel}&page=${p}`)
            .then(res => res.json())
            .then(data => {
                if (data.data) {
                    setRecords(data.data)
                    setPage(data.page)
                    setTotalPages(data.totalPages)
                }
            })
            .finally(() => setLoading(false))
    }

    function handleEdit(record: any) {
        setEditingRecord(record)
        setEditJson(JSON.stringify(record, null, 2))
    }

    async function handleSave() {
        try {
            const data = JSON.parse(editJson)
            // Remove ID from data payload if it exists, strict update
            const { id, ...updateData } = data
            // Also remove createdAt/updatedAt if present as they are auto-managed usually,
            // but for "admin fix" maybe we want to force them? 
            // Prisma complains if we update unsettable fields. 
            // Better to let user manually remove fields they don't want to update from the JSON.
            // But ID is definitely immutable in update query usually.

            const res = await fetch('/api/diagnostic/models', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: selectedModel,
                    id: editingRecord.id,
                    data: updateData
                })
            })

            if (res.ok) {
                alert('Record updated!')
                setEditingRecord(null)
                loadRecords(page)
            } else {
                const err = await res.json()
                alert('Error: ' + err.error)
            }
        } catch (e: any) {
            alert('Invalid JSON: ' + e.message)
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Are you sure you want to delete this record?')) return
        const res = await fetch(`/api/diagnostic/models?model=${selectedModel}&id=${id}`, {
            method: 'DELETE'
        })
        if (res.ok) {
            loadRecords(page)
        } else {
            alert('Failed to delete')
        }
    }

    return (
        <div style={{ marginBottom: '20px', padding: '20px', backgroundColor: '#e9ecef', borderRadius: '8px', border: '1px solid #ced4da' }}>
            <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={20} /> Table Manager
            </h3>

            <div style={{ marginBottom: '15px' }}>
                <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', minWidth: '200px' }}
                >
                    <option value="">Select a Table...</option>
                    {models.map(m => (
                        <option key={m} value={m}>{m}</option>
                    ))}
                </select>
                <button
                    onClick={() => loadRecords(page)}
                    disabled={!selectedModel}
                    style={{ marginLeft: '10px', padding: '8px', cursor: 'pointer' }}
                >
                    <RefreshIcon size={16} />
                </button>
            </div>

            {selectedModel && (
                <>
                    <div style={{ overflowX: 'auto', backgroundColor: 'white', borderRadius: '4px', border: '1px solid #dee2e6' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                                    <th style={{ padding: '8px', textAlign: 'left' }}>Actions</th>
                                    <th style={{ padding: '8px', textAlign: 'left' }}>ID</th>
                                    <th style={{ padding: '8px', textAlign: 'left' }}>Data Preview</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={3} style={{ padding: '20px', textAlign: 'center' }}>Loading...</td></tr>
                                ) : records.length === 0 ? (
                                    <tr><td colSpan={3} style={{ padding: '20px', textAlign: 'center' }}>No records found</td></tr>
                                ) : (
                                    records.map(r => (
                                        <tr key={r.id || JSON.stringify(r)} style={{ borderBottom: '1px solid #dee2e6' }}>
                                            <td style={{ padding: '8px', whiteSpace: 'nowrap' }}>
                                                <button onClick={() => handleEdit(r)} style={{ marginRight: '5px', color: '#0d6efd', background: 'none', border: 'none', cursor: 'pointer' }}>
                                                    <Edit size={16} />
                                                </button>
                                                <button onClick={() => handleDelete(r.id)} style={{ color: '#dc3545', background: 'none', border: 'none', cursor: 'pointer' }}>
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                            <td style={{ padding: '8px', fontFamily: 'monospace' }}>{r.id?.substring(0, 8)}...</td>
                                            <td style={{ padding: '8px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {JSON.stringify(r)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px' }}>
                        <button
                            disabled={page <= 1}
                            onClick={() => loadRecords(page - 1)}
                            style={{ padding: '5px 10px', cursor: 'pointer' }}
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span>Page {page} of {totalPages}</span>
                        <button
                            disabled={page >= totalPages}
                            onClick={() => loadRecords(page + 1)}
                            style={{ padding: '5px 10px', cursor: 'pointer' }}
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </>
            )}

            {/* Edit Modal / Overlay */}
            {editingRecord && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: 'white', padding: '20px', borderRadius: '8px',
                        width: '80%', maxWidth: '800px', maxHeight: '90%', display: 'flex', flexDirection: 'column'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                            <h3 style={{ margin: 0 }}>Edit Record ({selectedModel})</h3>
                            <button onClick={() => setEditingRecord(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                <X size={24} />
                            </button>
                        </div>
                        <div style={{ flex: 1, marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
                            <p style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>
                                Edit the JSON below. Be careful with types (e.g. booleans, numbers). ID fields are ignored on update.
                            </p>
                            <textarea
                                value={editJson}
                                onChange={(e) => setEditJson(e.target.value)}
                                style={{
                                    flex: 1, width: '100%', fontFamily: 'monospace', fontSize: '14px',
                                    padding: '10px', border: '1px solid #ccc', borderRadius: '4px', resize: 'none',
                                    minHeight: '400px'
                                }}
                            />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button
                                onClick={() => setEditingRecord(null)}
                                style={{ padding: '8px 16px', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', background: 'white' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                style={{
                                    padding: '8px 16px', borderRadius: '4px', cursor: 'pointer',
                                    background: '#0d6efd', color: 'white', border: 'none',
                                    display: 'flex', alignItems: 'center', gap: '5px'
                                }}
                            >
                                <Save size={16} /> Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
