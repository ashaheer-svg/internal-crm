"use client"

import { useState, useEffect, useMemo, useRef, memo, useCallback } from "react"
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
    Search,
    ListFilter,
    ArrowRight,
    Globe,
    ExternalLink,
    RefreshCw,
    Edit2,
    CheckSquare
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

type ResolvedEntity = {
    id?: string | 'NEW'
    customName?: string
    name: string
    type: 'CUSTOMER' | 'PARTNER'
}

type ResolutionState = Record<string, ResolvedEntity>

type Status = { type: 'success' | 'error' | 'info', message: string } | null

// Memoized Row for Performance
const ProjectRow = memo(({
    row,
    onToggleApproval,
    onRemove
}: {
    row: LegacyProjectRow,
    onToggleApproval: (id: string) => void,
    onRemove: (id: string) => void
}) => {
    return (
        <tr
            className={cn(
                "group transition-all hover:bg-gray-50/80 border-b border-gray-50",
                !row.approved && "bg-gray-50/30 opacity-60 grayscale-[0.8]"
            )}
        >
            <td className="px-4 py-2">
                <button
                    onClick={() => onToggleApproval(row.id)}
                    className={cn(
                        "w-6 h-6 rounded-lg flex items-center justify-center border transition-all active:scale-90",
                        row.approved ? "bg-emerald-500 border-emerald-500 text-white" : "bg-white border-gray-200 text-gray-200"
                    )}
                >
                    {row.approved && <Check className="w-3.5 h-3.5" />}
                </button>
            </td>
            <td className="px-4 py-2">
                <div className="flex flex-col">
                    <span className="text-[11px] font-black text-gray-900 leading-tight truncate max-w-[200px]" title={row.customerName}>
                        {row.customerName}
                    </span>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">{row.date}</span>
                </div>
            </td>
            <td className="px-4 py-2">
                <div className="flex flex-col">
                    <span className={cn(
                        "text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-tighter inline-block w-fit",
                        row.stage === 'WON' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                    )}>
                        {row.stage}
                    </span>
                </div>
            </td>
            <td className="px-4 py-2">
                <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5">
                        <Users className="w-2.5 h-2.5 text-gray-300" />
                        <span className="text-[10px] font-bold text-gray-600 truncate max-w-[120px]">{row.salesRepName || 'Auto'}</span>
                    </div>
                </div>
            </td>
            <td className="px-4 py-2">
                {row.partnerName && (
                    <div className="flex items-center gap-1.5">
                        <Briefcase className="w-2.5 h-2.5 text-blue-300" />
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-tighter truncate max-w-[120px]">{row.partnerName}</span>
                    </div>
                )}
            </td>
            <td className="px-4 py-2">
                {row.brand && (
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-gray-900 text-white uppercase tracking-tighter">{row.brand}</span>
                )}
            </td>
            <td className="px-4 py-2 text-right font-mono text-[11px] font-black text-gray-900 whitespace-nowrap">
                $ {row.value.toLocaleString()}
            </td>
            <td className="px-4 py-2 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={() => onRemove(row.id)}
                    className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                >
                    <Trash2 className="w-3 h-3" />
                </button>
            </td>
        </tr>
    )
})

