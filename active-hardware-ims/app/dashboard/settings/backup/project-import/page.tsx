"use client"

import { useState, useEffect, useMemo, useRef, memo, useCallback } from "react"
import {
    Upload, Check, X, AlertCircle, CheckCircle2, FileText, Trash2, ShieldCheck,
    Users, Briefcase, Download, ClipboardPaste, LayoutDashboard, Search,
    ListFilter, ArrowRight, ArrowLeft, Globe, ExternalLink, RefreshCw,
    Layers, Link2, Plus, Sparkles, Calendar, DollarSign, Tag, UserCheck
} from "lucide-react"
import FormattedNumberInput from "@/components/FormattedNumberInput"
import { cn } from "@/lib/utils"
import Papa from "papaparse"
import * as XLSX from "xlsx"

// ── Types ─────────────────────────────────────────────────────────────────────
type PendingImportRow = {
    id: string; date: string; customerName: string; partnerName?: string | null
    brand?: string | null; salesRepName?: string | null; value: number; stage: string
    pipelineId: string; createdAt: string
}

type EntitySuggestion = { id: string; name: string; score: number }
type UnresolvedEntity = {
    input: string; type: 'CUSTOMER' | 'PARTNER'
    match: EntitySuggestion | null; suggestions: EntitySuggestion[]
}

type ResolvedEntity = {
    id: string           // Always a real DB id
    name: string         // Display name
    type: 'CUSTOMER' | 'PARTNER'
    isNew?: boolean
}

