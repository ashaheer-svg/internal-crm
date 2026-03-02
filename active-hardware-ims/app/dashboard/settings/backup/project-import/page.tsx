"use client"

import { useState, useEffect, useMemo, useRef, memo, useCallback } from "react"
import {
    Upload, Check, X, AlertCircle, CheckCircle2, FileText, Trash2, ShieldCheck,
    Users, Briefcase, Download, ClipboardPaste, LayoutDashboard, Search,
    ListFilter, ArrowRight, ArrowLeft, Globe, ExternalLink, RefreshCw,
    ChevronRight, Layers, Link2
} from "lucide-react"
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
    stage: string
    approved: boolean
}

type EntitySuggestion = { id: string, name: string, score: number }

type UnresolvedEntity = {
    input: string
    count: number
    type: 'CUSTOMER' | 'PARTNER'
    match: EntitySuggestion | null
    suggestions: EntitySuggestion[]
}

type ResolvedEntity = {
    id: string | 'NEW'
    customName?: string
    name: string
    type: 'CUSTOMER' | 'PARTNER'
}

type ResolutionState = Record<string, ResolvedEntity>
type Status = { type: 'success' | 'error' | 'info', message: string } | null

// ── Memoized Row ──────────────────────────────────────────────────────────────
const ProjectRow = memo(({ row, onToggleApproval, onRemove }: {
    row: LegacyProjectRow
    onToggleApproval: (id: string) => void
    onRemove: (id: string) => void
}) => (
    <tr className={cn("group transition-colors hover:bg-gray-50/70 border-b border-gray-50", !row.approved && "opacity-50 grayscale-[0.9]")}>
        <td className="px-3 py-1.5">
            <button onClick={() => onToggleApproval(row.id)} className={cn("w-5 h-5 rounded flex items-center justify-center border transition-all", row.approved ? "bg-emerald-500 border-emerald-500 text-white" : "bg-white border-gray-200")}>
                {row.approved && <Check className="w-3 h-3" />}
            </button>
        </td>
        <td className="px-3 py-1.5"><span className="text-[10px] font-black text-gray-900 block truncate max-w-[180px]" title={row.customerName}>{row.customerName}</span><span className="text-[9px] text-gray-400">{row.date}</span></td>
        <td className="px-3 py-1.5"><span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded uppercase", row.stage === 'WON' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600')}>{row.stage}</span></td>
        <td className="px-3 py-1.5"><span className="text-[10px] text-gray-500 truncate max-w-[100px] block">{row.salesRepName || '—'}</span></td>
        <td className="px-3 py-1.5">{row.partnerName && <span className="text-[10px] font-black text-blue-600 truncate max-w-[110px] block">{row.partnerName}</span>}</td>
        <td className="px-3 py-1.5">{row.brand && <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-gray-900 text-white uppercase">{row.brand}</span>}</td>
        <td className="px-3 py-1.5 text-right"><span className="text-[10px] font-black font-mono text-gray-900 whitespace-nowrap">${row.value.toLocaleString()}</span></td>
        <td className="px-3 py-1.5 text-center opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onRemove(row.id)} className="p-1 text-gray-300 hover:text-red-500 rounded transition-colors"><Trash2 className="w-3 h-3" /></button>
        </td>
    </tr>
))
ProjectRow.displayName = 'ProjectRow'

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ProjectImportPage() {
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
    const [unresolvedEntities, setUnresolvedEntities] = useState<UnresolvedEntity[]>([])
    const [resolutionMap, setResolutionMap] = useState<ResolutionState>({})
    // Wizard state
    const [wizardIndex, setWizardIndex] = useState(0)
    const [wizardSearchQuery, setWizardSearchQuery] = useState("")
    const [wizardSearchResults, setWizardSearchResults] = useState<any[]>([])
    const [wizardSearchLoading, setWizardSearchLoading] = useState(false)
    const [customNameInput, setCustomNameInput] = useState("")
    const [wizardMode, setWizardMode] = useState<'suggest' | 'search' | 'create'>('suggest')
    // Sort state
    const [sortKey, setSortKey] = useState<'date' | 'customerName' | 'value'>('date')
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => { fetchPipelines() }, [])

    async function fetchPipelines() {
        try {
            const res = await fetch('/api/crm/pipelines')
            if (res.ok) {
                const data = await res.json()
                setPipelines(data)
                const def = data.find((p: any) => p.isDefault) || data[0]
                if (def) setSelectedPipelineId(def.id)
            }
        } catch (e) { console.error("Failed to fetch pipelines", e) }
    }

    const generateId = useCallback(() => Math.random().toString(36).substring(2, 11), [])
    const toggleApproval = useCallback((id: string) => setRows(prev => prev.map(r => r.id === id ? { ...r, approved: !r.approved } : r)), [])
    const removeRow = useCallback((id: string) => setRows(prev => prev.filter(r => r.id !== id)), [])
    const toggleSort = (key: 'date' | 'customerName' | 'value') => {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        else { setSortKey(key); setSortDir('desc') }
    }

    async function handleDownloadTemplate() {
        try {
            const res = await fetch('/api/crm/projects/import')
            if (!res.ok) throw new Error('Failed to download template')
            const blob = await res.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a'); a.href = url; a.download = 'legacy_project_import_template.csv'
            document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url); document.body.removeChild(a)
        } catch (error: any) { setStatus({ type: 'error', message: error.message }) }
    }

    function parseDataString(text: string): LegacyProjectRow[] {
        return text.trim().split('\n').reduce<LegacyProjectRow[]>((acc, line) => {
            const parts = line.includes('\t') ? line.split('\t') : line.split(',')
            if (parts.length < 2) return acc
            const [date, customer, partner, brand, rep, stage, val] = parts.map(p => p.trim())
            acc.push({
                id: generateId(), date: date || new Date().toISOString().split('T')[0],
                customerName: customer || "", partnerName: partner || "", brand: brand || "",
                salesRepName: rep || "", stage: (stage || "Lead").toUpperCase(),
                value: parseFloat(val) || defaultValue, approved: true
            })
            return acc
        }, [])
    }

    async function startResolution(newRows: LegacyProjectRow[]) {
        setLoading(true)
        try {
            const namesMap: Record<string, { count: number, type: 'CUSTOMER' | 'PARTNER' }> = {}
            newRows.forEach(row => {
                if (row.customerName) namesMap[row.customerName] = { count: (namesMap[row.customerName]?.count || 0) + 1, type: 'CUSTOMER' }
                if (row.partnerName) namesMap[row.partnerName] = { count: (namesMap[row.partnerName]?.count || 0) + 1, type: 'PARTNER' }
            })
            const uniqueNames = Object.keys(namesMap)
            const res = await fetch('/api/crm/projects/import/resolve-entities', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ names: uniqueNames })
            })
            const data = await res.json()
            const results: UnresolvedEntity[] = data.results.map((r: any) => ({
                ...r, count: namesMap[r.input].count, type: namesMap[r.input].type
            })).sort((a: UnresolvedEntity, b: UnresolvedEntity) => b.count - a.count)

            setUnresolvedEntities(results)
            // Auto-resolve very high confidence matches
            const initialMap: ResolutionState = {}
            results.forEach(r => {
                if (r.match && r.match.score > 0.97) {
                    initialMap[r.input] = { id: r.match.id, name: r.match.name, type: r.type }
                }
            })
            setResolutionMap(initialMap)
            setWizardIndex(0)
            setWizardMode('suggest')
            setCustomNameInput("")
            setStep('resolve')
        } catch (error: any) {
            setStatus({ type: 'error', message: 'Failed to analyse data: ' + error.message })
        } finally { setLoading(false) }
    }

    function handleParseClipboard() {
        if (!pasteText.trim()) return
        const newRows = parseDataString(pasteText)
        if (newRows.length > 0) { setRows(newRows); setPasteText(""); startResolution(newRows) }
    }

    function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]; if (!file) return
        setLoading(true)
        const onComplete = (parsed: LegacyProjectRow[]) => { setRows(parsed); startResolution(parsed) }
        if (file.name.endsWith('.csv')) {
            Papa.parse(file, {
                header: true, skipEmptyLines: true,
                complete: (results) => onComplete(results.data.map((item: any) => ({
                    id: generateId(), date: item.date || new Date().toISOString().split('T')[0],
                    customerName: item.customerName || "", partnerName: item.partnerName || "",
                    brand: item.brand || "", salesRepName: item.salesRepName || "",
                    stage: (item.stage || "Lead").toUpperCase(), value: parseFloat(item.value) || defaultValue, approved: true
                }))),
                error: (err) => { setStatus({ type: 'error', message: err.message }); setLoading(false) }
            })
        } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
            const reader = new FileReader()
            reader.onload = (evt) => {
                try {
                    const wb = XLSX.read(evt.target?.result, { type: 'binary' })
                    const ws = wb.Sheets[wb.SheetNames[0]]
                    onComplete((XLSX.utils.sheet_to_json(ws) as any[]).map(item => ({
                        id: generateId(), date: item.date || new Date().toISOString().split('T')[0],
                        customerName: item.customerName || "", partnerName: item.partnerName || "",
                        brand: item.brand || "", salesRepName: item.salesRepName || "",
                        stage: (item.stage || "Lead").toUpperCase(), value: parseFloat(item.value) || defaultValue, approved: true
                    })))
                } catch (err: any) { setStatus({ type: 'error', message: err.message }); setLoading(false) }
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
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projects: approvedRows, pipelineId: selectedPipelineId, entityMap: resolutionMap })
            })
            const result = await res.json()
            if (!res.ok) throw new Error(result.error)
            setStatus({ type: 'success', message: result.message })
            setRows([]); setStep('setup')
        } catch (error: any) { setStatus({ type: 'error', message: error.message }) }
        finally { setImporting(false) }
    }

    async function handleWizardSearch(query: string) {
        setWizardSearchQuery(query)
        if (!query || query.length < 2) { setWizardSearchResults([]); return }
        setWizardSearchLoading(true)
        try {
            const res = await fetch(`/api/customers?search=${encodeURIComponent(query)}&limit=8`)
            if (res.ok) { const data = await res.json(); setWizardSearchResults(data.customers || []) }
        } catch (e) { console.error("Search failed", e) }
        finally { setWizardSearchLoading(false) }
    }

    // Wizard helpers
    const currentEntity = unresolvedEntities[wizardIndex]
    const currentResolution = currentEntity ? resolutionMap[currentEntity.input] : null

    function resolveCurrentAs(resolution: ResolvedEntity) {
        setResolutionMap(prev => ({ ...prev, [currentEntity.input]: resolution }))
    }

    function handleWizardNext() {
        // Move to next unresolved or skip to next
        let next = wizardIndex + 1
        setWizardIndex(next)
        setWizardMode('suggest')
        setWizardSearchQuery("")
        setWizardSearchResults([])
        setCustomNameInput("")
    }

    function handleWizardBack() {
        if (wizardIndex > 0) {
            setWizardIndex(wizardIndex - 1)
            setWizardMode('suggest')
            setWizardSearchQuery("")
            setWizardSearchResults([])
            setCustomNameInput("")
        }
    }

    const resolvedCount = Object.keys(resolutionMap).length
    const totalEntities = unresolvedEntities.length
    const progressPct = totalEntities > 0 ? (resolvedCount / totalEntities) * 100 : 0

    const filteredRows = useMemo(() => {
        let result = rows
        if (searchQuery) {
            const low = searchQuery.toLowerCase()
            result = rows.filter(r => r.customerName.toLowerCase().includes(low) || r.brand?.toLowerCase().includes(low) || r.salesRepName?.toLowerCase().includes(low))
        }
        return [...result].sort((a, b) => {
            const vA: any = sortKey === 'customerName' ? a[sortKey].toLowerCase() : a[sortKey]
            const vB: any = sortKey === 'customerName' ? b[sortKey].toLowerCase() : b[sortKey]
            if (vA < vB) return sortDir === 'asc' ? -1 : 1
            if (vA > vB) return sortDir === 'asc' ? 1 : -1
            return 0
        })
    }, [rows, searchQuery, sortKey, sortDir])

    const stats = useMemo(() => {
        const approved = rows.filter(r => r.approved)
        return { total: rows.length, approved: approved.length, value: approved.reduce((s, r) => s + r.value, 0) }
    }, [rows])

    const SortIcon = ({ col }: { col: 'date' | 'customerName' | 'value' }) => (
        <ListFilter className={cn("w-2.5 h-2.5 ml-1 inline-block transition-all opacity-0 group-hover/th:opacity-100", sortKey === col && "opacity-100 text-blue-500", sortKey === col && sortDir === 'asc' && "rotate-180")} />
    )

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="max-w-[1600px] mx-auto space-y-4 pb-20 px-4">

            {/* ── Header ── */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-blue-50 rounded-xl"><LayoutDashboard className="w-6 h-6 text-blue-600" /></div>
                    <div>
                        <h1 className="text-xl font-black text-gray-900 tracking-tight">Project Importer</h1>
                        {step === 'setup' && <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Step 1 of 3 — Upload Data</p>}
                        {step === 'resolve' && <p className="text-[10px] text-amber-500 font-bold uppercase tracking-widest">Step 2 of 3 — Entity Review ({resolvedCount}/{totalEntities} Resolved)</p>}
                        {step === 'preview' && <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Step 3 of 3 — Preview & Import</p>}
                    </div>
                </div>
                {step === 'preview' && (
                    <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                        <div className="bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">Pipeline</span>
                            <select className="text-xs font-black bg-transparent outline-none text-gray-900" value={selectedPipelineId} onChange={e => setSelectedPipelineId(e.target.value)}>
                                {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <button onClick={handleFinalImport} disabled={importing || stats.approved === 0} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gray-900 text-white text-xs font-black hover:bg-black transition-all shadow-lg disabled:opacity-50">
                            <ShieldCheck className="w-4 h-4" /> Finalize ({stats.approved})
                        </button>
                        <button onClick={() => { setRows([]); setStep('setup') }} className="p-3 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-all"><Trash2 className="w-4 h-4" /></button>
                    </div>
                )}
            </div>

            {/* ── Step 1: Setup ── */}
            {step === 'setup' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8 flex flex-col items-center justify-center min-h-[350px] text-center">
                        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-5"><Upload className="w-8 h-8 text-blue-600" /></div>
                        <h2 className="text-xl font-black text-gray-900 mb-2">Upload File</h2>
                        <p className="text-xs text-gray-400 font-medium mb-6 max-w-xs uppercase tracking-wider">CSV or Excel (.xlsx / .xls)</p>
                        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
                            <button onClick={() => fileInputRef.current?.click()} className="flex-1 px-5 py-3 rounded-xl bg-blue-600 text-white text-xs font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-100">Browse Files</button>
                            <button onClick={handleDownloadTemplate} className="flex-1 px-5 py-3 rounded-xl bg-white border border-gray-200 text-gray-600 text-xs font-black hover:border-blue-400 hover:text-blue-600 transition-all flex items-center justify-center gap-2"><Download className="w-3.5 h-3.5" /> Template</button>
                        </div>
                        <input type="file" ref={fileInputRef} className="hidden" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} />
                    </div>
                    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8 space-y-4">
                        <div className="flex items-center gap-3"><ClipboardPaste className="w-5 h-5 text-amber-600" /><h2 className="text-lg font-black text-gray-900">Direct Paste</h2></div>
                        <textarea className="w-full h-36 px-5 py-3 rounded-2xl border border-gray-100 bg-gray-50/50 text-[10px] font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none" placeholder="Paste CSV/TSV rows here..." value={pasteText} onChange={e => setPasteText(e.target.value)} />
                        <div className="flex items-center gap-3">
                            <FormattedNumberInput value={defaultValue} onChange={setDefaultValue} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-100 bg-white text-xs font-black shadow-sm" placeholder="Fallback Value" />
                            <button onClick={handleParseClipboard} className="px-6 py-2.5 rounded-xl bg-gray-900 text-white text-xs font-black hover:bg-black transition-all shadow-lg">Process</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Step 2: Resolve — Card Wizard ── */}
            {step === 'resolve' && (
                <div className="space-y-4">
                    {/* Progress Bar */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <Layers className="w-5 h-5 text-amber-500" />
                                <div>
                                    <h2 className="text-sm font-black text-gray-900">Entity Review</h2>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">Match each company to an existing or new account</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-black text-gray-500">{resolvedCount}/{totalEntities} done</span>
                                {resolvedCount === totalEntities && (
                                    <button onClick={() => setStep('preview')} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-white text-xs font-black hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100">
                                        <Check className="w-4 h-4" /> All Done — Preview Import
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
                        </div>
                        {/* Mini strip of all entities */}
                        <div className="flex flex-wrap gap-1.5 mt-4">
                            {unresolvedEntities.map((e, idx) => {
                                const res = resolutionMap[e.input]
                                return (
                                    <button key={idx} onClick={() => { setWizardIndex(idx); setWizardMode('suggest'); setWizardSearchQuery(""); setWizardSearchResults([]) }}
                                        title={e.input}
                                        className={cn(
                                            "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter border transition-all max-w-[130px] truncate",
                                            wizardIndex === idx ? "border-blue-500 bg-blue-50 text-blue-700" :
                                                res ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-gray-100 bg-white text-gray-500 hover:border-gray-300"
                                        )}>
                                        {res ? <Check className="w-2.5 h-2.5 shrink-0" /> : (e.type === 'PARTNER' ? <Briefcase className="w-2.5 h-2.5 shrink-0" /> : <Users className="w-2.5 h-2.5 shrink-0" />)}
                                        <span className="truncate">{e.input}</span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Wizard Card */}
                    {currentEntity && (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            {/* Card Header */}
                            <div className={cn("p-6 border-b border-gray-50", currentEntity.type === 'PARTNER' ? 'bg-blue-50/60' : 'bg-gray-50/60')}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm", currentEntity.type === 'PARTNER' ? 'bg-blue-500 text-white' : 'bg-gray-800 text-white')}>
                                            {currentEntity.type === 'PARTNER' ? <Briefcase className="w-6 h-6" /> : <Users className="w-6 h-6" />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{currentEntity.type}</span>
                                                <span className="text-[9px] font-black bg-gray-900 text-white px-1.5 py-0.5 rounded uppercase">{currentEntity.count} rows</span>
                                            </div>
                                            <h2 className="text-2xl font-black text-gray-900 leading-none">{currentEntity.input}</h2>
                                            {currentResolution && (
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Check className="w-3 h-3 text-emerald-500" />
                                                    <span className="text-[10px] font-black text-emerald-600">
                                                        {currentResolution.id === 'NEW'
                                                            ? `Will create: "${currentResolution.customName || currentResolution.name}"`
                                                            : `Linked to: "${currentResolution.name}"`}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <a href={`https://www.google.com/search?q=${encodeURIComponent(currentEntity.input + ' Sri Lanka company registrar')}`} target="_blank"
                                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-[10px] font-black text-gray-500 hover:text-emerald-600 hover:border-emerald-200 transition-all">
                                        <Globe className="w-3.5 h-3.5" /> Verify SL <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>
                            </div>

                            {/* Mode Switcher Tabs */}
                            <div className="flex border-b border-gray-100">
                                {(['suggest', 'search', 'create'] as const).map(mode => (
                                    <button key={mode} onClick={() => { setWizardMode(mode); setWizardSearchQuery(""); setWizardSearchResults([]) }}
                                        className={cn("flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all",
                                            wizardMode === mode ? "bg-white border-b-2 border-blue-600 text-blue-700" : "text-gray-400 hover:text-gray-600 bg-gray-50/50")}>
                                        {mode === 'suggest' && '🎯 Smart Suggestions'}
                                        {mode === 'search' && '🔍 Search Database'}
                                        {mode === 'create' && '✨ Create New'}
                                    </button>
                                ))}
                            </div>

                            {/* Mode: Suggestions */}
                            {wizardMode === 'suggest' && (
                                <div className="p-6 space-y-3">
                                    {currentEntity.match && (
                                        <div className="mb-4">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Best Match</p>
                                            <button onClick={() => resolveCurrentAs({ id: currentEntity.match!.id, name: currentEntity.match!.name, type: currentEntity.type })}
                                                className={cn("w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all hover:shadow-md group",
                                                    currentResolution?.id === currentEntity.match.id ? "border-emerald-500 bg-emerald-50" : "border-gray-200 hover:border-blue-400")}>
                                                <div className="text-left">
                                                    <p className="font-black text-gray-900 group-hover:text-blue-700">{currentEntity.match.name}</p>
                                                    <p className="text-[9px] text-gray-400 uppercase">{Math.round(currentEntity.match.score * 100)}% similarity</p>
                                                </div>
                                                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center transition-all",
                                                    currentResolution?.id === currentEntity.match.id ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-400 group-hover:bg-blue-500 group-hover:text-white")}>
                                                    <Check className="w-4 h-4" />
                                                </div>
                                            </button>
                                        </div>
                                    )}
                                    {currentEntity.suggestions.length > 0 && (
                                        <div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{currentEntity.match ? 'Other Matches' : 'Possible Matches'}</p>
                                            <div className="space-y-2">
                                                {currentEntity.suggestions.map(sug => (
                                                    <button key={sug.id} onClick={() => resolveCurrentAs({ id: sug.id, name: sug.name, type: currentEntity.type })}
                                                        className={cn("w-full flex items-center justify-between p-3 rounded-xl border transition-all hover:shadow-sm group",
                                                            currentResolution?.id === sug.id ? "border-emerald-300 bg-emerald-50" : "border-gray-100 hover:border-blue-300")}>
                                                        <div className="text-left">
                                                            <p className="text-sm font-black text-gray-700 group-hover:text-blue-700">{sug.name}</p>
                                                            <p className="text-[9px] text-gray-400 uppercase">{Math.round(sug.score * 100)}% similarity</p>
                                                        </div>
                                                        {currentResolution?.id === sug.id && <Check className="w-4 h-4 text-emerald-500" />}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {!currentEntity.match && currentEntity.suggestions.length === 0 && (
                                        <div className="flex flex-col items-center justify-center py-10 text-center">
                                            <AlertCircle className="w-10 h-10 text-gray-200 mb-3" />
                                            <p className="text-sm font-black text-gray-400">No similar entries found in database</p>
                                            <p className="text-[10px] text-gray-300 mt-1">Use Search or Create New to proceed</p>
                                        </div>
                                    )}
                                    <button onClick={() => resolveCurrentAs({ id: 'NEW', name: currentEntity.input, type: currentEntity.type })}
                                        className={cn("w-full mt-2 p-3 rounded-xl border-2 border-dashed text-sm font-black transition-all",
                                            currentResolution?.id === 'NEW' && !currentResolution.customName ? "border-purple-400 bg-purple-50 text-purple-700" : "border-gray-200 text-gray-400 hover:border-purple-400 hover:text-purple-600")}>
                                        + Create New as "{currentEntity.input}"
                                    </button>
                                </div>
                            )}

                            {/* Mode: Manual Search */}
                            {wizardMode === 'search' && (
                                <div className="p-6 space-y-4">
                                    <div className="relative">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                        <input autoFocus type="text" placeholder="Type to search your database..." value={wizardSearchQuery} onChange={e => handleWizardSearch(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-sm font-black text-gray-900 placeholder:text-gray-300 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition-all" />
                                        {wizardSearchLoading && <RefreshCw className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400 animate-spin" />}
                                    </div>
                                    <div className="space-y-2 max-h-[300px] overflow-auto">
                                        {wizardSearchResults.map(s => (
                                            <button key={s.id} onClick={() => resolveCurrentAs({ id: s.id, name: s.name, type: currentEntity.type })}
                                                className={cn("w-full flex items-center justify-between p-4 rounded-xl border transition-all group hover:shadow-sm",
                                                    currentResolution?.id === s.id ? "border-emerald-300 bg-emerald-50" : "border-gray-100 hover:border-blue-300")}>
                                                <div className="text-left">
                                                    <p className="font-black text-gray-900 group-hover:text-blue-700">{s.name}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        {s.isPartner && <span className="text-[9px] font-black text-blue-500 uppercase">Partner</span>}
                                                        {s.isCustomer && <span className="text-[9px] font-black text-gray-500 uppercase">Customer</span>}
                                                        {s.email && <span className="text-[9px] text-gray-400">{s.email}</span>}
                                                    </div>
                                                </div>
                                                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all", currentResolution?.id === s.id ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-300 group-hover:bg-blue-500 group-hover:text-white")}>
                                                    <Link2 className="w-4 h-4" />
                                                </div>
                                            </button>
                                        ))}
                                        {wizardSearchQuery.length >= 2 && wizardSearchResults.length === 0 && !wizardSearchLoading && (
                                            <p className="text-center text-xs text-gray-400 py-6">No results found for "{wizardSearchQuery}"</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Mode: Create New with Custom Name */}
                            {wizardMode === 'create' && (
                                <div className="p-6 space-y-4">
                                    <p className="text-xs text-gray-400 uppercase tracking-widest font-black">Create a new entry with a custom name</p>
                                    <p className="text-sm text-gray-600">For example, expand abbreviations: <span className="font-black text-gray-900">"{currentEntity.input}"</span> → full legal name</p>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Display Name for New Entry</label>
                                        <input type="text" autoFocus placeholder={`e.g. "${currentEntity.input} (Full Legal Name)"`} value={customNameInput} onChange={e => setCustomNameInput(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-black text-gray-900 placeholder:text-gray-300 outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-50 transition-all" />
                                    </div>
                                    <button
                                        onClick={() => {
                                            const name = customNameInput.trim() || currentEntity.input
                                            resolveCurrentAs({ id: 'NEW', customName: name, name, type: currentEntity.type })
                                        }}
                                        disabled={!customNameInput.trim()}
                                        className="w-full py-3 rounded-xl bg-purple-600 text-white text-sm font-black hover:bg-purple-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        Confirm: Create "{customNameInput || currentEntity.input}"
                                    </button>
                                    <button onClick={() => resolveCurrentAs({ id: 'NEW', name: currentEntity.input, type: currentEntity.type })}
                                        className="w-full py-2.5 rounded-xl border border-gray-200 text-gray-500 text-xs font-black hover:bg-gray-50 transition-all">
                                        Use original name "{currentEntity.input}"
                                    </button>
                                </div>
                            )}

                            {/* Navigation Footer */}
                            <div className="flex items-center justify-between p-5 border-t border-gray-50 bg-gray-50/40">
                                <button onClick={handleWizardBack} disabled={wizardIndex === 0}
                                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black text-gray-500 hover:bg-white hover:shadow-sm transition-all disabled:opacity-30">
                                    <ArrowLeft className="w-4 h-4" /> Previous
                                </button>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{wizardIndex + 1} / {totalEntities}</span>
                                <button onClick={handleWizardNext} disabled={wizardIndex >= totalEntities - 1}
                                    className={cn("flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all",
                                        currentResolution ? "bg-blue-600 text-white hover:bg-blue-700 shadow-md" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                                    )}>
                                    {wizardIndex >= totalEntities - 1 ? 'Done' : 'Next'} <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── Step 3: Preview ── */}
            {step === 'preview' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { icon: <FileText className="w-5 h-5 text-blue-400" />, val: stats.total, label: 'Total' },
                            { icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />, val: stats.approved, label: 'Approved', green: true },
                            { icon: <Briefcase className="w-5 h-5 text-blue-400" />, val: `$${stats.value.toLocaleString()}`, label: 'Value' },
                        ].map((s, i) => (
                            <div key={i} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3">
                                {s.icon}
                                <div>
                                    <p className={cn("text-lg font-black leading-none", (s as any).green ? "text-emerald-600" : "text-gray-900")}>{s.val}</p>
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">{s.label}</p>
                                </div>
                            </div>
                        ))}
                        <div className="bg-gray-50 flex items-center gap-3 px-4 rounded-xl border border-gray-100">
                            <Search className="w-4 h-4 text-gray-400 shrink-0" />
                            <input type="text" placeholder="Search..." className="bg-transparent text-[10px] font-black w-full outline-none uppercase placeholder:text-gray-400" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col" style={{ maxHeight: '70vh' }}>
                        <div className="px-5 py-3 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
                            <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Validation Queue</span>
                            <div className="flex items-center gap-4">
                                <button onClick={() => setRows(rows.map(r => ({ ...r, approved: true })))} className="text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest">Approve All</button>
                                <div className="w-px h-3 bg-gray-200" />
                                <button onClick={() => setRows(rows.map(r => ({ ...r, approved: false })))} className="text-[10px] font-black text-gray-400 hover:text-red-500 uppercase tracking-widest transition-colors">Reject All</button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-auto">
                            <table className="w-full text-left border-separate border-spacing-0">
                                <thead className="sticky top-0 bg-white z-10 shadow-sm">
                                    <tr>
                                        <th className="px-3 py-2.5 text-[9px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-50 bg-white">OK</th>
                                        <th className="px-3 py-2.5 text-[9px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-50 bg-white cursor-pointer hover:bg-gray-50 group/th" onClick={() => toggleSort('customerName')}>
                                            Customer / Date <SortIcon col="customerName" />
                                        </th>
                                        <th className="px-3 py-2.5 text-[9px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-50 bg-white">Stage</th>
                                        <th className="px-3 py-2.5 text-[9px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-50 bg-white">Rep</th>
                                        <th className="px-3 py-2.5 text-[9px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-50 bg-white">Partner</th>
                                        <th className="px-3 py-2.5 text-[9px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-50 bg-white">Brand</th>
                                        <th className="px-3 py-2.5 text-[9px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-50 bg-white text-right cursor-pointer hover:bg-gray-50 group/th" onClick={() => toggleSort('value')}>
                                            Value <SortIcon col="value" />
                                        </th>
                                        <th className="px-3 py-2.5 text-[9px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-50 bg-white">X</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredRows.slice(0, 4100).map(row => <ProjectRow key={row.id} row={row} onToggleApproval={toggleApproval} onRemove={removeRow} />)}
                                    {filteredRows.length > 4100 && (
                                        <tr><td colSpan={8} className="px-8 py-4 text-center bg-gray-50 text-[10px] font-black text-gray-400 uppercase">{filteredRows.length - 4100} more rows hidden for UI performance</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Status Toast ── */}
            {status && (
                <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-right-6">
                    <div className={cn("px-5 py-3 rounded-2xl flex items-center gap-3 border shadow-xl", status.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-red-50 border-red-100 text-red-800')}>
                        <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center", status.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white')}>
                            {status.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-tight">{status.message}</span>
                        <button onClick={() => setStatus(null)} className="ml-2 opacity-40 hover:opacity-100"><X className="w-3 h-3" /></button>
                    </div>
                </div>
            )}

            {/* ── Loading Overlay ── */}
            {loading && (
                <div className="fixed inset-0 bg-white/70 backdrop-blur-sm z-[100] flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-gray-900 border-t-transparent rounded-full animate-spin" />
                        <p className="text-xs font-black text-gray-900 uppercase tracking-[0.3em] animate-pulse">Analysing Data...</p>
                    </div>
                </div>
            )}
        </div>
    )
}
