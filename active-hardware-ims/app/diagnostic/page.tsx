'use client'

import { useEffect, useState } from 'react'
import { logoutAllUsers } from '@/app/actions/auth-actions'
import { Download, Trash2, RefreshCw, Activity, HardDrive, Cpu, Terminal, LogOut } from 'lucide-react'

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
