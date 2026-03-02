"use client"

import { useState, useEffect, useMemo, useRef, memo, useCallback } from "react"
import {
    Upload, Check, X, AlertCircle, CheckCircle2, FileText, Trash2, ShieldCheck,
    Users, Briefcase, Download, ClipboardPaste, LayoutDashboard, Search,
    ListFilter, ArrowRight, ArrowLeft, Globe, ExternalLink, RefreshCw,
    Layers, Link2, Plus, Sparkles
} from "lucide-react"
import FormattedNumberInput from "@/components/FormattedNumberInput"
import { cn } from "@/lib/utils"
import Papa from "papaparse"
import * as XLSX from "xlsx"

// ── Types ─────────────────────────────────────────────────────────────────────
type LegacyProjectRow = {
    id: string; date: string; customerName: string; partnerName?: string
    brand?: string; salesRepName?: string; value: number; stage: string; approved: boolean
}
type EntitySuggestion = { id: string; name: string; score: number }
type UnresolvedEntity = {
    input: string; count: number; type: 'CUSTOMER' | 'PARTNER'
    match: EntitySuggestion | null; suggestions: EntitySuggestion[]
}
// After resolution, every entry has a REAL database ID
type ResolvedEntity = {
    id: string           // Always a real DB id — created immediately
    name: string         // Display name resolved or created
    type: 'CUSTOMER' | 'PARTNER'
    isNew?: boolean      // True if we just created it during wizard
}
type ResolutionMap = Record<string, ResolvedEntity>
type Status = { type: 'success' | 'error' | 'info'; message: string } | null

