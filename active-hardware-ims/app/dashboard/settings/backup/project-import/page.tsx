"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import {
    Upload,
    Check,
    X,
    AlertCircle,
    CheckCircle2,
    FileText,
    Trash2,
    ShieldCheck,
    Users,
    Briefcase,
    Download,
    ClipboardPaste,
    LayoutDashboard,
    ArrowRight
} from "lucide-react"
import { useRouter } from "next/navigation"
import BackButton from "@/components/BackButton"
import FormattedNumberInput from "@/components/FormattedNumberInput"
import { cn } from "@/lib/utils"
import Papa from "papaparse"
import * as XLSX from "xlsx"

type LegacyProjectRow = {
    id: string
    date: string
    customerName: string
    partnerName?: string
    brand?: string
    salesRepName?: string
    value: number
    stage: string // WON, LEAD, etc.
    approved: boolean
}

type Status = { type: 'success' | 'error' | 'info', message: string } | null

export default function ProjectImportPage() {
    const router = useRouter()
    const [pasteText, setPasteText] = useState("")
    const [rows, setRows] = useState<LegacyProjectRow[]>([])
    const [loading, setLoading] = useState(false)
    const [importing, setImporting] = useState(false)
    const [status, setStatus] = useState<Status>(null)
    const [pipelines, setPipelines] = useState<any[]>([])
    const [selectedPipelineId, setSelectedPipelineId] = useState("")
    const [defaultValue, setDefaultValue] = useState(0)
    const [view, setView] = useState<'setup' | 'preview'>('setup')
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        fetchPipelines()
    }, [])

    useEffect(() => {
        if (rows.length > 0) {
            setView('preview')
        } else {
            setView('setup')
        }
    }, [rows.length])

    async function fetchPipelines() {
        try {
            const res = await fetch('/api/crm/pipelines')
            if (res.ok) {
                const data = await res.json()
                setPipelines(data)
                if (data.length > 0) {
                    const defaultP = data.find((p: any) => p.isDefault) || data[0]
                    setSelectedPipelineId(defaultP.id)
                }
            }
        } catch (e) {
            console.error("Failed to fetch pipelines", e)
        }
    }

    function generateId() {
        return Math.random().toString(36).substring(2, 11)
    }

    async function handleDownloadTemplate() {
        try {
            const res = await fetch('/api/crm/projects/import')
            if (!res.ok) throw new Error('Failed to download template')
            const blob = await res.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = 'legacy_project_import_template.csv'
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)
        } catch (error: any) {
            setStatus({ type: 'error', message: error.message })
        }
    }

    function handleParseClipboard() {
        if (!pasteText.trim()) return
        const newRows = parseDataString(pasteText)
        if (newRows.length > 0) {
            setRows(prev => [...prev, ...newRows])
            setPasteText("")
            setStatus({ type: 'success', message: `Processed ${newRows.length} projects.` })
        }
    }

    function parseDataString(text: string): LegacyProjectRow[] {
        const lines = text.trim().split('\n')
        const newRows: LegacyProjectRow[] = []
        lines.forEach(line => {
            const parts = line.includes('\t') ? line.split('\t') : line.split(',')
            if (parts.length < 2) return
            const [date, customer, partner, brand, rep, stage, val] = parts.map(p => p.trim())
            newRows.push({
                id: generateId(),
                date: date || new Date().toISOString().split('T')[0],
                customerName: customer || "",
                partnerName: partner || "",
                brand: brand || "",
                salesRepName: rep || "",
                stage: (stage || "Lead").toUpperCase(),
                value: parseFloat(val) || defaultValue,
                approved: true
            })
        })
        return newRows
    }

    function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        setStatus({ type: 'info', message: `Reading ${file.name}...` })

        if (file.name.endsWith('.csv')) {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    const parsedRows = results.data.map((item: any) => ({
                        id: generateId(),
                        date: item.date || new Date().toISOString().split('T')[0],
                        customerName: item.customerName || "",
                        partnerName: item.partnerName || "",
                        brand: item.brand || "",
                        salesRepName: item.salesRepName || "",
                        stage: (item.stage || "Lead").toUpperCase(),
                        value: parseFloat(item.value) || defaultValue,
                        approved: true
                    }))
                    setRows(prev => [...prev, ...parsedRows])
                    setStatus({ type: 'success', message: `Imported ${parsedRows.length} rows.` })
                },
                error: (err) => setStatus({ type: 'error', message: err.message })
            })
        } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
            const reader = new FileReader()
            reader.onload = (evt) => {
                try {
                    const bstr = evt.target?.result
                    const wb = XLSX.read(bstr, { type: 'binary' })
                    const ws = wb.Sheets[wb.SheetNames[0]]
                    const data = XLSX.utils.sheet_to_json(ws) as any[]
                    const parsedRows = data.map(item => ({
                        id: generateId(),
                        date: item.date || new Date().toISOString().split('T')[0],
                        customerName: item.customerName || "",
                        partnerName: item.partnerName || "",
                        brand: item.brand || "",
                        salesRepName: item.salesRepName || "",
                        stage: (item.stage || "Lead").toUpperCase(),
                        value: parseFloat(item.value) || defaultValue,
                        approved: true
                    }))
                    setRows(prev => [...prev, ...parsedRows])
                    setStatus({ type: 'success', message: `Imported ${parsedRows.length} rows.` })
                } catch (err: any) {
                    setStatus({ type: 'error', message: err.message })
                }
            }
            reader.readAsBinaryString(file)
        }
        if (fileInputRef.current) fileInputRef.current.value = ""
    }

    async function handleFinalImport() {
        const approvedRows = rows.filter(r => r.approved)
        if (approvedRows.length === 0) return
        setImporting(true)
        try {
            const res = await fetch('/api/crm/projects/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projects: approvedRows, pipelineId: selectedPipelineId })
            })
            const result = await res.json()
            if (!res.ok) throw new Error(result.error)
            setStatus({ type: 'success', message: result.message })
            setRows(rows.filter(r => !r.approved))
        } catch (error: any) {
            setStatus({ type: 'error', message: error.message })
        } finally {
            setImporting(false)
        }
    }

    const stats = useMemo(() => ({
        total: rows.length,
        approved: rows.filter(r => r.approved).length,
        value: rows.filter(r => r.approved).reduce((acc, curr) => acc + curr.value, 0)
    }), [rows])

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 pb-20 px-4 sm:px-6">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-5">
                    <div className="p-3 bg-blue-50 rounded-2xl">
                        <LayoutDashboard className="w-8 h-8 text-blue-600" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Legacy Project Importer</h1>
                        <p className="text-sm text-gray-500 font-bold tracking-tight">Mass-import historical data with granular approval control</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <div className="bg-gray-50 px-4 py-2 rounded-2xl border border-gray-100">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Target Pipeline</span>
                        <select
                            className="text-sm font-black bg-transparent outline-none text-gray-900 pr-4"
                            value={selectedPipelineId}
                            onChange={(e) => setSelectedPipelineId(e.target.value)}
                        >
                            {pipelines.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={handleFinalImport}
                        disabled={importing || stats.approved === 0}
                        className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-emerald-600 text-white text-sm font-black hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                    >
                        <ShieldCheck className="w-5 h-5" />
                        Execute Import ({stats.approved})
                    </button>

                    {rows.length > 0 && (
                        <button
                            onClick={() => setRows([])}
                            className="p-4 rounded-2xl bg-red-50 text-red-600 hover:bg-red-100 transition-all active:scale-95"
                            title="Clear Preview"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Content: Setup View */}
            {view === 'setup' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left: Upload Area */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8 flex flex-col items-center justify-center min-h-[400px] text-center">
                            <div className="w-20 h-20 bg-blue-50 rounded-[2rem] flex items-center justify-center mb-6">
                                <Upload className="w-10 h-10 text-blue-600" />
                            </div>
                            <h2 className="text-2xl font-black text-gray-900 mb-2">Upload Data Source</h2>
                            <p className="text-gray-500 font-medium mb-8 max-w-sm">
                                Select a CSV or Excel file containing your legacy project records.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex-1 px-6 py-4 rounded-2xl bg-blue-600 text-white font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2"
                                >
                                    Choose File
                                </button>
                                <button
                                    onClick={handleDownloadTemplate}
                                    className="flex-1 px-6 py-4 rounded-2xl bg-white border-2 border-gray-100 text-gray-700 font-black hover:border-blue-400 hover:text-blue-600 transition-all flex items-center justify-center gap-2"
                                >
                                    <Download className="w-4 h-4" />
                                    Template
                                </button>
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept=".csv,.xlsx,.xls"
                                onChange={handleFileUpload}
                            />
                        </div>
                    </div>

                    {/* Right: Paste Area */}
                    <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8 space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-amber-50 rounded-2xl">
                                <ClipboardPaste className="w-6 h-6 text-amber-600" />
                            </div>
                            <h2 className="text-xl font-black text-gray-900">Direct Paste</h2>
                        </div>

                        <div className="space-y-4">
                            <textarea
                                className="w-full h-48 px-6 py-4 rounded-3xl border border-gray-100 bg-gray-50/50 text-xs font-mono focus:ring-4 focus:ring-blue-500/10 outline-none resize-none transition-all"
                                placeholder="Paste CSV/TSV data here...&#10;date,customerName,partnerName,brand,salesRepName,stage,value"
                                value={pasteText}
                                onChange={(e) => setPasteText(e.target.value)}
                            />

                            <div className="flex items-center gap-4">
                                <div className="flex-1">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 px-1">Default Value</span>
                                    <FormattedNumberInput
                                        value={defaultValue}
                                        onChange={setDefaultValue}
                                        className="w-full px-5 py-3 rounded-2xl border border-gray-100 bg-white text-sm font-bold shadow-sm"
                                    />
                                </div>
                                <button
                                    onClick={handleParseClipboard}
                                    className="mt-6 px-8 py-3.5 rounded-2xl bg-gray-900 text-white text-sm font-black hover:bg-black transition-all shadow-lg active:scale-95"
                                >
                                    Process Clipboard
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Content: Wide Preview View */}
            {view === 'preview' && (
                <div className="space-y-6">
                    {/* Floating Stats Bar */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
                                <FileText className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-gray-900">{stats.total}</p>
                                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Total Rows Found</p>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
                                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-emerald-600">{stats.approved}</p>
                                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Marked for Import</p>
                            </div>
                        </div>
                        <div className="bg-gray-900 p-6 rounded-3xl shadow-xl flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                                <Briefcase className="w-6 h-6 text-blue-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-white">$ {stats.value.toLocaleString()}</p>
                                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Combined Value</p>
                            </div>
                        </div>
                    </div>

                    {/* Wide Table */}
                    <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[800px]">
                        <div className="px-8 py-6 border-b border-gray-50 bg-gray-50/30 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <h2 className="text-xl font-black text-gray-900">Validation Preview</h2>
                                <span className="bg-blue-100 text-blue-700 text-[10px] font-black px-2.5 py-1 rounded-full uppercase">Review Phase</span>
                            </div>
                            <div className="flex items-center gap-6">
                                <button
                                    onClick={() => setRows(rows.map(r => ({ ...r, approved: true })))}
                                    className="text-xs font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest"
                                >
                                    Approve All
                                </button>
                                <div className="w-1 h-1 bg-gray-200 rounded-full" />
                                <button
                                    onClick={() => setRows(rows.map(r => ({ ...r, approved: false })))}
                                    className="text-xs font-black text-gray-400 hover:text-red-600 uppercase tracking-widest"
                                >
                                    Reject All
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto bg-white">
                            <table className="w-full text-left border-separate border-spacing-0">
                                <thead className="sticky top-0 bg-white/80 backdrop-blur-md z-10 shadow-sm">
                                    <tr>
                                        <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Status</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Project Details</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Partner & Rep</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Brand</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 text-right">Value</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 text-center w-24">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {rows.map((row) => (
                                        <tr
                                            key={row.id}
                                            className={cn(
                                                "group transition-all hover:bg-gray-50/50",
                                                !row.approved && "bg-gray-50/30 opacity-60 grayscale-[0.8]"
                                            )}
                                        >
                                            <td className="px-8 py-6">
                                                <button
                                                    onClick={() => setRows(rows.map(r => r.id === row.id ? { ...r, approved: !r.approved } : r))}
                                                    className={cn(
                                                        "w-10 h-10 rounded-2xl flex items-center justify-center border-2 transition-all active:scale-90",
                                                        row.approved ? "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-100" : "bg-white border-gray-100 text-gray-200"
                                                    )}
                                                >
                                                    {row.approved && <Check className="w-5 h-5" />}
                                                </button>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black text-gray-900 mb-1">{row.customerName}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-gray-100 text-gray-500 uppercase tracking-wider">{row.date}</span>
                                                        <span className={cn(
                                                            "text-[10px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider",
                                                            row.stage === 'WON' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                                                        )}>
                                                            {row.stage}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <Users className="w-3.5 h-3.5 text-gray-400" />
                                                        <span className="text-xs font-bold text-gray-700">{row.salesRepName || 'Auto-Assigned'}</span>
                                                    </div>
                                                    {row.partnerName && (
                                                        <div className="flex items-center gap-2">
                                                            <Briefcase className="w-3.5 h-3.5 text-blue-400" />
                                                            <span className="text-xs font-black text-blue-600 uppercase tracking-tighter truncate max-w-[200px]">{row.partnerName}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                {row.brand ? (
                                                    <span className="text-[10px] font-black px-3 py-1 rounded-full bg-gray-900 text-white uppercase tracking-widest">{row.brand}</span>
                                                ) : (
                                                    <span className="text-gray-200 text-xs italic">N/A</span>
                                                )}
                                            </td>
                                            <td className="px-8 py-6 text-right font-mono font-black text-gray-900">
                                                $ {row.value.toLocaleString()}
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <button
                                                    onClick={() => setRows(rows.filter(r => r.id !== row.id))}
                                                    className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Status Alert Overlay */}
            {status && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-6">
                    <div className={cn(
                        "px-8 py-4 rounded-[2rem] flex items-center gap-4 border shadow-2xl backdrop-blur-xl",
                        status.type === 'success' ? 'bg-emerald-50/90 border-emerald-100 text-emerald-800' :
                            status.type === 'error' ? 'bg-red-50/90 border-red-100 text-red-800' :
                                'bg-blue-50/90 border-blue-100 text-blue-800'
                    )}>
                        <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center",
                            status.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                        )}>
                            {status.type === 'success' ? <Check className="w-5 h-5 text-white" /> : <AlertCircle className="w-5 h-5 text-white" />}
                        </div>
                        <span className="text-sm font-black tracking-tight">{status.message}</span>
                        <button onClick={() => setStatus(null)} className="ml-4 opacity-40 hover:opacity-100 transition-opacity">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