type Status = { type: 'success' | 'error' | 'info'; message: string } | null

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ProjectImportPage() {
    // Queue State
    const [queue, setQueue] = useState<PendingImportRow[]>([])
    const [totalQueue, setTotalQueue] = useState(0)
    const [fetchingQueue, setFetchingQueue] = useState(false)
    const [queuePage, setQueuePage] = useState(0)
    const take = 15

    // UI Steps: 'dashboard' (list + upload), 'process' (single row wizard)
    const [view, setView] = useState<'dashboard' | 'process'>('dashboard')
    const [processingRow, setProcessingRow] = useState<PendingImportRow | null>(null)

    // Upload & UI Controls
    const [showPaste, setShowPaste] = useState(false)

    // Upload State
    const [pasteText, setPasteText] = useState("")
    const [loading, setLoading] = useState(false)
    const [pipelines, setPipelines] = useState<any[]>([])
    const [selectedPipelineId, setSelectedPipelineId] = useState("")
    const [defaultValue, setDefaultValue] = useState(0)

    // Single Row Editor State
    const [editedRow, setEditedRow] = useState<PendingImportRow | null>(null)
    const [resCustomer, setResCustomer] = useState<UnresolvedEntity | null>(null)
    const [resPartner, setResPartner] = useState<UnresolvedEntity | null>(null)
    const [resolutionMap, setResolutionMap] = useState<Record<string, ResolvedEntity | 'SKIP'>>({})
    const [wizardTab, setWizardTab] = useState<'details' | 'customer' | 'partner' | 'finish'>('details')

    // Entity Resolution Tab States
    const [entityTab, setEntityTab] = useState<'suggest' | 'search' | 'create'>('suggest')
    const [searchQ, setSearchQ] = useState("")
    const [searchResults, setSearchResults] = useState<any[]>([])
    const [searchLoading, setSearchLoading] = useState(false)
    const [customName, setCustomName] = useState("")
    const [creating, setCreating] = useState(false)
    const [status, setStatus] = useState<Status>(null)
    const [importing, setImporting] = useState(false)

    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        fetchPipelines()
    }, [])

    useEffect(() => {
        fetchQueue()
    }, [queuePage])

    async function fetchPipelines() {
        try {
            const res = await fetch('/api/crm/pipelines')
            if (res.ok) {
                const data = await res.json()
                setPipelines(data)
                // If nothing selected yet, pick default
                if (!selectedPipelineId) {
                    const def = data.find((p: any) => p.isDefault) || data[0]
                    if (def) setSelectedPipelineId(def.id)
                }
            }
        } catch (e) { console.error("Failed to fetch pipelines", e) }
    }

    async function fetchQueue() {
        setFetchingQueue(true)
        try {
            const res = await fetch(`/api/crm/projects/import?skip=${queuePage * take}&take=${take}`)
            if (res.ok) {
                const data = await res.json()
                setQueue(data.pending)
                setTotalQueue(data.total)
            }
        } catch (e) { console.error("Failed to fetch queue", e) }
        finally { setFetchingQueue(false) }
    }

    const generateId = useCallback(() => Math.random().toString(36).substring(2, 11), [])

    // ── Single Row Processing Logic ──────────────────────────────────────────
    async function startProcessing(row: PendingImportRow) {
        setProcessingRow(row)
        setEditedRow({ ...row })
        setWizardTab('details')
        setResolutionMap({})
        setView('process')

        // Fetch fuzzy matches for BOTH names
        setLoading(true)
        try {
            const names = [row.customerName]
            if (row.partnerName) names.push(row.partnerName)

            const res = await fetch('/api/crm/projects/import/resolve-entities', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ names })
            })
            const data = await res.json()

            const custRes = data.results.find((r: any) => r.input === row.customerName)
            const partRes = row.partnerName ? data.results.find((r: any) => r.input === row.partnerName) : null

            setResCustomer({ ...custRes, type: 'CUSTOMER' })
            if (partRes) setResPartner({ ...partRes, type: 'PARTNER' })
            else setResPartner(null)

            // Auto-resolve high score matches
            const newMap: Record<string, ResolvedEntity | 'SKIP'> = {}
            if (custRes?.match?.score > 0.95) {
                newMap[row.customerName] = { id: custRes.match.id, name: custRes.match.name, type: 'CUSTOMER' }
            }
            if (partRes?.match?.score > 0.95 && row.partnerName) {
                newMap[row.partnerName] = { id: partRes.match.id, name: partRes.match.name, type: 'PARTNER' }
            }
            setResolutionMap(newMap)

        } catch (e) { console.error("Failed to analyze row", e) }
        finally { setLoading(false) }
    }

    async function handleFinalizeRow() {
        if (!editedRow) return
        setImporting(true)
        try {
            const res = await fetch('/api/crm/projects/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'process',
                    rowId: editedRow.id,
                    approved: true,
                    entityMap: resolutionMap,
                    // The backend needs to know about any manual edits to the row
                    // We'll pass the whole edited object
                    editedData: editedRow
                })
            })
            if (res.ok) {
                setStatus({ type: 'success', message: 'Project imported successfully' })
                setView('dashboard')
                fetchQueue()
            } else {
                const err = await res.json()
                setStatus({ type: 'error', message: err.error || 'Import failed' })
            }
        } catch (e: any) { setStatus({ type: 'error', message: e.message }) }
        finally { setImporting(false) }
    }

    async function handleDeleteRow(id: string) {
        if (!confirm("Are you sure you want to dismiss this entry?")) return
        try {
            const res = await fetch('/api/crm/projects/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'process', rowId: id, approved: false })
            })
            if (res.ok) { fetchQueue() }
        } catch (e) { console.error("Delete failed", e) }
    }

    // ── Batch Upload Logic ───────────────────────────────────────────────────
    async function handleUpload(rowsToQueue: any[]) {
        console.log("DEBUG: handleUpload called with pipelineId:", selectedPipelineId);
        if (!selectedPipelineId) {
            setStatus({ type: 'error', message: "Please select a target pipeline first. (ID: " + selectedPipelineId + ")" })
            return
        }
        if (!rowsToQueue || rowsToQueue.length === 0) {
            setStatus({ type: 'error', message: "No data found to upload." })
            return
        }

        setLoading(true)
        setStatus(null) // Clear previous status
        try {
            const res = await fetch('/api/crm/projects/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'upload',
                    projects: rowsToQueue,
                    pipelineId: selectedPipelineId
                })
            })

            const data = await res.json()

            if (res.ok) {
                setStatus({ type: 'success', message: `Successfully queued ${rowsToQueue.length} rows.` })
                setPasteText("")
                setShowPaste(false)
                fetchQueue()
            } else {
                setStatus({ type: 'error', message: data.error || 'Failed to upload projects.' })
            }
        } catch (e: any) {
            console.error("Upload error:", e)
            setStatus({ type: 'error', message: "Network error while uploading. Check console for details." })
        }
        finally { setLoading(false) }
    }

    function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]; if (!file) return

        console.log("DEBUG: handleFile called with pipelineId:", selectedPipelineId);
        if (!selectedPipelineId) {
            setStatus({ type: 'error', message: "Please select a target pipeline above before uploading. (ID: " + selectedPipelineId + ")" })
            // Reset file input so user can try again
            if (e.target) e.target.value = ''
            return
        }

        setLoading(true)
        const done = (parsed: any[]) => {
            if (!parsed || parsed.length === 0) {
                setStatus({ type: 'error', message: "The file appears to be empty." })
                setLoading(false)
                return
            }
            handleUpload(parsed)
        }

        try {
            if (file.name.endsWith('.csv')) {
                Papa.parse(file, {
                    header: true,
                    skipEmptyLines: true,
                    complete: r => {
                        if (r.errors.length > 0) {
                            console.error("CSV Parse Errors:", r.errors)
                            setStatus({ type: 'error', message: `Error parsing CSV: ${r.errors[0].message}` })
                            setLoading(false)
                        } else {
                            done(r.data)
                        }
                    },
                    error: err => {
                        setStatus({ type: 'error', message: `File read error: ${err.message}` })
                        setLoading(false)
                    }
                })
            } else {
                const reader = new FileReader()
                reader.onload = evt => {
                    try {
                        const bstr = evt.target?.result
                        const wb = XLSX.read(bstr, { type: 'binary' })
                        const wsname = wb.SheetNames[0]
                        const ws = wb.Sheets[wsname]
                        const data = XLSX.utils.sheet_to_json(ws)
                        done(data)
                    } catch (err: any) {
                        setStatus({ type: 'error', message: `Excel parse error: ${err.message}` })
                        setLoading(false)
                    }
                }
                reader.onerror = () => {
                    setStatus({ type: 'error', message: "Failed to read file." })
                    setLoading(false)
                }
                reader.readAsBinaryString(file)
            }
        } catch (err: any) {
            setStatus({ type: 'error', message: `Unexpected error: ${err.message}` })
            setLoading(false)
        }
    }

    // ── Entity Resolution Helpers ───────────────────────────────────────────
    async function handleCreateEntity(input: string, type: 'CUSTOMER' | 'PARTNER', customName?: string) {
        setCreating(true)
        const nameToUse = customName || input
        try {
            const res = await fetch('/api/customers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: nameToUse,
                    isCustomer: type === 'CUSTOMER',
                    isPartner: type === 'PARTNER'
                })
            })
            if (res.ok) {
                const created = await res.json()
                setResolutionMap(p => ({ ...p, [input]: { id: created.id, name: created.name, type, isNew: true } }))
                setEntityTab('suggest')
                // Advance tab if both resolved
                checkAutoAdvance(input, type)
            }
        } catch (e) { console.error("Create failed", e) }
        finally { setCreating(false) }
    }

    async function handleLiveSearch(q: string) {
        setSearchQ(q)
        if (q.length < 2) { setSearchResults([]); return }
        setSearchLoading(true)
        try {
            const res = await fetch(`/api/customers?search=${encodeURIComponent(q)}&limit=5`)
            if (res.ok) { const d = await res.json(); setSearchResults(d.customers || []) }
        } finally { setSearchLoading(false) }
    }

    function checkAutoAdvance(input: string, type: 'CUSTOMER' | 'PARTNER') {
        if (type === 'CUSTOMER') setWizardTab('partner')
        else setWizardTab('finish')
    }

    // ── Render Helpers ───────────────────────────────────────────────────────
    function TabBtn({ id, label, icon: Icon, active, resolved }: any) {
        return (
            <button onClick={() => setWizardTab(id)} className={cn(
                "flex-1 flex items-center justify-center gap-2 py-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all",
                active ? "border-blue-600 text-blue-700 bg-white" : "border-transparent text-gray-400 hover:text-gray-600",
                resolved && !active && "text-emerald-500"
            )}>
                <Icon className={cn("w-3.5 h-3.5", resolved && !active ? "text-emerald-500" : "")} />
                {label}
                {resolved && <Check className="w-3 h-3 ml-1" />}
            </button>
        )
    }

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="max-w-[1200px] mx-auto space-y-6 pb-20 px-4">

            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-50 rounded-2xl"><Layers className="w-7 h-7 text-blue-600" /></div>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Project Importer</h1>
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-[.2em] mt-1">Pending Queue: {totalQueue} Records</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <a href="/api/crm/projects/import?type=template" download className="px-5 py-3 rounded-2xl bg-white border border-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-blue-600 hover:border-blue-200 transition-all flex items-center gap-2">
                        <Download className="w-4 h-4" /> Download CSV Template
                    </a>
                </div>
            </div>

            {/* ── View: Dashboard (Unified) ── */}
            {view === 'dashboard' && (
                <div className="space-y-6 animate-in fade-in duration-500">

                    {/* Compact Import Console */}
                    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl p-8 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">

                            {/* Step 1: Pipeline Selection */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-amber-500" /></div>
                                    <div>
                                        <h3 className="text-sm font-black text-gray-900 uppercase">1. Select Destination</h3>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Targets your CRM Pipeline</p>
                                    </div>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center gap-3">
                                    <select className="flex-1 bg-transparent text-xs font-black text-blue-600 outline-none cursor-pointer" value={selectedPipelineId} onChange={e => setSelectedPipelineId(e.target.value)}>
                                        <option value="" disabled>Select Pipeline...</option>
                                        {pipelines.map(p => (
                                            <option key={p.id} value={p.id}>
                                                {p.name} {p.isDefault ? '(System Default)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Step 2: Upload Action */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center"><Upload className="w-5 h-5 text-blue-600" /></div>
                                    <div>
                                        <h3 className="text-sm font-black text-gray-900 uppercase">2. Upload Source</h3>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Excel or CSV files supported</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => fileInputRef.current?.click()} className="flex-1 px-6 py-4 rounded-2xl bg-blue-600 text-white text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-3">
                                        <FileText className="w-4 h-4" /> Drop or Browse Files
                                    </button>
                                    <button onClick={() => setShowPaste(!showPaste)} className={cn("p-4 rounded-2xl border transition-all", showPaste ? "bg-amber-50 border-amber-200 text-amber-600" : "bg-white border-gray-200 text-gray-400 hover:text-amber-500")}>
                                        <ClipboardPaste className="w-5 h-5" />
                                    </button>
                                </div>
                                <input type="file" ref={fileInputRef} className="hidden" accept=".csv,.xlsx,.xls" onChange={handleFile} />
                            </div>

                        </div>

                        {/* Collapsible Direct Paste */}
                        {showPaste && (
                            <div className="pt-6 border-t border-dashed border-gray-100 space-y-4 animate-in slide-in-from-top-4 duration-300">
                                <div className="flex items-center justify-between">
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Direct Data Entry (Paste from Sheet)</p>
                                    <button onClick={() => setPasteText("")} className="text-[9px] font-black text-red-400 uppercase hover:underline">Clear Area</button>
                                </div>
                                <textarea className="w-full h-32 px-6 py-4 rounded-2xl border border-gray-100 bg-gray-50/50 text-[10px] font-mono focus:outline-none focus:ring-4 focus:ring-blue-100/50 resize-none" placeholder="Paste CSV/TSV data here..." value={pasteText} onChange={e => setPasteText(e.target.value)} />
                                <button onClick={() => {
                                    const parsed = Papa.parse(pasteText, { header: true, skipEmptyLines: true }).data
                                    if (parsed.length) handleUpload(parsed)
                                }} className="w-full py-4 rounded-2xl bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2">
                                    <Check className="w-4 h-4" /> Process Pasted Data ({pasteText.split('\n').length ? Math.max(0, pasteText.split('\n').length - 1) : 0} Rows)
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Pending Queue Manager */}
                    <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                        <div className="px-8 py-6 border-b border-gray-50 bg-gray-50/30 flex justify-between items-center">
                            <div>
                                <h2 className="text-lg font-black text-gray-900">Pending Import Queue</h2>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Record processing and resolution</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setQueuePage(p => Math.max(0, p - 1))} disabled={queuePage === 0} className="p-2.5 rounded-xl border border-gray-200 disabled:opacity-30 hover:bg-white transition-all"><ArrowLeft className="w-4 h-4" /></button>
                                <span className="text-[10px] font-black w-14 text-center">{queuePage + 1} / {Math.ceil(totalQueue / take) || 1}</span>
                                <button onClick={() => setQueuePage(p => p + 1)} disabled={(queuePage + 1) * take >= totalQueue} className="p-2.5 rounded-xl border border-gray-200 disabled:opacity-30 hover:bg-white transition-all"><ArrowRight className="w-4 h-4" /></button>
                            </div>
                        </div>

                        <div className="overflow-x-auto min-h-[400px]">
                            {fetchingQueue ? (
                                <div className="flex flex-col items-center justify-center h-[400px] gap-3">
                                    <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Refreshing Queue...</p>
                                </div>
                            ) : queue.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-[400px] text-center px-20">
                                    <ShieldCheck className="w-12 h-12 text-gray-200 mb-4" />
                                    <h3 className="text-lg font-black text-gray-400 uppercase tracking-tighter">Queue is Empty</h3>
                                    <p className="text-xs font-medium text-gray-300 mt-2 uppercase tracking-widest">Upload your project list above to start importing</p>
                                </div>
                            ) : (
                                <table className="w-full text-left border-separate border-spacing-0">
                                    <thead>
                                        <tr className="bg-white/80 sticky top-0 backdrop-blur-md">
                                            <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">Row Details</th>
                                            <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">Date</th>
                                            <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">Value</th>
                                            <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">Brand</th>
                                            <th className="px-4 py-4 text-right border-b border-gray-50 pr-8">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {queue.map(row => (
                                            <tr key={row.id} className="group hover:bg-gray-50/80 transition-all border-b border-gray-50">
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-all"><Users className="w-4 h-4" /></div>
                                                        <div>
                                                            <p className="text-xs font-black text-gray-900 group-hover:text-blue-700 transition-colors uppercase">{row.customerName}</p>
                                                            <p className="text-[10px] text-gray-400 font-bold mt-0.5">{row.partnerName ? `via ${row.partnerName}` : 'Direct'}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-5"><span className="text-[10px] font-mono text-gray-500">{row.date}</span></td>
                                                <td className="px-4 py-5"><span className="text-[11px] font-black text-gray-900">${row.value.toLocaleString()}</span></td>
                                                <td className="px-4 py-5">{row.brand ? <span className="text-[9px] font-black px-2 py-0.5 rounded bg-gray-900 text-white uppercase">{row.brand}</span> : <span className="text-gray-300">—</span>}</td>
                                                <td className="px-4 py-5 text-right pr-8">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button onClick={() => handleDeleteRow(row.id)} className="p-2.5 rounded-xl text-gray-300 hover:text-red-500 hover:bg-white hover:shadow-sm transition-all"><Trash2 className="w-4 h-4" /></button>
                                                        <button onClick={() => startProcessing(row)} className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all">Process</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── View: Process Row Wizard ── */}
            {view === 'process' && editedRow && (
                <div className="max-w-[800px] mx-auto space-y-4 animate-in zoom-in-95 duration-300">
                    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl overflow-hidden">

                        {/* Wizard Header */}
                        <div className="p-8 border-b border-gray-50 bg-gray-50/20 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <button onClick={() => setView('dashboard')} className="p-3 rounded-2xl bg-white border border-gray-100 text-gray-400 hover:text-red-500 transition-all shadow-sm"><X className="w-5 h-5" /></button>
                                <div>
                                    <h2 className="text-xl font-black text-gray-900 leading-tight">Resolve Record</h2>
                                    <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mt-1">Reviewing: {editedRow.customerName}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className={cn("w-1.5 h-1.5 rounded-full",
                                        wizardTab === 'details' && i === 1 || wizardTab === 'customer' && i === 2 || wizardTab === 'partner' && i === 3 || wizardTab === 'finish' && i === 4 ? "bg-blue-600 w-6 transition-all duration-300" : "bg-gray-200"
                                    )} />
                                ))}
                            </div>
                        </div>

                        {/* Tabs Navigation */}
                        <div className="flex border-b border-gray-50 px-4 bg-gray-50/20">
                            <TabBtn id="details" label="1. Data Edit" icon={FileText} active={wizardTab === 'details'} resolved />
                            <TabBtn id="customer" label="2. Customer" icon={Users} active={wizardTab === 'customer'} resolved={!!resolutionMap[editedRow.customerName]} />
                            <TabBtn id="partner" label="3. Partner" icon={Briefcase} active={wizardTab === 'partner'} resolved={!editedRow.partnerName || !!resolutionMap[editedRow.partnerName]} />
                            <TabBtn id="finish" label="4. Process" icon={CheckCircle2} active={wizardTab === 'finish'} />
                        </div>

                        {/* ── TAB: DATA EDIT ── */}
                        {wizardTab === 'details' && (
                            <div className="p-10 space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><Calendar className="w-3 h-3" /> Date</label>
                                        <input type="text" className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50 font-mono text-sm focus:outline-none focus:ring-4 focus:ring-blue-50 transition-all font-black" value={editedRow.date} onChange={e => setEditedRow({ ...editedRow, date: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><DollarSign className="w-3 h-3" /> Expected Value</label>
                                        <FormattedNumberInput value={editedRow.value} onChange={v => setEditedRow({ ...editedRow, value: v })} className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50 text-sm focus:outline-none focus:ring-4 focus:ring-blue-50 transition-all font-black" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><Tag className="w-3 h-3" /> Brand / Technology</label>
                                        <input type="text" className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50 text-sm focus:outline-none focus:ring-4 focus:ring-blue-50 transition-all font-black uppercase" value={editedRow.brand || ''} onChange={e => setEditedRow({ ...editedRow, brand: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><UserCheck className="w-3 h-3" /> Primary Sales Rep</label>
                                        <input type="text" className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50 text-sm focus:outline-none focus:ring-4 focus:ring-blue-50 transition-all font-black" value={editedRow.salesRepName || ''} onChange={e => setEditedRow({ ...editedRow, salesRepName: e.target.value })} />
                                    </div>
                                </div>
                                <div className="p-6 bg-blue-50/50 rounded-3xl border border-blue-100 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white"><LayoutDashboard className="w-5 h-5" /></div>
                                        <div>
                                            <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Active Stage</p>
                                            <p className="text-sm font-black text-blue-900">{editedRow.stage}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        {['LEAD', 'WON', 'LOST'].map(s => (
                                            <button key={s} onClick={() => setEditedRow({ ...editedRow, stage: s })} className={cn(
                                                "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                                                editedRow.stage === s ? "bg-white text-blue-600 shadow-sm" : "text-blue-400 hover:text-blue-600"
                                            )}>{s}</button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── TAB: ENTITY RESOLUTION (Customer or Partner) ── */}
                        {(wizardTab === 'customer' || wizardTab === 'partner') && (
                            <div className="flex flex-col">
                                {(() => {
                                    const entityType = wizardTab.toUpperCase() as 'CUSTOMER' | 'PARTNER'
                                    const entityInput = entityType === 'CUSTOMER' ? editedRow.customerName : (editedRow.partnerName || '')
                                    const resData = entityType === 'CUSTOMER' ? resCustomer : resPartner
                                    const currentResolution = resolutionMap[entityInput]

                                    if (!entityInput) return <div className="p-20 text-center"><p className="text-gray-400 italic">No partner linked to this record</p><button onClick={() => setWizardTab('finish')} className="mt-4 text-blue-600 font-black text-xs uppercase underline">Skip to Finish</button></div>

                                    return (
                                        <>
                                            <div className="px-10 py-8 bg-gray-50/50 border-b border-gray-50 flex items-center justify-between">
                                                <div className="flex items-center gap-5">
                                                    <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm", entityType === 'PARTNER' ? 'bg-blue-600 text-white' : 'bg-gray-900 text-white')}>
                                                        {entityType === 'PARTNER' ? <Briefcase className="w-7 h-7" /> : <Users className="w-7 h-7" />}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-3 mb-1">
                                                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-[.2em]">{entityType} NAME FROM RECORD:</span>
                                                            <a href={`https://www.google.com/search?q=${encodeURIComponent(entityInput + ' Sri Lanka')}`} target="_blank" className="flex items-center gap-1 text-[9px] font-black text-blue-500 hover:underline"><Globe className="w-3 h-3" /> VERIFY SL</a>
                                                        </div>
                                                        <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">{entityInput}</h3>
                                                        {currentResolution && (
                                                            <div className="flex items-center gap-2 mt-2 px-3 py-1.5 bg-emerald-50 rounded-xl border border-emerald-100 text-emerald-700 w-fit">
                                                                <Check className="w-3.5 h-3.5" />
                                                                <span className="text-[10px] font-black uppercase tracking-widest">{currentResolution === 'SKIP' ? 'Using original name' : `Linked to: ${currentResolution.name}`}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex border-b border-gray-50">
                                                {(['suggest', 'search', 'create'] as const).map(t => (
                                                    <button key={t} onClick={() => setEntityTab(t)} className={cn(
                                                        "flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all",
                                                        entityTab === t ? "text-blue-600 underline underline-offset-8 decoration-2" : "text-gray-400"
                                                    )}>{t === 'suggest' ? '🎯 Suggestions' : t === 'search' ? '🔍 Manual Search' : '✨ Create Now'}</button>
                                                ))}
                                            </div>

                                            <div className="p-8 min-h-[340px]">
                                                {entityTab === 'suggest' && (
                                                    <div className="space-y-3">
                                                        {resData?.match && (
                                                            <button onClick={() => {
                                                                setResolutionMap(p => ({ ...p, [entityInput]: { id: resData.match!.id, name: resData.match!.name, type: entityType } }))
                                                                checkAutoAdvance(entityInput, entityType)
                                                            }} className={cn("w-full p-5 rounded-2xl border-2 text-left flex items-center justify-between group transition-all",
                                                                (currentResolution as any)?.id === resData.match.id ? "border-emerald-500 bg-emerald-50/50" : "border-gray-100 hover:border-blue-500 bg-white"
                                                            )}>
                                                                <div>
                                                                    <p className="text-[9px] font-black text-emerald-500 uppercase mb-1">High Accuracy Match</p>
                                                                    <p className="text-lg font-black text-gray-900 group-hover:text-blue-600">{resData.match.name}</p>
                                                                    <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-widest">{Math.round(resData.match.score * 100)}% Similarity in database</p>
                                                                </div>
                                                                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center transition-all", (currentResolution as any)?.id === resData.match.id ? "bg-emerald-500 text-white" : "bg-gray-50 text-gray-200 group-hover:bg-blue-600 group-hover:text-white")}><Check className="w-5 h-5" /></div>
                                                            </button>
                                                        )}
                                                        {resData?.suggestions.map(s => (
                                                            <button key={s.id} onClick={() => {
                                                                setResolutionMap(p => ({ ...p, [entityInput]: { id: s.id, name: s.name, type: entityType } }))
                                                                checkAutoAdvance(entityInput, entityType)
                                                            }} className={cn("w-full p-4 rounded-2xl border flex items-center justify-between text-left group hover:border-blue-400 transition-all", (currentResolution as any)?.id === s.id ? "bg-emerald-50 border-emerald-300" : "bg-white")}>
                                                                <p className="text-sm font-black text-gray-700 group-hover:text-blue-600">{s.name}</p>
                                                                <span className="text-[9px] font-black text-gray-300 uppercase">{Math.round(s.score * 100)}% match</span>
                                                            </button>
                                                        ))}
                                                        {!resData?.match && !resData?.suggestions.length && (
                                                            <div className="text-center py-20 space-y-3">
                                                                <Sparkles className="w-10 h-10 text-gray-100 mx-auto" />
                                                                <p className="text-sm font-black text-gray-400 uppercase tracking-widest">No Smart Suggestions</p>
                                                                <button onClick={() => setEntityTab('search')} className="text-xs font-black text-blue-600 underline">Search manually</button>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {entityTab === 'search' && (
                                                    <div className="space-y-4">
                                                        <div className="relative">
                                                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                                                            <input autoFocus type="text" placeholder="Start typing name..." value={searchQ} onChange={e => handleLiveSearch(e.target.value)}
                                                                className="w-full pl-14 pr-12 py-5 rounded-2xl border-2 border-gray-100 bg-gray-50 focus:bg-white focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-50 transition-all font-black" />
                                                            {searchLoading && <RefreshCw className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 animate-spin" />}
                                                        </div>
                                                        <div className="space-y-2 max-h-[300px] overflow-auto pr-2">
                                                            {searchResults.map(s => (
                                                                <button key={s.id} onClick={() => {
                                                                    setResolutionMap(p => ({ ...p, [entityInput]: { id: s.id, name: s.name, type: entityType } }))
                                                                    checkAutoAdvance(entityInput, entityType)
                                                                }} className="w-full p-4 rounded-xl border border-gray-100 bg-white hover:border-blue-400 hover:shadow-sm transition-all flex items-center justify-between group">
                                                                    <p className="text-sm font-black text-gray-800 group-hover:text-blue-600">{s.name}</p>
                                                                    <div className="flex gap-2">
                                                                        {s.isPartner && <span className="text-[8px] font-black bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">P</span>}
                                                                        <Plus className="w-4 h-4 text-gray-200 group-hover:text-blue-500" />
                                                                    </div>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {entityTab === 'create' && (
                                                    <div className="space-y-6">
                                                        <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100 flex gap-4">
                                                            <AlertCircle className="w-6 h-6 text-amber-500 shrink-0" />
                                                            <p className="text-[11px] font-bold text-amber-800 leading-relaxed uppercase tracking-tight">Warning: This will create a permanent new {entityType.toLowerCase()} record in your CRM. Correct abbreviations to full legal names now.</p>
                                                        </div>
                                                        <div className="space-y-3">
                                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[.2em] ml-2">Legal Name for Database</label>
                                                            <input type="text" placeholder="e.g. Network Information Technology Pvt Ltd" value={customName} onChange={e => setCustomName(e.target.value)}
                                                                className="w-full px-6 py-5 rounded-2xl border-2 border-purple-100 bg-purple-50/20 focus:bg-white focus:border-purple-400 focus:outline-none focus:ring-4 focus:ring-purple-50 transition-all font-black text-lg" />
                                                        </div>
                                                        <button disabled={creating} onClick={() => handleCreateEntity(entityInput, entityType, customName)}
                                                            className="w-full py-5 rounded-2xl bg-purple-600 text-white font-black uppercase tracking-widest text-sm hover:bg-purple-700 transition-all shadow-xl shadow-purple-100 flex items-center justify-center gap-2">
                                                            {creating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                                                            {creating ? 'Creating Record...' : `Create "${customName || entityInput}" Now`}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )
                                })()}
                            </div>
                        )}

                        {/* ── TAB: FINISH ── */}
                        {wizardTab === 'finish' && (
                            <div className="p-10 flex flex-col items-center text-center space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                                <div className="w-24 h-24 bg-emerald-50 rounded-[2.5rem] flex items-center justify-center text-emerald-600 border border-emerald-100 shadow-inner">
                                    <ShieldCheck className="w-12 h-12" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-black text-gray-900 leading-tight">Ready for Importance</h3>
                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Selected Entities & Adjusted Data verified</p>
                                </div>

                                <div className="w-full grid grid-cols-2 gap-4">
                                    <div className="p-6 bg-gray-50 rounded-[2rem] text-left border border-gray-100">
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Customer</p>
                                        <p className="text-xs font-black text-gray-900 truncate">{(resolutionMap[editedRow.customerName] as any)?.name || editedRow.customerName}</p>
                                    </div>
                                    <div className="p-6 bg-gray-50 rounded-[2rem] text-left border border-gray-100">
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Deal Value</p>
                                        <p className="text-xs font-black text-emerald-600">${editedRow.value.toLocaleString()}</p>
                                    </div>
                                </div>

                                <div className="w-full space-y-3">
                                    <button disabled={importing} onClick={handleFinalizeRow} className="w-full py-5 rounded-2xl bg-gray-900 text-white font-black text-sm uppercase tracking-[0.2em] hover:bg-black transition-all shadow-xl flex items-center justify-center gap-3">
                                        {importing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                                        {importing ? 'Importing...' : 'Finalize & Import Project'}
                                    </button>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">This will remove the entry from queue and create a CRM project</p>
                                </div>
                            </div>
                        )}

                        {/* Navigation Footer */}
                        <div className="px-10 py-6 border-t border-gray-50 bg-gray-50/30 flex justify-between items-center">
                            <button onClick={() => setView('dashboard')} className="text-[10px] font-black text-red-400 uppercase tracking-widest hover:text-red-600">Cancel & return to queue</button>
                            <div className="flex gap-3">
                                <button onClick={() => {
                                    if (wizardTab === 'customer') setWizardTab('details')
                                    else if (wizardTab === 'partner') setWizardTab('customer')
                                    else if (wizardTab === 'finish') setWizardTab('partner')
                                }} disabled={wizardTab === 'details'} className="px-5 py-2.5 rounded-xl border border-gray-200 text-[10px] font-black uppercase tracking-widest disabled:opacity-20 hover:bg-white transition-all">Previous Step</button>

                                {wizardTab !== 'finish' && (
                                    <button onClick={() => {
                                        if (wizardTab === 'details') setWizardTab('customer')
                                        else if (wizardTab === 'customer') setWizardTab('partner')
                                        else if (wizardTab === 'partner') setWizardTab('finish')
                                    }} className="px-8 py-2.5 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 shadow-md">Next Step</button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Toast Status ── */}
            {status && (
                <div className="fixed bottom-8 right-8 z-[110] animate-in fade-in slide-in-from-right-8 duration-500">
                    <div className={cn("px-6 py-4 rounded-[2rem] flex items-center gap-4 border shadow-2xl backdrop-blur-xl", status.type === 'success' ? 'bg-emerald-50/90 border-emerald-100 text-emerald-900' : 'bg-red-50/90 border-red-100 text-red-900')}>
                        {status.type === 'success' ? <CheckCircle2 className="w-6 h-6 text-emerald-500" /> : <AlertCircle className="w-6 h-6 text-red-500" />}
                        <span className="text-[11px] font-black uppercase tracking-widest">{status.message}</span>
                        <button onClick={() => setStatus(null)} className="p-1 rounded-full hover:bg-black/5 transition-all"><X className="w-4 h-4 opacity-40" /></button>
                    </div>
                </div>
            )}

            {/* ── Initial Loading Overlay ── */}
            {loading && (
                <div className="fixed inset-0 bg-white/80 backdrop-blur-md z-[200] flex flex-col items-center justify-center gap-6 animate-in fade-in duration-300">
                    <div className="relative">
                        <div className="w-20 h-20 border-4 border-gray-100 rounded-full" />
                        <div className="w-20 h-20 border-4 border-t-blue-600 rounded-full animate-spin absolute top-0 left-0" />
                    </div>
                    <div className="text-center space-y-1">
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-[.4em] animate-pulse">Syncing Engine</p>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Optimizing Data Pipeline...</p>
                    </div>
                </div>
            )}
        </div>
    )
}