// ── Memoized Preview Row ───────────────────────────────────────────────────────
const ProjectRow = memo(({ row, onToggleApproval, onRemove }: {
    row: LegacyProjectRow; onToggleApproval: (id: string) => void; onRemove: (id: string) => void
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

    // Wizard state
    const [entities, setEntities] = useState<UnresolvedEntity[]>([])
    const [resolutionMap, setResolutionMap] = useState<ResolutionMap>({})
    const [wizardIdx, setWizardIdx] = useState(0)
    const [wizardTab, setWizardTab] = useState<'suggest' | 'search' | 'create'>('suggest')
    const [searchQ, setSearchQ] = useState("")
    const [searchResults, setSearchResults] = useState<any[]>([])
    const [searchLoading, setSearchLoading] = useState(false)
    const [customName, setCustomName] = useState("")
    const [creating, setCreating] = useState(false)

    // Preview state
    const [previewSearch, setPreviewSearch] = useState("")
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
    const toggleApproval = useCallback((id: string) => setRows(p => p.map(r => r.id === id ? { ...r, approved: !r.approved } : r)), [])
    const removeRow = useCallback((id: string) => setRows(p => p.filter(r => r.id !== id)), [])

    function resetWizardTab() {
        setWizardTab('suggest'); setSearchQ(""); setSearchResults([]); setCustomName("")
    }

    function goNext() { if (wizardIdx < entities.length - 1) { setWizardIdx(i => i + 1); resetWizardTab() } }
    function goBack() { if (wizardIdx > 0) { setWizardIdx(i => i - 1); resetWizardTab() } }

    function handleSkip(entity: UnresolvedEntity) {
        resolveAs(entity, { id: 'SKIP', name: entity.input, type: entity.type })
        goNext()
    }

    function resolveAs(entity: UnresolvedEntity, resolved: ResolvedEntity) {
        setResolutionMap(prev => ({ ...prev, [entity.input]: resolved }))
    }

    // ── Immediate entity creation ─────────────────────────────────────────────
    async function handleCreateNow(entity: UnresolvedEntity, nameToUse: string) {
        if (!nameToUse.trim()) return
        setCreating(true)
        try {
            const res = await fetch('/api/customers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: nameToUse.trim(),
                    isCustomer: entity.type === 'CUSTOMER',
                    isPartner: entity.type === 'PARTNER',
                })
            })
            if (!res.ok) {
                const err = await res.json()
                setStatus({ type: 'error', message: err.error || 'Failed to create entry' })
                return
            }
            const created = await res.json()
            // Store real ID — this entity is now in the DB
            resolveAs(entity, { id: created.id, name: created.name, type: entity.type, isNew: true })
            setCustomName("")
            goNext() // Auto-advance after creation
        } catch (e: any) {
            setStatus({ type: 'error', message: e.message })
        } finally {
            setCreating(false)
        }
    }

    // ── Live search ───────────────────────────────────────────────────────────
    async function handleSearch(q: string) {
        setSearchQ(q)
        if (!q || q.length < 2) { setSearchResults([]); return }
        setSearchLoading(true)
        try {
            const res = await fetch(`/api/customers?search=${encodeURIComponent(q)}&limit=10`)
            if (res.ok) { const d = await res.json(); setSearchResults(d.customers || []) }
        } catch (e) { console.error("Search failed", e) }
        finally { setSearchLoading(false) }
    }

    // ── File parsing + resolution start ───────────────────────────────────────
    async function startResolution(newRows: LegacyProjectRow[]) {
        setLoading(true)
        try {
            const namesMap: Record<string, { count: number; type: 'CUSTOMER' | 'PARTNER' }> = {}
            newRows.forEach(row => {
                if (row.customerName) namesMap[row.customerName] = { count: (namesMap[row.customerName]?.count || 0) + 1, type: 'CUSTOMER' }
                if (row.partnerName) namesMap[row.partnerName] = { count: (namesMap[row.partnerName]?.count || 0) + 1, type: 'PARTNER' }
            })
            const res = await fetch('/api/crm/projects/import/resolve-entities', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ names: Object.keys(namesMap) })
            })
            const data = await res.json()
            const results: UnresolvedEntity[] = data.results
                .map((r: any) => ({ ...r, count: namesMap[r.input].count, type: namesMap[r.input].type }))
                .sort((a: UnresolvedEntity, b: UnresolvedEntity) => b.count - a.count)

            setEntities(results)
            // Auto-resolve near-exact matches (>97%)
            const autoMap: ResolutionMap = {}
            results.forEach(r => {
                if (r.match && r.match.score > 0.97) {
                    autoMap[r.input] = { id: r.match.id, name: r.match.name, type: r.type }
                }
            })
            setResolutionMap(autoMap)
            setWizardIdx(0); resetWizardTab()
            setStep('resolve')
        } catch (e: any) {
            setStatus({ type: 'error', message: 'Analysis failed: ' + e.message })
        } finally { setLoading(false) }
    }

    function parseText(text: string): LegacyProjectRow[] {
        return text.trim().split('\n').reduce<LegacyProjectRow[]>((acc, line) => {
            const parts = line.includes('\t') ? line.split('\t') : line.split(',')
            if (parts.length < 2) return acc
            const [date, customer, partner, brand, rep, stage, val] = parts.map(p => p.trim())
            acc.push({ id: generateId(), date: date || new Date().toISOString().split('T')[0], customerName: customer || "", partnerName: partner || "", brand: brand || "", salesRepName: rep || "", stage: (stage || "Lead").toUpperCase(), value: parseFloat(val) || defaultValue, approved: true })
            return acc
        }, [])
    }

    function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]; if (!file) return
        setLoading(true)
        const done = (parsed: LegacyProjectRow[]) => { setRows(parsed); startResolution(parsed) }
        if (file.name.endsWith('.csv')) {
            Papa.parse(file, {
                header: true, skipEmptyLines: true,
                complete: r => done(r.data.map((item: any) => ({ id: generateId(), date: item.date || new Date().toISOString().split('T')[0], customerName: item.customerName || "", partnerName: item.partnerName || "", brand: item.brand || "", salesRepName: item.salesRepName || "", stage: (item.stage || "Lead").toUpperCase(), value: parseFloat(item.value) || defaultValue, approved: true }))),
                error: err => { setStatus({ type: 'error', message: err.message }); setLoading(false) }
            })
        } else {
            const reader = new FileReader()
            reader.onload = evt => {
                try {
                    const wb = XLSX.read(evt.target?.result, { type: 'binary' })
                    const ws = wb.Sheets[wb.SheetNames[0]]
                    done((XLSX.utils.sheet_to_json(ws) as any[]).map(item => ({ id: generateId(), date: item.date || new Date().toISOString().split('T')[0], customerName: item.customerName || "", partnerName: item.partnerName || "", brand: item.brand || "", salesRepName: item.salesRepName || "", stage: (item.stage || "Lead").toUpperCase(), value: parseFloat(item.value) || defaultValue, approved: true })))
                } catch (err: any) { setStatus({ type: 'error', message: err.message }); setLoading(false) }
            }
            reader.readAsBinaryString(file)
        }
        if (fileInputRef.current) fileInputRef.current.value = ""
    }

    // ── Final import — all entities already have real IDs ─────────────────────
    async function handleFinalImport() {
        const approvedRows = rows.filter(r => r.approved)
        if (!approvedRows.length) return
        setImporting(true)
        try {
            const res = await fetch('/api/crm/projects/import', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projects: approvedRows, pipelineId: selectedPipelineId, entityMap: resolutionMap })
            })
            const result = await res.json()
            if (!res.ok) throw new Error(result.error)
            setStatus({ type: 'success', message: result.message })
            setRows([]); setStep('setup'); setEntities([]); setResolutionMap({})
        } catch (e: any) { setStatus({ type: 'error', message: e.message }) }
        finally { setImporting(false) }
    }

    async function handleDownloadTemplate() {
        const res = await fetch('/api/crm/projects/import')
        const blob = await res.blob()
        const url = URL.createObjectURL(blob); const a = document.createElement('a')
        a.href = url; a.download = 'project_import_template.csv'
        document.body.appendChild(a); a.click(); URL.revokeObjectURL(url); a.remove()
    }

    // ── Derived values ────────────────────────────────────────────────────────
    const currentEntity = entities[wizardIdx]
    const currentResolution = currentEntity ? resolutionMap[currentEntity.input] : null
    const resolvedCount = Object.keys(resolutionMap).length
    const allResolved = resolvedCount === entities.length && entities.length > 0

    const filteredRows = useMemo(() => {
        let r = previewSearch ? rows.filter(r => r.customerName.toLowerCase().includes(previewSearch.toLowerCase()) || r.brand?.toLowerCase().includes(previewSearch.toLowerCase())) : rows
        return [...r].sort((a, b) => {
            const va: any = a[sortKey]; const vb: any = b[sortKey]
            if (va < vb) return sortDir === 'asc' ? -1 : 1
            if (va > vb) return sortDir === 'asc' ? 1 : -1
            return 0
        })
    }, [rows, previewSearch, sortKey, sortDir])

    const stats = useMemo(() => {
        const approved = rows.filter(r => r.approved)
        return { total: rows.length, approved: approved.length, value: approved.reduce((s, r) => s + r.value, 0) }
    }, [rows])

    function SortTh({ col, label, right }: { col: 'date' | 'customerName' | 'value'; label: string; right?: boolean }) {
        return (
            <th className={cn("px-3 py-2.5 text-[9px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-50 bg-white cursor-pointer hover:bg-gray-50 group/th select-none", right && "text-right")} onClick={() => { if (sortKey === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortKey(col); setSortDir('desc') } }}>
                {label}
                <ListFilter className={cn("w-2.5 h-2.5 ml-1 inline-block opacity-0 group-hover/th:opacity-60 transition-all", sortKey === col && "opacity-100 text-blue-500", sortKey === col && sortDir === 'asc' && "rotate-180")} />
            </th>
        )
    }

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="max-w-[1600px] mx-auto space-y-4 pb-20 px-4">

            {/* ── Header ── */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-blue-50 rounded-xl"><LayoutDashboard className="w-6 h-6 text-blue-600" /></div>
                    <div>
                        <h1 className="text-xl font-black text-gray-900 tracking-tight">Project Importer</h1>
                        <div className="flex items-center gap-2 mt-0.5">
                            {['Upload', 'Entity Review', 'Preview & Import'].map((label, i) => (
                                <div key={i} className="flex items-center gap-1.5">
                                    <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black border-2",
                                        (step === 'setup' && i === 0) || (step === 'resolve' && i === 1) || (step === 'preview' && i === 2) ? "border-blue-500 bg-blue-500 text-white" :
                                            (step === 'resolve' && i === 0) || (step === 'preview' && i < 2) ? "border-emerald-400 bg-emerald-50 text-emerald-600" : "border-gray-200 bg-white text-gray-400"
                                    )}>{i + 1}</div>
                                    <span className={cn("text-[10px] font-black uppercase tracking-tighter hidden sm:block",
                                        (step === 'setup' && i === 0) || (step === 'resolve' && i === 1) || (step === 'preview' && i === 2) ? "text-blue-600" : "text-gray-300")}>{label}</span>
                                    {i < 2 && <ChevronRightIcon />}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                {step === 'preview' && (
                    <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                        <div className="bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">Pipeline</span>
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

            {/* ── STEP 1: Setup ── */}
            {step === 'setup' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8 flex flex-col items-center justify-center min-h-[300px] text-center">
                        <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-5"><Upload className="w-7 h-7 text-blue-600" /></div>
                        <h2 className="text-xl font-black text-gray-900 mb-1">Upload File</h2>
                        <p className="text-xs text-gray-400 font-medium mb-6 uppercase tracking-wider">CSV or Excel (.xlsx / .xls)</p>
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
                            <button onClick={() => { const r = parseText(pasteText); if (r.length) { setRows(r); setPasteText(""); startResolution(r) } }} className="px-6 py-2.5 rounded-xl bg-gray-900 text-white text-xs font-black hover:bg-black transition-all">Process</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── STEP 2: Entity Resolution Wizard ── */}
            {step === 'resolve' && (
                <div className="space-y-4">
                    {/* Progress Header */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <Layers className="w-5 h-5 text-amber-500" />
                                <div>
                                    <h2 className="text-sm font-black text-gray-900">Entity Review — Process One at a Time</h2>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">Link to existing or create each company now before importing</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-black text-gray-500 uppercase">{resolvedCount}/{entities.length} resolved</span>
                                {allResolved && (
                                    <button onClick={() => setStep('preview')} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-white text-xs font-black hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100 animate-in zoom-in">
                                        <Check className="w-4 h-4" /> Review & Import
                                    </button>
                                )}
                            </div>
                        </div>
                        {/* Progress bar */}
                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-3">
                            <div className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500" style={{ width: `${entities.length > 0 ? (resolvedCount / entities.length) * 100 : 0}%` }} />
                        </div>
                        {/* Entity chips */}
                        <div className="flex flex-wrap gap-1.5">
                            {entities.map((e, idx) => {
                                const res = resolutionMap[e.input]
                                return (
                                    <button key={idx} onClick={() => { setWizardIdx(idx); resetWizardTab() }} title={e.input}
                                        className={cn("flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter border transition-all truncate max-w-[140px]",
                                            wizardIdx === idx ? "border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-200" :
                                                res?.id === 'SKIP' ? "border-gray-200 bg-gray-50 text-gray-400" :
                                                    res?.isNew ? "border-purple-200 bg-purple-50 text-purple-700" :
                                                        res ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-gray-100 bg-white text-gray-400 hover:border-gray-300"
                                        )}>
                                        {res?.id === 'SKIP' ? <ArrowRight className="w-2.5 h-2.5 shrink-0 opacity-50" /> : res?.isNew ? <Plus className="w-2.5 h-2.5 shrink-0" /> : res ? <Check className="w-2.5 h-2.5 shrink-0" /> : e.type === 'PARTNER' ? <Briefcase className="w-2.5 h-2.5 shrink-0" /> : <Users className="w-2.5 h-2.5 shrink-0" />}
                                        <span className="truncate">{e.input}</span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Wizard Card */}
                    {currentEntity && (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-visible">
                            {/* Entity Header */}
                            <div className={cn("p-6 border-b border-gray-50", currentEntity.type === 'PARTNER' ? 'bg-blue-50/50' : 'bg-gray-50/50')}>
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm shrink-0", currentEntity.type === 'PARTNER' ? 'bg-blue-500 text-white' : 'bg-gray-800 text-white')}>
                                            {currentEntity.type === 'PARTNER' ? <Briefcase className="w-6 h-6" /> : <Users className="w-6 h-6" />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                <span className={cn("text-[9px] font-black px-2 py-0.5 rounded uppercase", currentEntity.type === 'PARTNER' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600')}>{currentEntity.type}</span>
                                                <span className="text-[9px] font-black bg-gray-900 text-white px-1.5 py-0.5 rounded">{currentEntity.count} rows affected</span>
                                            </div>
                                            <h2 className="text-2xl font-black text-gray-900">{currentEntity.input}</h2>
                                            {currentResolution && (
                                                <div className={cn("flex items-center gap-1.5 mt-1.5 text-[10px] font-black", currentResolution.isNew ? "text-purple-600" : "text-emerald-600")}>
                                                    {currentResolution.isNew ? <Plus className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                                                    {currentResolution.isNew ? `Created: "${currentResolution.name}"` : `Linked to: "${currentResolution.name}"`}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <a href={`https://www.google.com/search?q=${encodeURIComponent(currentEntity.input + ' Sri Lanka company')}`} target="_blank"
                                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-[10px] font-black text-gray-500 hover:text-emerald-600 hover:border-emerald-200 transition-all shrink-0">
                                        <Globe className="w-3.5 h-3.5" /> Verify <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>
                            </div>

                            {/* Tabs */}
                            <div className="flex border-b border-gray-100">
                                {([['suggest', '🎯 Suggestions'], ['search', '🔍 Search DB'], ['create', '✨ Create Now']] as const).map(([tab, label]) => (
                                    <button key={tab} onClick={() => { setWizardTab(tab as any); setSearchQ(""); setSearchResults([]) }}
                                        className={cn("flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all",
                                            wizardTab === tab ? "border-b-2 border-blue-600 text-blue-700 bg-white" : "text-gray-400 hover:text-gray-600 bg-gray-50/50")}>
                                        {label}
                                    </button>
                                ))}
                            </div>

                            {/* Tab: Smart Suggestions */}
                            {wizardTab === 'suggest' && (
                                <div className="p-6 space-y-3 min-h-[280px]">
                                    {currentEntity.match && (
                                        <div>
                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Best Match</p>
                                            <button onClick={() => resolveAs(currentEntity, { id: currentEntity.match!.id, name: currentEntity.match!.name, type: currentEntity.type })}
                                                className={cn("w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all hover:shadow-md group",
                                                    currentResolution?.id === currentEntity.match.id ? "border-emerald-500 bg-emerald-50" : "border-gray-200 hover:border-blue-400")}>
                                                <div className="text-left">
                                                    <p className="font-black text-gray-900 group-hover:text-blue-700">{currentEntity.match.name}</p>
                                                    <p className="text-[9px] text-gray-400 uppercase">{Math.round(currentEntity.match.score * 100)}% similarity match</p>
                                                </div>
                                                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all",
                                                    currentResolution?.id === currentEntity.match.id ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-300 group-hover:bg-blue-500 group-hover:text-white")}>
                                                    <Check className="w-4 h-4" />
                                                </div>
                                            </button>
                                        </div>
                                    )}
                                    {currentEntity.suggestions.length > 0 && (
                                        <div>
                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">{currentEntity.match ? 'Other Candidates' : 'Possible Matches'}</p>
                                            <div className="space-y-2">
                                                {currentEntity.suggestions.map(sug => (
                                                    <button key={sug.id} onClick={() => resolveAs(currentEntity, { id: sug.id, name: sug.name, type: currentEntity.type })}
                                                        className={cn("w-full flex items-center justify-between p-3 rounded-xl border transition-all group",
                                                            currentResolution?.id === sug.id ? "border-emerald-300 bg-emerald-50" : "border-gray-100 hover:border-blue-300")}>
                                                        <div className="text-left">
                                                            <p className="text-sm font-black text-gray-700 group-hover:text-blue-700">{sug.name}</p>
                                                            <p className="text-[9px] text-gray-400">{Math.round(sug.score * 100)}% match</p>
                                                        </div>
                                                        {currentResolution?.id === sug.id && <Check className="w-4 h-4 text-emerald-500" />}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {!currentEntity.match && currentEntity.suggestions.length === 0 && (
                                        <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                                            <Sparkles className="w-8 h-8 text-gray-200" />
                                            <p className="text-sm font-black text-gray-400">No similar records found</p>
                                            <p className="text-[10px] text-gray-300">Use Search to find an existing record, or Create Now to add it to the database</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Tab: Search Database */}
                            {wizardTab === 'search' && (
                                <div className="p-6 space-y-4 min-h-[280px]">
                                    <div className="relative">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                        <input autoFocus type="text" placeholder="Type company name to search..." value={searchQ} onChange={e => handleSearch(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm font-black placeholder:text-gray-300 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition-all" />
                                        {searchLoading && <RefreshCw className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400 animate-spin" />}
                                    </div>
                                    <div className="space-y-2 max-h-[260px] overflow-auto">
                                        {searchResults.map(s => (
                                            <button key={s.id} onClick={() => resolveAs(currentEntity, { id: s.id, name: s.name, type: currentEntity.type })}
                                                className={cn("w-full flex items-center justify-between p-4 rounded-xl border transition-all group hover:shadow-sm",
                                                    currentResolution?.id === s.id ? "border-emerald-400 bg-emerald-50" : "border-gray-100 hover:border-blue-300")}>
                                                <div className="text-left">
                                                    <p className="font-black text-gray-900 group-hover:text-blue-700">{s.name}</p>
                                                    <div className="flex gap-2 mt-0.5">
                                                        {s.isPartner && <span className="text-[9px] font-black text-blue-500 uppercase">Partner</span>}
                                                        {s.isCustomer && <span className="text-[9px] font-black text-gray-400 uppercase">Customer</span>}
                                                        {s.email && <span className="text-[9px] text-gray-300">{s.email}</span>}
                                                    </div>
                                                </div>
                                                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all",
                                                    currentResolution?.id === s.id ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-300 group-hover:bg-blue-500 group-hover:text-white")}>
                                                    <Link2 className="w-4 h-4" />
                                                </div>
                                            </button>
                                        ))}
                                        {searchQ.length >= 2 && !searchResults.length && !searchLoading && (
                                            <div className="text-center py-8 space-y-2">
                                                <p className="text-sm font-black text-gray-300">No results for "{searchQ}"</p>
                                                <button onClick={() => { setWizardTab('create'); setCustomName(searchQ) }}
                                                    className="text-xs font-black text-blue-600 hover:underline">Create "{searchQ}" as new {currentEntity.type.toLowerCase()} →</button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Tab: Create Now */}
                            {wizardTab === 'create' && (
                                <div className="p-6 space-y-5 min-h-[280px]">
                                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-3">
                                        <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                        <p className="text-[10px] font-bold text-amber-700 leading-relaxed">
                                            This will <strong>immediately create</strong> a new {currentEntity.type.toLowerCase()} in your database. Any other name variants in this dataset will then be able to find and link to it via Search.
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Name to Use in Database</label>
                                        <input type="text" autoFocus
                                            placeholder={`e.g., full legal name of "${currentEntity.input}"`}
                                            value={customName}
                                            onChange={e => setCustomName(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter' && !creating) handleCreateNow(currentEntity, customName || currentEntity.input) }}
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-black placeholder:text-gray-300 outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-50 transition-all" />
                                        <p className="text-[10px] text-gray-400">Leave blank to use the original: "<span className="font-black">{currentEntity.input}</span>"</p>
                                    </div>
                                    <button
                                        onClick={() => handleCreateNow(currentEntity, customName || currentEntity.input)}
                                        disabled={creating}
                                        className="w-full py-3.5 rounded-xl bg-purple-600 text-white text-sm font-black hover:bg-purple-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                        {creating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                        {creating ? 'Creating...' : `Create "${customName || currentEntity.input}" Now`}
                                    </button>
                                </div>
                            )}

                            {/* Navigation Footer */}
                            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-50 bg-gray-50/40">
                                <button onClick={goBack} disabled={wizardIdx === 0}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black text-gray-500 hover:bg-white hover:shadow-sm transition-all disabled:opacity-30">
                                    <ArrowLeft className="w-4 h-4" /> Back
                                </button>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => handleSkip(currentEntity)}
                                        title="Skip — will import using original name"
                                        className="px-4 py-2 rounded-xl text-[10px] font-black text-gray-400 border border-dashed border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all uppercase tracking-widest"
                                    >
                                        Skip
                                    </button>
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{wizardIdx + 1} / {entities.length}</span>
                                </div>
                                <button onClick={goNext} disabled={wizardIdx >= entities.length - 1}
                                    className={cn("flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-black transition-all",
                                        currentResolution ? "bg-blue-600 text-white hover:bg-blue-700 shadow-md" : "border border-gray-200 text-gray-500 hover:bg-gray-50")}>
                                    Next <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── STEP 3: Preview & Import ── */}
            {step === 'preview' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3"><FileText className="w-5 h-5 text-blue-400" /><div><p className="text-lg font-black text-gray-900">{stats.total}</p><p className="text-[9px] font-black text-gray-400 uppercase">Total Rows</p></div></div>
                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-400" /><div><p className="text-lg font-black text-emerald-600">{stats.approved}</p><p className="text-[9px] font-black text-gray-400 uppercase">Approved</p></div></div>
                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3"><Briefcase className="w-5 h-5 text-blue-400" /><div><p className="text-lg font-black text-gray-900">${stats.value.toLocaleString()}</p><p className="text-[9px] font-black text-gray-400 uppercase">Total Value</p></div></div>
                        <div className="bg-gray-50 flex items-center gap-3 px-4 rounded-xl border border-gray-100">
                            <Search className="w-4 h-4 text-gray-400 shrink-0" />
                            <input type="text" placeholder="Filter..." className="bg-transparent text-[10px] font-black w-full outline-none placeholder:text-gray-400" value={previewSearch} onChange={e => setPreviewSearch(e.target.value)} />
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col" style={{ maxHeight: '70vh' }}>
                        <div className="px-5 py-3 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
                            <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Validation Queue</span>
                            <div className="flex items-center gap-4">
                                <button onClick={() => setRows(r => r.map(x => ({ ...x, approved: true })))} className="text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase">Approve All</button>
                                <div className="w-px h-3 bg-gray-200" />
                                <button onClick={() => setRows(r => r.map(x => ({ ...x, approved: false })))} className="text-[10px] font-black text-gray-400 hover:text-red-500 uppercase transition-colors">Reject All</button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-auto">
                            <table className="w-full text-left border-separate border-spacing-0">
                                <thead className="sticky top-0 z-10 bg-white shadow-sm">
                                    <tr>
                                        <th className="px-3 py-2.5 text-[9px] font-black text-gray-400 uppercase border-b border-gray-50 bg-white">OK</th>
                                        <SortTh col="customerName" label="Customer / Date" />
                                        <th className="px-3 py-2.5 text-[9px] font-black text-gray-400 uppercase border-b border-gray-50 bg-white">Stage</th>
                                        <th className="px-3 py-2.5 text-[9px] font-black text-gray-400 uppercase border-b border-gray-50 bg-white">Rep</th>
                                        <th className="px-3 py-2.5 text-[9px] font-black text-gray-400 uppercase border-b border-gray-50 bg-white">Partner</th>
                                        <th className="px-3 py-2.5 text-[9px] font-black text-gray-400 uppercase border-b border-gray-50 bg-white">Brand</th>
                                        <SortTh col="value" label="Value" right />
                                        <th className="px-3 py-2.5 text-[9px] font-black text-gray-400 uppercase border-b border-gray-50 bg-white">✕</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredRows.slice(0, 4100).map(row => <ProjectRow key={row.id} row={row} onToggleApproval={toggleApproval} onRemove={removeRow} />)}
                                    {filteredRows.length > 4100 && <tr><td colSpan={8} className="px-6 py-4 text-center bg-gray-50 text-[10px] font-black text-gray-400 uppercase">{filteredRows.length - 4100} more rows hidden</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Toast Status ── */}
            {status && (
                <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-right-6">
                    <div className={cn("px-5 py-3 rounded-2xl flex items-center gap-3 border shadow-xl backdrop-blur-md", status.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : status.type === 'error' ? 'bg-red-50 border-red-100 text-red-800' : 'bg-blue-50 border-blue-100 text-blue-800')}>
                        {status.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                        <span className="text-[10px] font-black uppercase">{status.message}</span>
                        <button onClick={() => setStatus(null)} className="ml-2 opacity-40 hover:opacity-100"><X className="w-3 h-3" /></button>
                    </div>
                </div>
            )}

            {/* ── Loading Overlay ── */}
            {loading && (
                <div className="fixed inset-0 bg-white/70 backdrop-blur-sm z-[100] flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-gray-900 border-t-transparent rounded-full animate-spin" />
                        <p className="text-xs font-black text-gray-900 uppercase tracking-[0.3em] animate-pulse">Analysing data...</p>
                    </div>
                </div>
            )}
        </div>
    )
}

function ChevronRightIcon() {
    return <svg className="w-3 h-3 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
}
