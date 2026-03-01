"use client"

import { useState, useEffect, useMemo } from "react"
import {
    Upload,
    Check,
    X,
    AlertCircle,
    CheckCircle2,
    FileText,
    Trash2,
    ChevronLeft,
    ShieldCheck,
    Users,
    Briefcase,
    Calendar,
    ArrowRight
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import BackButton from "@/components/BackButton"
import FormattedNumberInput from "@/components/FormattedNumberInput"
import { cn } from "@/lib/utils"
import Papa from "papaparse"
import * as XLSX from "xlsx"
import { useRef } from "react"

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

export default function ProjectImportPage() {
    const router = useRouter()
    const [pasteText, setPasteText] = useState("")
    const [rows, setRows] = useState<LegacyProjectRow[]>([])
    const [loading, setLoading] = useState(false)
    const [importing, setImporting] = useState(false)
    const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null)
    const [pipelines, setPipelines] = useState<any[]>([])
    const [selectedPipelineId, setSelectedPipelineId] = useState("")
    const [defaultValue, setDefaultValue] = useState(0)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        fetchPipelines()
    }, [])

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

    function handleParse() {
        if (!pasteText.trim()) return

        const rows = parseDataString(pasteText)
        if (rows.length > 0) {
            setRows(prev => [...prev, ...rows])
            setPasteText("")
            setStatus({ type: 'success', message: `Parsed ${rows.length} projects from clipboard.` })
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
        const reader = new FileReader()

        if (file.name.endsWith('.csv')) {
            Papa.parse(file, {
                header: false,
                skipEmptyLines: true,
                complete: (results) => {
                    const parsedRows = results.data.map((parts: any) => {
                        const [date, customer, partner, brand, rep, stage, val] = parts.map((p: any) => String(p || "").trim())
                        return {
                            id: generateId(),
                            date: date || new Date().toISOString().split('T')[0],
                            customerName: customer || "",
                            partnerName: partner || "",
                            brand: brand || "",
                            salesRepName: rep || "",
                            stage: (stage || "Lead").toUpperCase(),
                            value: parseFloat(val) || defaultValue,
                            approved: true
                        }
                    })
                    setRows(prev => [...prev, ...parsedRows])
                    setStatus({ type: 'success', message: `Successfully imported ${parsedRows.length} rows from ${file.name}` })
                },
                error: (err) => {
                    setStatus({ type: 'error', message: `Failed to parse CSV: ${err.message}` })
                }
            })
        } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
            reader.onload = (evt) => {
                try {
                    const bstr = evt.target?.result
                    const wb = XLSX.read(bstr, { type: 'binary' })
                    const wsname = wb.SheetNames[0]
                    const ws = wb.Sheets[wsname]
                    const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][]

                    const parsedRows = data.filter(r => r.length >= 2).map(parts => {
                        const [date, customer, partner, brand, rep, stage, val] = parts.map(p => String(p || "").trim())
                        return {
                            id: generateId(),
                            date: date || new Date().toISOString().split('T')[0],
                            customerName: customer || "",
                            partnerName: partner || "",
                            brand: brand || "",
                            salesRepName: rep || "",
                            stage: (stage || "Lead").toUpperCase(),
                            value: parseFloat(val) || defaultValue,
                            approved: true
                        }
                    })

                    setRows(prev => [...prev, ...parsedRows])
                    setStatus({ type: 'success', message: `Successfully imported ${parsedRows.length} rows from ${file.name}` })
                } catch (err: any) {
                    setStatus({ type: 'error', message: `Failed to parse Excel: ${err.message}` })
                }
            }
            reader.readAsBinaryString(file)
        } else {
            setStatus({ type: 'error', message: "Unsupported file format. Please use CSV or Excel (.xlsx, .xls)." })
        }

        // Reset file input
        if (fileInputRef.current) fileInputRef.current.value = ""
    }

    async function handleImport() {
        const approvedRows = rows.filter(r => r.approved)
        if (approvedRows.length === 0) {
            setStatus({ type: 'error', message: "No approved projects to import." })
            return
        }

        if (!selectedPipelineId) {
            setStatus({ type: 'error', message: "Please select a target pipeline." })
            return
        }

        if (!confirm(`Import ${approvedRows.length} projects into the live system?`)) return

        setImporting(true)
        setStatus({ type: 'info', message: "Importing approved projects..." })

        try {
            const res = await fetch('/api/crm/projects/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projects: approvedRows,
                    pipelineId: selectedPipelineId
                })
            })

            const result = await res.json()
            if (!res.ok) throw new Error(result.error || "Import failed")

            setStatus({ type: 'success', message: result.message })
            setRows(rows.filter(r => !r.approved))
        } catch (error: any) {
            console.error("Import failed:", error)
            setStatus({ type: 'error', message: error.message || "Failed to import items to system." })
        } finally {
            setImporting(false)
        }
    }

    const stats = useMemo(() => {
        return {
            total: rows.length,
            approved: rows.filter(r => r.approved).length,
            value: rows.filter(r => r.approved).reduce((acc, curr) => acc + curr.value, 0)
        }
    }, [rows])

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <BackButton />
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Legacy Project Importer</h1>
                        <p className="text-sm text-gray-500 font-medium tracking-tight">Import historical data with individual row approval</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Selected Pipeline</span>
                        <select
                            className="text-xs font-bold border-gray-200 rounded-xl px-3 py-1.5 bg-white shadow-sm focus:ring-blue-500"
                            value={selectedPipelineId}
                            onChange={(e) => setSelectedPipelineId(e.target.value)}
                        >
                            {pipelines.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                    <button
                        onClick={handleImport}
                        disabled={importing || stats.approved === 0}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-600 text-white text-sm font-black hover:bg-emerald-700 transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                    >
                        <ShieldCheck className="w-4 h-4" />
                        Finalize & Import ({stats.approved})
                    </button>
                </div>
            </div>

            {/* Status Alert */}
            {status && (
                <div className={cn(
                    "p-4 rounded-2xl flex items-center gap-3 border shadow-sm",
                    status.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' :
                        status.type === 'error' ? 'bg-red-50 border-red-100 text-red-800' :
                            'bg-blue-50 border-blue-100 text-blue-800'
                )}>
                    {status.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertCircle className="w-5 h-5" />}
                    <span className="text-sm font-bold tracking-tight">{status.message}</span>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Data Input */}
                <div className="space-y-6">
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                                <FileText className="w-5 h-5" />
                            </div>
                            <h2 className="text-lg font-black text-gray-900 tracking-tight">Paste Data</h2>
                        </div>

                        <div className="flex flex-col gap-2">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border-2 border-dashed border-gray-200 hover:border-blue-400 hover:bg-blue-50/30 transition-all group"
                            >
                                <Upload className="w-5 h-5 text-gray-400 group-hover:text-blue-500" />
                                <span className="text-sm font-black text-gray-500 group-hover:text-blue-600">Upload CSV or Excel</span>
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept=".csv,.xlsx,.xls"
                                onChange={handleFileUpload}
                            />
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-gray-100" />
                            </div>
                            <div className="relative flex justify-center text-[10px] uppercase font-black text-gray-300">
                                <span className="bg-white px-3">Or Paste below</span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Bulk Content (CSV/TSV)</label>
                                <textarea
                                    className="w-full h-80 px-4 py-3 rounded-2xl border border-gray-100 bg-gray-50/50 text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                    placeholder="Date, Customer, Partner, Brand, Rep, Stage, Value&#10;2023-01-15, Acme Corp, SoftBank, Cisco, Sales Rep, Won, 50000&#10;..."
                                    value={pasteText}
                                    onChange={(e) => setPasteText(e.target.value)}
                                />
                                <p className="text-[10px] text-gray-400 mt-2 font-medium">Fields: Date, Customer, Partner, Brand, Rep, Stage, Value</p>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="flex-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">Default Value</label>
                                    <FormattedNumberInput
                                        value={defaultValue}
                                        onChange={setDefaultValue}
                                        className="w-full px-4 py-2 rounded-xl border border-gray-100 bg-white text-sm font-bold shadow-sm"
                                    />
                                </div>
                                <button
                                    onClick={handleParse}
                                    className="mt-5 px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-black hover:bg-blue-700 transition-all shadow-md active:scale-95"
                                >
                                    Process Clipboard
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Stats Card */}
                    <div className="bg-gray-900 rounded-3xl p-6 text-white space-y-4 shadow-xl">
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Bulk Import Statistics</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Total Projects</p>
                                <p className="text-2xl font-black">{stats.total}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wide text-right">To Be Imported</p>
                                <p className="text-2xl font-black text-right">{stats.approved}</p>
                            </div>
                        </div>
                        <div className="pt-4 border-t border-white/10">
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Combined Value</p>
                            <p className="text-3xl font-black text-blue-400">$ {stats.value.toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                {/* Right Column: Validation Preview Table */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[700px]">
                        <div className="p-5 border-b border-gray-50 flex justify-between items-center">
                            <h2 className="text-lg font-black text-gray-900 tracking-tight tracking-tight flex items-center gap-2">
                                Validation Preview
                                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">{rows.length} rows</span>
                            </h2>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setRows(rows.map(r => ({ ...r, approved: true })))}
                                    className="text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest"
                                >
                                    Approve All
                                </button>
                                <span className="text-gray-200">|</span>
                                <button
                                    onClick={() => setRows(rows.map(r => ({ ...r, approved: false })))}
                                    className="text-[10px] font-black text-gray-400 hover:text-red-500 uppercase tracking-widest"
                                >
                                    Reject All
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto bg-gray-50/20">
                            {rows.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-3">
                                    <Upload className="w-12 h-12 stroke-[1.5] opacity-20" />
                                    <p className="text-sm font-medium italic">Paste data on the left to start previewing</p>
                                </div>
                            ) : (
                                <table className="w-full text-left border-collapse">
                                    <thead className="sticky top-0 bg-white shadow-sm z-10">
                                        <tr>
                                            <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 w-12 text-center">Appr</th>
                                            <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Project Data</th>
                                            <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Entities</th>
                                            <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 text-right">Financials</th>
                                            <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {rows.map((row) => (
                                            <tr
                                                key={row.id}
                                                className={cn(
                                                    "hover:bg-gray-50/80 transition-colors",
                                                    !row.approved && "opacity-60 bg-gray-50/50"
                                                )}
                                            >
                                                <td className="px-5 py-4 text-center">
                                                    <button
                                                        onClick={() => setRows(rows.map(r => r.id === row.id ? { ...r, approved: !r.approved } : r))}
                                                        className={cn(
                                                            "w-6 h-6 rounded-lg flex items-center justify-center border transition-all",
                                                            row.approved ? "bg-emerald-500 border-emerald-500 text-white" : "bg-white border-gray-200 text-gray-300"
                                                        )}
                                                    >
                                                        {row.approved && <Check className="w-4 h-4" />}
                                                    </button>
                                                </td>
                                                <td className="px-5 py-4 min-w-[200px]">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-black text-gray-900 leading-tight mb-0.5">{row.customerName}</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 uppercase tracking-wider">{row.date}</span>
                                                            <span className={cn(
                                                                "text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider",
                                                                row.stage === 'WON' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                                                            )}>
                                                                {row.stage}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex flex-col">
                                                            <div className="flex items-center gap-1.5 mb-1">
                                                                <Users className="w-3 h-3 text-gray-400" />
                                                                <span className="text-[10px] font-bold text-gray-600">{row.salesRepName || 'Auto-Rep'}</span>
                                                            </div>
                                                            {row.partnerName && (
                                                                <div className="flex items-center gap-1.5">
                                                                    <Briefcase className="w-3 h-3 text-gray-400" />
                                                                    <span className="text-[9px] font-black text-blue-500 uppercase tracking-tighter truncate max-w-[120px]">{row.partnerName}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4 text-right">
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-xs font-black text-gray-900 tabular-nums">$ {row.value.toLocaleString()}</span>
                                                        {row.brand && (
                                                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{row.brand}</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <button
                                                        onClick={() => setRows(rows.filter(r => r.id !== row.id))}
                                                        className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