ProjectRow.displayName = 'ProjectRow'

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
    const [step, setStep] = useState<'setup' | 'resolve' | 'preview'>('setup')
    const [searchQuery, setSearchQuery] = useState("")
    const [unresolvedEntities, setUnresolvedEntities] = useState<any[]>([])
    const [resolutionMap, setResolutionMap] = useState<ResolutionState>({})
    const [editingEntity, setEditingEntity] = useState<string | null>(null)
    const [manualSearchQuery, setManualSearchQuery] = useState("")
    const [searchLoading, setSearchLoading] = useState(false)
    const [searchResults, setSearchResults] = useState<any[]>([])
    const [sortKey, setSortKey] = useState<'date' | 'customerName' | 'value'>('date')
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
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

    const generateId = useCallback(() => Math.random().toString(36).substring(2, 11), [])

    const toggleApproval = useCallback((id: string) => {
        setRows(prev => prev.map(r => r.id === id ? { ...r, approved: !r.approved } : r))
    }, [])

    const removeRow = useCallback((id: string) => {
        setRows(prev => prev.filter(r => r.id !== id))
    }, [])

    const toggleSort = (key: 'date' | 'customerName' | 'value') => {
        if (sortKey === key) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
        } else {
            setSortKey(key)
            setSortDir('desc')
        }
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

    async function startResolution(newRows: LegacyProjectRow[]) {
        setLoading(true)
        try {
            // Collect unique names and counts
            const namesMap: Record<string, { count: number, type: 'CUSTOMER' | 'PARTNER' }> = {}
            newRows.forEach(row => {
                if (row.customerName) {
                    namesMap[row.customerName] = {
                        count: (namesMap[row.customerName]?.count || 0) + 1,
                        type: 'CUSTOMER'
                    }
                }
                if (row.partnerName) {
                    namesMap[row.partnerName] = {
                        count: (namesMap[row.partnerName]?.count || 0) + 1,
                        type: 'PARTNER'
                    }
                }
            })

            const uniqueNames = Object.keys(namesMap)
            const res = await fetch('/api/crm/projects/import/resolve-entities', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ names: uniqueNames })
            })
            const data = await res.json()

            const results = data.results.map((r: any) => ({
                ...r,
                count: namesMap[r.input].count,
                type: namesMap[r.input].type
            })).sort((a: any, b: any) => b.count - a.count)

            setUnresolvedEntities(results)

            // Auto-populate resolution map with results score > 0.95
            const initialMap: ResolutionState = {}
            results.forEach((r: any) => {
                if (r.match && r.match.score > 0.95) {
                    initialMap[r.input] = { id: r.match.id, name: r.match.name, type: r.type }
                }
            })
            setResolutionMap(initialMap)
            setStep('resolve')
        } catch (error: any) {
            setStatus({ type: 'error', message: 'Failed to clean data' })
        } finally {
            setLoading(false)
        }
    }

    function handleParseClipboard() {
        if (!pasteText.trim()) return
        const newRows = parseDataString(pasteText)
        if (newRows.length > 0) {
            setRows(newRows)
            setPasteText("")
            startResolution(newRows)
        }
    }

    function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        setLoading(true)

        const sharedComplete = (parsed: LegacyProjectRow[]) => {
            setRows(parsed)
            startResolution(parsed)
        }

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
                    sharedComplete(parsedRows)
                },
                error: (err) => {
                    setStatus({ type: 'error', message: err.message })
                    setLoading(false)
                }
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
                    sharedComplete(parsedRows)
                } catch (err: any) {
                    setStatus({ type: 'error', message: err.message })
                    setLoading(false)
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
                body: JSON.stringify({
                    projects: approvedRows,
                    pipelineId: selectedPipelineId,
                    entityMap: resolutionMap
                })
            })
            const result = await res.json()
            if (!res.ok) throw new Error(result.error)
            setStatus({ type: 'success', message: result.message })
            setRows([])
            setStep('setup')
        } catch (error: any) {
            setStatus({ type: 'error', message: error.message })
        } finally {
            setImporting(false)
        }
    }

    async function handleManualSearch(query: string) {
        if (!query || query.length < 2) return
        setSearchLoading(true)
        try {
            const res = await fetch(`/api/customers?search=${encodeURIComponent(query)}&limit=10`)
            if (res.ok) {
                const data = await res.json()
                setSearchResults(data.customers || [])
            }
        } catch (e) {
            console.error("Search failed", e)
        } finally {
            setSearchLoading(false)
        }
    }

    const filteredRows = useMemo(() => {
        let result = rows
        if (searchQuery) {
            const low = searchQuery.toLowerCase()
            result = rows.filter(r =>
                r.customerName.toLowerCase().includes(low) ||
                r.brand?.toLowerCase().includes(low) ||
                r.salesRepName?.toLowerCase().includes(low)
            )
        }

        return [...result].sort((a, b) => {
            let valA = a[sortKey]
            let valB = b[sortKey]

            if (typeof valA === 'string') valA = valA.toLowerCase()
            if (typeof valB === 'string') valB = valB.toLowerCase()

            if (valA < valB) return sortDir === 'asc' ? -1 : 1
            if (valA > valB) return sortDir === 'asc' ? 1 : -1
            return 0
        })
    }, [rows, searchQuery, sortKey, sortDir])

    const stats = useMemo(() => {
        const approvedOnly = rows.filter(r => r.approved)
        return {
            total: rows.length,
            approved: approvedOnly.length,
            value: approvedOnly.reduce((acc, curr) => acc + curr.value, 0)
        }
    }, [rows])

    const allResolved = useMemo(() => {
        return unresolvedEntities.every(e => resolutionMap[e.input])
    }, [unresolvedEntities, resolutionMap])

    return (
        <div className="max-w-[1700px] mx-auto space-y-4 pb-20 px-4">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-blue-50 rounded-xl">
                        <LayoutDashboard className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-gray-900 tracking-tight">Project Importer</h1>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Intelligent Data Resolution Flow</p>
                    </div>
                </div>

                {step === 'preview' && (
                    <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                        <div className="bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100 min-w-[150px]">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">Pipeline</span>
                            <select
                                className="text-xs font-black bg-transparent outline-none text-gray-900 w-full"
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
                            className="flex-1 lg:flex-none inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gray-900 text-white text-xs font-black hover:bg-black transition-all shadow-lg active:scale-95 disabled:opacity-50"
                        >
                            <ShieldCheck className="w-4 h-4" />
                            Finalize Import ({stats.approved})
                        </button>

                        <button
                            onClick={() => { setRows([]); setStep('setup'); }}
                            className="p-3 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-all active:scale-95"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {step === 'resolve' && (
                    <div className="flex items-center gap-3">
                        <div className="flex items-center bg-gray-50 px-4 py-2 rounded-xl">
                            <RefreshCw className="w-4 h-4 text-gray-400 mr-2 animate-spin-slow" />
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Cleaning Contextual Data</span>
                        </div>
                        <button
                            onClick={() => setStep('preview')}
                            disabled={!allResolved}
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white text-xs font-black hover:bg-blue-700 transition-all shadow-lg disabled:opacity-50"
                        >
                            Next: Preview List
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>

            {/* Content: Setup View */}
            {step === 'setup' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8 flex flex-col items-center justify-center min-h-[350px] text-center">
                        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-5">
                            <Upload className="w-8 h-8 text-blue-600" />
                        </div>
                        <h2 className="text-xl font-black text-gray-900 mb-2">Upload Data</h2>
                        <p className="text-xs text-gray-400 font-medium mb-6 max-w-xs uppercase tracking-wider">CSV or Excel Compatible</p>

                        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="flex-1 px-5 py-3 rounded-xl bg-blue-600 text-white text-xs font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                            >
                                Browse Files
                            </button>
                            <button
                                onClick={handleDownloadTemplate}
                                className="flex-1 px-5 py-3 rounded-xl bg-white border border-gray-200 text-gray-600 text-xs font-black hover:border-blue-400 hover:text-blue-600 transition-all flex items-center justify-center gap-2"
                            >
                                <Download className="w-3.5 h-3.5" />
                                Template
                            </button>
                        </div>
                        <input type="file" ref={fileInputRef} className="hidden" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} />
                    </div>

                    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8 space-y-4">
                        <div className="flex items-center gap-3">
                            <ClipboardPaste className="w-5 h-5 text-amber-600" />
                            <h2 className="text-lg font-black text-gray-900">Direct Paste</h2>
                        </div>
                        <textarea
                            className="w-full h-36 px-5 py-3 rounded-2xl border border-gray-100 bg-gray-50/50 text-[10px] font-mono focus:ring-4 focus:ring-blue-500/5 outline-none resize-none transition-all"
                            placeholder="Paste CSV/TSV data records here..."
                            value={pasteText}
                            onChange={(e) => setPasteText(e.target.value)}
                        />
                        <div className="flex items-center gap-3">
                            <div className="flex-1">
                                <FormattedNumberInput
                                    value={defaultValue}
                                    onChange={setDefaultValue}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-100 bg-white text-xs font-black shadow-sm"
                                    placeholder="Fallback Value"
                                />
                            </div>
                            <button
                                onClick={handleParseClipboard}
                                className="px-6 py-2.5 rounded-xl bg-gray-900 text-white text-xs font-black hover:bg-black transition-all shadow-lg"
                            >
                                Process
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Step: Resolve View */}
            {step === 'resolve' && (
                <div className="space-y-4">
                    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-100">
                            <ListFilter className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-amber-900">Entity Matching Phase</h3>
                            <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Please resolve the unique company names identified in your dataset</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[600px] flex flex-col">
                        <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
                            <div className="flex items-center gap-4">
                                <h2 className="text-xs font-black text-gray-500 uppercase tracking-widest">Unrecognized Companies ({unresolvedEntities.length})</h2>
                                <span className="bg-blue-100 text-blue-700 text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-tighter">Resolution Required</span>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto divide-y divide-gray-50">
                            {unresolvedEntities.map((entity, idx) => {
                                const resolved = resolutionMap[entity.input]
                                const isEditing = editingEntity === entity.input

                                return (
                                    <div key={idx} className={cn(
                                        "p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6 transition-all",
                                        resolved ? "bg-white" : "bg-gray-50/50"
                                    )}>
                                        <div className="flex items-start gap-4 flex-1 min-w-0">
                                            <div className="p-3 bg-white rounded-xl border border-gray-100 shadow-sm shrink-0">
                                                {entity.type === 'PARTNER' ? <Briefcase className="w-5 h-5 text-blue-500" /> : <Users className="w-5 h-5 text-gray-500" />}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-3 mb-1 flex-wrap">
                                                    <h3 className="text-sm font-black text-gray-900 truncate">{entity.input}</h3>
                                                    {resolved?.id === 'NEW' && resolved.customName && (
                                                        <div className="flex items-center gap-2 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                                                            <ArrowRight className="w-3 h-3 text-purple-600" />
                                                            <span className="text-[10px] font-black text-purple-700 uppercase">{resolved.customName}</span>
                                                        </div>
                                                    )}
                                                    <span className="bg-gray-900 text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter">
                                                        {entity.count} Rows
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-3">
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{entity.type}</span>
                                                    <a
                                                        href={`https://www.google.com/search?q=${encodeURIComponent(entity.input + " Sri Lanka Registrar of Companies search")}`}
                                                        target="_blank"
                                                        className="flex items-center gap-1 text-[10px] font-black text-emerald-600 hover:underline uppercase tracking-tighter"
                                                    >
                                                        <Globe className="w-3 h-3" />
                                                        Verify via Google (SL)
                                                        <ExternalLink className="w-2.5 h-2.5" />
                                                    </a>
                                                    {!resolved && !isEditing && (
                                                        <button
                                                            onClick={() => setEditingEntity(entity.input)}
                                                            className="flex items-center gap-1 text-[10px] font-black text-blue-600 hover:underline uppercase tracking-tighter"
                                                        >
                                                            <Search className="w-3 h-3" />
                                                            Manual Lookup
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                                            {isEditing ? (
                                                <div className="flex items-center gap-2 bg-white border border-blue-200 p-1 rounded-xl shadow-lg relative">
                                                    <div className="relative">
                                                        <input
                                                            type="text"
                                                            autoFocus
                                                            placeholder="Search or Type Custom Name..."
                                                            className="px-3 py-2 text-xs font-black outline-none w-[280px]"
                                                            value={manualSearchQuery}
                                                            onChange={(e) => {
                                                                setManualSearchQuery(e.target.value)
                                                                handleManualSearch(e.target.value)
                                                            }}
                                                        />
                                                        {manualSearchQuery && (
                                                            <div className="absolute top-full left-0 right-0 bg-white border border-gray-100 shadow-2xl rounded-xl mt-2 z-50 overflow-hidden min-w-[300px]">
                                                                <div className="p-2 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                                                                    <span className="text-[9px] font-black text-gray-400 uppercase">Existing Matches</span>
                                                                    {searchLoading && <RefreshCw className="w-3 h-3 animate-spin text-blue-500" />}
                                                                </div>
                                                                <div className="max-h-[200px] overflow-auto">
                                                                    {searchResults.map(s => (
                                                                        <button
                                                                            key={s.id}
                                                                            onClick={() => {
                                                                                setResolutionMap(prev => ({ ...prev, [entity.input]: { id: s.id, name: s.name, type: entity.type } }))
                                                                                setEditingEntity(null)
                                                                                setManualSearchQuery("")
                                                                            }}
                                                                            className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-50 transition-colors flex justify-between items-center group"
                                                                        >
                                                                            <div>
                                                                                <p className="text-xs font-black text-gray-900 group-hover:text-blue-700">{s.name}</p>
                                                                                <p className="text-[9px] font-bold text-gray-400 uppercase">{s.isPartner ? 'Partner' : 'Customer'}</p>
                                                                            </div>
                                                                            <CheckSquare className="w-3.5 h-3.5 text-gray-200 group-hover:text-blue-500" />
                                                                        </button>
                                                                    ))}
                                                                    <button
                                                                        onClick={() => {
                                                                            setResolutionMap(prev => ({ ...prev, [entity.input]: { id: 'NEW', customName: manualSearchQuery, name: manualSearchQuery, type: entity.type } }))
                                                                            setEditingEntity(null)
                                                                            setManualSearchQuery("")
                                                                        }}
                                                                        className="w-full text-left px-4 py-3 hover:bg-purple-50 group transition-colors"
                                                                    >
                                                                        <p className="text-xs font-black text-purple-700">Create as "{manualSearchQuery}"</p>
                                                                        <p className="text-[9px] font-bold text-purple-400 uppercase">Use this name for a new {entity.type}</p>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={() => { setEditingEntity(null); setManualSearchQuery(""); }}
                                                        className="p-2 text-gray-400 hover:text-red-500 rounded-lg"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex-1 lg:flex-none">
                                                        <select
                                                            className={cn(
                                                                "w-full sm:w-[320px] px-4 py-3 rounded-xl border text-xs font-black transition-all outline-none",
                                                                resolved ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-gray-200 bg-white text-gray-600 focus:border-blue-500"
                                                            )}
                                                            value={resolved ? (resolved.id === 'NEW' ? 'NEW' : resolved.id) : ""}
                                                            onChange={(e) => {
                                                                const val = e.target.value
                                                                if (val === 'NEW') {
                                                                    setResolutionMap(prev => ({ ...prev, [entity.input]: { id: 'NEW', name: entity.input, type: entity.type } }))
                                                                } else if (val) {
                                                                    const match = entity.suggestions.find((s: any) => s.id === val) || (entity.match?.id === val ? entity.match : null)
                                                                    setResolutionMap(prev => ({ ...prev, [entity.input]: { id: val, name: match.name, type: entity.type } }))
                                                                } else {
                                                                    const newMap = { ...resolutionMap }
                                                                    delete newMap[entity.input]
                                                                    setResolutionMap(newMap)
                                                                }
                                                            }}
                                                        >
                                                            <option value="">- SELECT ACTION -</option>
                                                            <option value="NEW">+ CREATE AS NEW {entity.type}</option>
                                                            {entity.match && (
                                                                <optgroup label="PROBABLE MATCH">
                                                                    <option value={entity.match.id}>{entity.match.name} ({Math.round(entity.match.score * 100)}% Match)</option>
                                                                </optgroup>
                                                            )}
                                                            {entity.suggestions.length > 0 && (
                                                                <optgroup label="OTHER SUGGESTIONS">
                                                                    {entity.suggestions.map((s: any) => (
                                                                        <option key={s.id} value={s.id}>{s.name} ({Math.round(s.score * 100)}%)</option>
                                                                    ))}
                                                                </optgroup>
                                                            )}
                                                        </select>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => setEditingEntity(entity.input)}
                                                            className="p-3 bg-white border border-gray-100 rounded-xl hover:bg-gray-50 text-gray-400 hover:text-blue-600 shadow-sm transition-all"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        {resolved && (
                                                            <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-100 animate-in zoom-in">
                                                                <Check className="w-5 h-5" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Content: Ultra-Dense Preview */}
            {step === 'preview' && (
                <div className="space-y-4 fade-in">
                    {/* Compact Stats Bar */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3">
                            <FileText className="w-5 h-5 text-blue-400" />
                            <div>
                                <p className="text-lg font-black text-gray-900 leading-none">{stats.total}</p>
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Total Detected</p>
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                            <div>
                                <p className="text-lg font-black text-emerald-600 leading-none">{stats.approved}</p>
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Marked for Import</p>
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3">
                            <Briefcase className="w-5 h-5 text-blue-400" />
                            <div>
                                <p className="text-lg font-black text-gray-900 leading-none">$ {stats.value.toLocaleString()}</p>
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Combined Value</p>
                            </div>
                        </div>

                        <div className="bg-gray-50 flex items-center gap-3 px-4 rounded-xl border border-gray-100">
                            <Search className="w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="SEARCH BY CUSTOMER, REP, BRAND..."
                                className="bg-transparent text-[10px] font-black w-full outline-none uppercase"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Dense Table */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col max-h-[700px] relative">
                        <div className="px-6 py-3 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center sticky top-0 z-20">
                            <div className="flex items-center gap-3">
                                <ListFilter className="w-4 h-4 text-gray-400" />
                                <h2 className="text-[11px] font-black text-gray-500 uppercase tracking-[0.2em]">Validation Queue</h2>
                            </div>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setRows(rows.map(r => ({ ...r, approved: true })))}
                                    className="text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest"
                                >
                                    Approve All
                                </button>
                                <div className="w-px h-3 bg-gray-200" />
                                <button
                                    onClick={() => setRows(rows.map(r => ({ ...r, approved: false })))}
                                    className="text-[10px] font-black text-gray-400 hover:text-red-500 uppercase tracking-widest transition-colors"
                                >
                                    Reject All
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto">
                            <table className="w-full text-left border-separate border-spacing-0">
                                <thead className="sticky top-0 bg-white shadow-sm z-10">
                                    <tr className="bg-white">
                                        <th className="px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-50 bg-white">Approve</th>
                                        <th
                                            className="px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-50 bg-white cursor-pointer hover:bg-gray-50 group/th"
                                            onClick={() => toggleSort('customerName')}
                                        >
                                            <div className="flex items-center gap-1">
                                                Customer / Date
                                                <ListFilter className={cn("w-2.5 h-2.5 transition-all opacity-0 group-hover/th:opacity-100", sortKey === 'customerName' && "opacity-100 text-blue-500", sortDir === 'asc' && "rotate-180")} />
                                            </div>
                                        </th>
                                        <th className="px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-50 bg-white">Stage</th>
                                        <th className="px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-50 bg-white">Sales Rep</th>
                                        <th className="px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-50 bg-white">Partner</th>
                                        <th className="px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-50 bg-white">Brand</th>
                                        <th
                                            className="px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-50 bg-white text-right cursor-pointer hover:bg-gray-50 group/th"
                                            onClick={() => toggleSort('value')}
                                        >
                                            <div className="flex items-center justify-end gap-1">
                                                Value
                                                <ListFilter className={cn("w-2.5 h-2.5 transition-all opacity-0 group-hover/th:opacity-100", sortKey === 'value' && "opacity-100 text-blue-500", sortDir === 'asc' && "rotate-180")} />
                                            </div>
                                        </th>
                                        <th className="px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-50 bg-white text-center">X</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredRows.slice(0, 4100).map((row) => (
                                        <ProjectRow
                                            key={row.id}
                                            row={row}
                                            onToggleApproval={toggleApproval}
                                            onRemove={removeRow}
                                        />
                                    ))}
                                    {filteredRows.length > 4100 && (
                                        <tr>
                                            <td colSpan={8} className="px-8 py-4 text-center bg-gray-50 text-[10px] font-black text-gray-400 uppercase">
                                                Showing first 4100 rows. {filteredRows.length - 4100} more rows are hidden for UI performance.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Status Alert Overlay */}
            {status && (
                <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-right-6">
                    <div className={cn(
                        "px-6 py-3 rounded-2xl flex items-center gap-3 border shadow-xl backdrop-blur-md",
                        status.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' :
                            status.type === 'error' ? 'bg-red-50 border-red-100 text-red-800' :
                                'bg-blue-50 border-blue-100 text-blue-800'
                    )}>
                        <div className={cn(
                            "w-6 h-6 rounded-lg flex items-center justify-center",
                            status.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                        )}>
                            {status.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-tight">{status.message}</span>
                        <button onClick={() => setStatus(null)} className="ml-2 opacity-30 hover:opacity-100">
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            )}

            {loading && (
                <div className="fixed inset-0 bg-white/60 backdrop-blur-sm z-[100] flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-gray-900 border-t-transparent rounded-full animate-spin" />
                        <p className="text-xs font-black text-gray-900 uppercase tracking-[0.3em] animate-pulse">Intelligent Data Resolution...</p>
                    </div>
                </div>
            )}
        </div>
    )
}
