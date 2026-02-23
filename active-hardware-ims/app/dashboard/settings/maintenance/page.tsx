"use client"

import { useState, useEffect } from "react"
import {
    Activity, Shield, Database, Mail, Save, Download,
    Upload, AlertTriangle, CheckCircle, Loader2, Server,
    Cpu, HardDrive, RefreshCw, Send, Lock
} from "lucide-react"
import { formatDateTime, formatBytes } from "@/lib/utils"
import BackButton from "@/components/BackButton"

export default function MaintenanceDashboard() {
    // State for sections
    const [maintEnabled, setMaintEnabled] = useState(false)
    const [health, setHealth] = useState<any>(null)
    const [email, setEmail] = useState({
        host: '',
        port: '587',
        user: '',
        pass: '',
        secure: false,
        from: '',
        hasPassword: false
    })

    // UI State
    const [loading, setLoading] = useState(true)
    const [savingMaint, setSavingMaint] = useState(false)
    const [savingEmail, setSavingEmail] = useState(false)
    const [testLoading, setTestLoading] = useState(false)
    const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    // Backup States (Ported)
    const [dbLoading, setDbLoading] = useState(false)
    const [rbacLoading, setRbacLoading] = useState(false)

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [mRes, hRes, eRes] = await Promise.all([
                    fetch('/api/settings/maintenance'),
                    fetch('/api/settings/maintenance/health'),
                    fetch('/api/settings/email')
                ])

                if (mRes.ok) setMaintEnabled((await mRes.json()).enabled)
                if (hRes.ok) setHealth(await hRes.json())
                if (eRes.ok) {
                    const emailData = await eRes.json()
                    setEmail(prev => ({ ...prev, ...emailData }))
                }
            } catch (err) {
                console.error("Failed to fetch dashboard data", err)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    const handleSaveMaint = async (enabled: boolean) => {
        setSavingMaint(true)
        try {
            const res = await fetch('/api/settings/maintenance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled })
            })
            if (res.ok) {
                setMaintEnabled(enabled)
                setMsg({ type: 'success', text: `Maintenance mode ${enabled ? 'enabled' : 'disabled'}.` })
            }
        } catch (err) {
            setMsg({ type: 'error', text: "Failed to update maintenance status." })
        } finally {
            setSavingMaint(false)
        }
    }

    const handleSaveEmail = async (e: React.FormEvent) => {
        e.preventDefault()
        setSavingEmail(true)
        try {
            const res = await fetch('/api/settings/email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(email)
            })
            if (res.ok) {
                setMsg({ type: 'success', text: "Email configuration saved." })
                setEmail(prev => ({ ...prev, pass: '', hasPassword: !!email.pass || prev.hasPassword }))
            }
        } catch (err) {
            setMsg({ type: 'error', text: "Failed to save email settings." })
        } finally {
            setSavingEmail(false)
        }
    }

    // Backup Functions
    const downloadDbBackup = async () => {
        setDbLoading(true)
        try {
            const res = await fetch('/api/backup/download')
            if (!res.ok) throw new Error("Download failed")
            const blob = await res.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `full_db_backup_${new Date().toISOString().split('T')[0]}.db.gz`
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)
        } catch (err) {
            setMsg({ type: 'error', text: "Failed to download DB backup." })
        } finally {
            setDbLoading(false)
        }
    }

    const exportRbac = async () => {
        setRbacLoading(true)
        try {
            const res = await fetch('/api/settings/maintenance/export')
            if (!res.ok) throw new Error("Export failed")
            const blob = await res.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `rbac_config_${new Date().toISOString().split('T')[0]}.json`
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)
        } catch (err) {
            setMsg({ type: 'error', text: "Failed to export RBAC config." })
        } finally {
            setRbacLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        )
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
            <div className="flex items-center justify-between">
                <div>
                    <BackButton className="mb-4" />
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Activity className="h-6 w-6 text-blue-600" />
                        Maintenance & System Health
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Monitor system vitals and manage global availability.</p>
                </div>
                <button
                    onClick={() => window.location.reload()}
                    className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                >
                    <RefreshCw className="h-5 w-5" />
                </button>
            </div>

            {msg && (
                <div className={`p-4 rounded-xl flex items-center justify-between ${msg.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
                    }`}>
                    <div className="flex items-center gap-2">
                        {msg.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                        <span className="text-sm font-medium">{msg.text}</span>
                    </div>
                    <button onClick={() => setMsg(null)} className="text-xs font-bold opacity-50 hover:opacity-100">DISMISS</button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Status & Health Section */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Health Metrics Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <HealthCard
                            title="CPU Load"
                            icon={Cpu}
                            value={health?.system?.loadAvg ? `${health.system.loadAvg[0].toFixed(2)}` : 'N/A'}
                            sub={`Cores: ${health?.system?.cpus || '?'}`}
                            color="blue"
                        />
                        <HealthCard
                            title="Memory"
                            icon={Server}
                            value={health?.system?.memory ? formatBytes(health.system.memory.total - health.system.memory.free) : 'N/A'}
                            sub={`Total: ${health?.system?.memory ? formatBytes(health.system.memory.total) : '?'}`}
                            color="indigo"
                        />
                        <HealthCard
                            title="Database"
                            icon={HardDrive}
                            value={health?.database?.sizeBytes ? formatBytes(health.database.sizeBytes) : 'N/A'}
                            sub={health?.database?.status === 'CONNECTED' ? 'Healthy' : 'Disconnected'}
                            color={health?.database?.status === 'CONNECTED' ? 'green' : 'red'}
                            status={health?.database?.status}
                        />
                    </div>

                    {/* Availability Toggle Section */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex items-center justify-between">
                        <div className="flex items-start gap-4">
                            <div className={`p-3 rounded-xl ${maintEnabled ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                                <Lock className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900">Application Availability</h3>
                                <p className="text-sm text-gray-500 max-w-md">
                                    When enabled, all non-admin users will be redirected to the maintenance page.
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={maintEnabled}
                                    onChange={(e) => handleSaveMaint(e.target.checked)}
                                    disabled={savingMaint}
                                />
                                <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                            <span className={`text-xs font-bold uppercase tracking-wider ${maintEnabled ? 'text-orange-600' : 'text-green-600'}`}>
                                {maintEnabled ? 'Maintenance Active' : 'Publicly Available'}
                            </span>
                        </div>
                    </div>

                    {/* Email Configuration */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex items-center gap-3">
                            <Mail className="h-5 w-5 text-gray-400" />
                            <h3 className="font-bold text-gray-900">Outbound Email (SMTP)</h3>
                        </div>
                        <form onSubmit={handleSaveEmail} className="p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-500">SMTP Host</label>
                                    <input
                                        type="text" value={email.host} onChange={e => setEmail({ ...email, host: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                                        placeholder="e.g. smtp.gmail.com"
                                    />
                                </div>
                                <div className="space-y-1 text-right">
                                    <label className="text-xs font-semibold text-gray-500">Port</label>
                                    <input
                                        type="text" value={email.port} onChange={e => setEmail({ ...email, port: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all text-right"
                                        placeholder="587"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-500">Username</label>
                                    <input
                                        type="text" value={email.user} onChange={e => setEmail({ ...email, user: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-500">Password {email.hasPassword && <span className="text-blue-500">(Set)</span>}</label>
                                    <input
                                        type="password" value={email.pass} onChange={e => setEmail({ ...email, pass: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                                        placeholder="••••••••"
                                    />
                                </div>
                                <div className="md:col-span-2 space-y-1">
                                    <label className="text-xs font-semibold text-gray-500">Sender Address (From)</label>
                                    <input
                                        type="email" value={email.from} onChange={e => setEmail({ ...email, from: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                                        placeholder="noreply@yourdomain.com"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center justify-between pt-4">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <input
                                        type="checkbox" checked={email.secure} onChange={e => setEmail({ ...email, secure: e.target.checked })}
                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">Use SSL/TLS Security</span>
                                </label>
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        disabled={testLoading}
                                        className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-all flex items-center gap-2"
                                    >
                                        <Send className="h-4 w-4" />
                                        Test
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={savingEmail}
                                        className="px-6 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all shadow-sm flex items-center gap-2"
                                    >
                                        {savingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                        Save Changes
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Backup & Tools Sidebar */}
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex items-center gap-3 bg-slate-50/50">
                            <Shield className="h-5 w-5 text-gray-400" />
                            <h3 className="font-bold text-gray-900 text-sm italic">SYSTEM INTEGRITY</h3>
                        </div>
                        <div className="p-6 space-y-6">
                            {/* DB Backup */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Full Database</h4>
                                <div className="space-y-2">
                                    <button
                                        onClick={downloadDbBackup}
                                        disabled={dbLoading}
                                        className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-xl hover:border-blue-500 hover:text-blue-600 transition-all group shadow-sm"
                                    >
                                        <div className="flex items-center gap-3 text-sm font-medium">
                                            <Download className="h-5 w-5 text-blue-500 group-hover:scale-110 transition-transform" />
                                            Backup .db file
                                        </div>
                                        {dbLoading && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
                                    </button>
                                </div>
                                <p className="text-[10px] text-gray-400 leading-tight">
                                    Downloads the master SQLite file compressed with GZIP. Recommended for full recovery.
                                </p>
                            </div>

                            {/* RBAC Backup */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Users & Permissions</h4>
                                <div className="space-y-2">
                                    <button
                                        onClick={exportRbac}
                                        disabled={rbacLoading}
                                        className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-xl hover:border-orange-500 hover:text-orange-600 transition-all group shadow-sm"
                                    >
                                        <div className="flex items-center gap-3 text-sm font-medium">
                                            <Download className="h-5 w-5 text-orange-500 group-hover:scale-110 transition-transform" />
                                            Export JSON config
                                        </div>
                                        {rbacLoading && <Loader2 className="h-4 w-4 animate-spin text-orange-500" />}
                                    </button>
                                </div>
                                <p className="text-[10px] text-gray-400 leading-tight">
                                    JSON format including Users, Roles, and Permission matrices. Ideal for cross-instance migration.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats Card */}
                    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Activity className="h-24 w-24" />
                        </div>
                        <div className="relative z-10 space-y-4">
                            <h4 className="text-sm font-medium opacity-80 uppercase tracking-wider">System Info</h4>
                            <div className="space-y-3">
                                <div className="flex justify-between text-xs pb-2 border-b border-white/10 italic">
                                    <span className="opacity-60">Platform</span>
                                    <span className="font-semibold">{health?.system?.platform} {health?.system?.arch}</span>
                                </div>
                                <div className="flex justify-between text-xs pb-2 border-b border-white/10 italic">
                                    <span className="opacity-60">Node.js</span>
                                    <span className="font-semibold">{health?.system?.nodeVersion}</span>
                                </div>
                                <div className="flex justify-between text-xs pt-1 italic">
                                    <span className="opacity-60">Uptime</span>
                                    <span className="font-semibold">{Math.floor((health?.system?.uptime || 0) / 3600)} Hours</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

function HealthCard({ title, icon: Icon, value, sub, color, status }: any) {
    const colors: any = {
        blue: 'text-blue-600 bg-blue-50 border-blue-100',
        indigo: 'text-indigo-600 bg-indigo-50 border-indigo-100',
        green: 'text-green-600 bg-green-50 border-green-100',
        red: 'text-red-600 bg-red-50 border-red-100',
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 space-y-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
                <div className={`p-2.5 rounded-xl ${colors[color]} border shadow-sm`}>
                    <Icon className="h-5 w-5" />
                </div>
                {status && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${status === 'CONNECTED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                        {status}
                    </span>
                )}
            </div>
            <div>
                <h4 className="text-2xl font-black text-gray-900 tracking-tight">{value}</h4>
                <p className="text-xs font-bold text-gray-400 flex items-center justify-between pt-1 uppercase">
                    <span>{title}</span>
                    <span className="text-[10px] font-medium">{sub}</span>
                </p>
            </div>
        </div>
    )
}
