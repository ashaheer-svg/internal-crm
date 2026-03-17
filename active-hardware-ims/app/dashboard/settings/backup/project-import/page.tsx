"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
    Upload, Check, X, AlertCircle, CheckCircle2, FileText, Download,
    ArrowRight, ArrowLeft, RefreshCw, Search, Plus, Sparkles,
    ChevronRight, Users, Briefcase, ClipboardList, Rocket, Info
} from "lucide-react"
import { cn } from "@/lib/utils"
import Papa from "papaparse"
import ExcelJS from "exceljs"

// ── Types ─────────────────────────────────────────────────────────────────────

type RawRow = Record<string, any>

type MappedRow = {
    date: string
    projectTitle: string
    customerName: string
    partnerName: string
    salesRepName: string
    stage: string
    value: number
}

type EntityType = 'CUSTOMER' | 'PARTNER'

type ResolutionEntry = {
    rawName: string
    type: EntityType
    status: 'AUTO_MATCHED' | 'NEEDS_REVIEW' | 'NEW' | 'CONFIRMED'
    matchId?: string
    matchName?: string
    confidence?: number
    suggestions: { id: string; name: string; score: number }[]
    finalName?: string   // only used when creating new
}

type Step = 'upload' | 'map' | 'resolve' | 'commit' | 'done'

const STEPS: { key: Step; label: string; icon: any }[] = [
    { key: 'upload', label: 'Upload', icon: Upload },
    { key: 'map', label: 'Map Columns', icon: ClipboardList },
    { key: 'resolve', label: 'Entity Resolution', icon: Users },
    { key: 'commit', label: 'Commit', icon: Rocket },
]

const REQUIRED_FIELDS = ['date', 'customerName', 'projectTitle'] as const
const OPTIONAL_FIELDS = ['partnerName', 'salesRepName', 'stage', 'value'] as const
const ALL_FIELDS = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS] as const
type FieldKey = typeof ALL_FIELDS[number]

const FIELD_LABELS: Record<FieldKey, string> = {
    date: 'Date',
    projectTitle: 'Project Title',
    customerName: 'Customer',
    partnerName: 'Partner',
    salesRepName: 'Sales Rep',
    stage: 'Stage',
    value: 'Value',
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ProjectImportPage() {
    const [step, setStep] = useState<Step>('upload')
    const [rawRows, setRawRows] = useState<RawRow[]>([])
    const [headers, setHeaders] = useState<string[]>([])
    const [columnMap, setColumnMap] = useState<Partial<Record<FieldKey, string>>>({})
    const [mappedRows, setMappedRows] = useState<MappedRow[]>([])
    const [pipelines, setPipelines] = useState<any[]>([])
    const [pipelineId, setPipelineId] = useState('')
    const [resolutions, setResolutions] = useState<ResolutionEntry[]>([])
    const [resolving, setResolving] = useState(false)
    const [committing, setCommitting] = useState(false)
    const [commitResult, setCommitResult] = useState<{ count: number } | null>(null)
    const [error, setError] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Popover state for entity resolution
    const [activePopover, setActivePopover] = useState<string | null>(null)
    const [popoverRect, setPopoverRect] = useState<{ top: number; right: number } | null>(null)
    const [searchQ, setSearchQ] = useState('')
    const [searchResults, setSearchResults] = useState<any[]>([])
    const [searchLoading, setSearchLoading] = useState(false)
    const [newName, setNewName] = useState('')

    useEffect(() => {
        fetch('/api/crm/pipelines').then(r => r.json()).then(data => {
            if (Array.isArray(data)) {
                setPipelines(data)
                const def = data.find((p: any) => p.isDefault) || data[0]
                if (def) setPipelineId(def.id)
            }
        }).catch(() => { })
    }, [])

    // ── Step 1: File parsing ──────────────────────────────────────────────────
    function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        setError(null)

        const done = (rows: RawRow[]) => {
            if (!rows.length) { setError('File is empty.'); return }
            setRawRows(rows)
            setHeaders(Object.keys(rows[0]))
            autoDetectColumns(Object.keys(rows[0]))
            setStep('map')
        }

        if (file.name.endsWith('.csv')) {
            Papa.parse(file, {
                header: true, skipEmptyLines: true,
                complete: r => {
                    if (r.errors.length) { setError(r.errors[0].message); return }
                    done(r.data as RawRow[])
                },
                error: e => setError(e.message)
            })
        } else {
            const reader = new FileReader()
            reader.onload = async evt => {
                try {
                    const workbook = new ExcelJS.Workbook()
                    const buffer = evt.target?.result as ArrayBuffer
                    await workbook.xlsx.load(buffer)
                    const worksheet = workbook.getWorksheet(1) || workbook.worksheets[0]

                    const rows: RawRow[] = []
                    const headers: string[] = []

                    worksheet.eachRow((row, rowNumber) => {
                        if (rowNumber === 1) {
                            // Headers
                            row.eachCell((cell) => { headers.push(String(cell.value || '')) })
                        } else {
                            const rowObj: RawRow = {}
                            row.eachCell((cell, colNumber) => {
                                const header = headers[colNumber - 1]
                                if (header) {
                                    let val = cell.value
                                    
                                    // Handle Formula Result objects
                                    if (val && typeof val === 'object' && 'result' in (val as any)) {
                                        val = (val as any).result
                                    }
                                    
                                    // Format Date instances to YYYY-MM-DD
                                    if (val instanceof Date) {
                                        val = val.toISOString().split('T')[0]
                                    }
                                    
                                    rowObj[header] = val
                                }
                            })
                            rows.push(rowObj)
                        }
                    })
                    done(rows)
                } catch (e: any) { setError(e.message) }
            }
            reader.readAsArrayBuffer(file)
        }
        // Reset input so same file can be reselected
        e.target.value = ''
    }

    function autoDetectColumns(cols: string[]) {
        const patterns: Record<FieldKey, RegExp> = {
            date: /date|dt|day/i,
            projectTitle: /title|project|name|description|desc/i,
            customerName: /customer|client|end.?customer/i,
            partnerName: /partner|reseller|channel/i,
            salesRepName: /rep|sales.?rep|agent|staff/i,
            stage: /stage|status|phase/i,
            value: /value|amount|price|revenue|deal/i,
        }
        const map: Partial<Record<FieldKey, string>> = {}
        for (const [field, regex] of Object.entries(patterns)) {
            const col = cols.find(c => regex.test(c))
            if (col) map[field as FieldKey] = col
        }
        setColumnMap(map)
    }

    // ── Step 2: Build mapped rows ─────────────────────────────────────────────
    function buildMappedRows(): MappedRow[] {
        return rawRows.map(row => ({
            date: String(row[columnMap.date || ''] ?? ''),
            projectTitle: String(row[columnMap.projectTitle || ''] ?? ''),
            customerName: String(row[columnMap.customerName || ''] ?? '').trim(),
            partnerName: String(row[columnMap.partnerName || ''] ?? '').trim(),
            salesRepName: String(row[columnMap.salesRepName || ''] ?? '').trim(),
            stage: String(row[columnMap.stage || ''] ?? 'Lead').trim() || 'Lead',
            value: parseFloat(String(row[columnMap.value || ''] ?? '0')) || 0,
        })).filter(r => r.customerName)
    }

    async function proceedToResolve() {
        const rows = buildMappedRows()
        if (!rows.length) { setError('No valid rows found (customer name is required).'); return }
        setMappedRows(rows)
        setError(null)

        // Deduplicate: collect all unique Customer and Partner names
        const customerNames = [...new Set(rows.map(r => r.customerName).filter(Boolean))]
        const partnerNames = [...new Set(rows.map(r => r.partnerName).filter(Boolean))]

        const payload = [
            ...customerNames.map(n => ({ input: n, type: 'CUSTOMER' as EntityType })),
            ...partnerNames.map(n => ({ input: n, type: 'PARTNER' as EntityType })),
        ]

        setResolving(true)
        setStep('resolve')
        try {
            const res = await fetch('/api/crm/projects/import/resolve-entities', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ names: payload })
            })
            const data = await res.json()

            const AUTO_THRESHOLD = 0.92
            const entries: ResolutionEntry[] = (data.results || []).map((r: any) => {
                const autoMatch = r.match && r.match.score >= AUTO_THRESHOLD
                return {
                    rawName: r.input,
                    type: r.type,
                    status: autoMatch ? 'AUTO_MATCHED' : (r.match ? 'NEEDS_REVIEW' : 'NEW'),
                    matchId: autoMatch ? r.match.id : undefined,
                    matchName: autoMatch ? r.match.name : undefined,
                    confidence: r.match?.score,
                    suggestions: r.suggestions || [],
                    finalName: autoMatch ? undefined : r.input,
                }
            })
            setResolutions(entries)
        } catch (e: any) {
            setError(e.message)
        } finally {
            setResolving(false)
        }
    }

    // ── Entity search helper ──────────────────────────────────────────────────
    const doSearch = useCallback(async (q: string, type: EntityType, currentRawName?: string) => {
        if (!q.trim()) { setSearchResults([]); return }
        setSearchLoading(true)
        try {
            // Include local session resolutions of the same type (already confirmed in this import)
            const localMatches = resolutions
                .filter(r => r.type === type && r.rawName !== currentRawName)
                .filter(r => r.status === 'CONFIRMED' || r.status === 'AUTO_MATCHED' || r.status === 'NEW')
                .map(r => ({
                    id: r.matchId || `local::${r.finalName || r.rawName}`,
                    name: r.matchName || r.finalName || r.rawName,
                    score: 1,
                    isLocal: true
                }))
                .filter(r => r.name.toLowerCase().includes(q.toLowerCase()))

            const res = await fetch('/api/crm/projects/import/resolve-entities', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ names: [{ input: q, type }] })
            })
            const data = await res.json()
            const apiResults: any[] = data.results?.[0]?.suggestions || []

            // Merge: local first, then DB results — dedup by ID
            const seen = new Set(localMatches.map(l => l.id))
            const merged = [
                ...localMatches,
                ...apiResults.filter(a => !seen.has(a.id))
            ]
            setSearchResults(merged)
        } catch { setSearchResults([]) }
        finally { setSearchLoading(false) }
    }, [resolutions])

    function openPopover(key: string, e: React.MouseEvent<HTMLButtonElement>, fallbackName: string) {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
        setPopoverRect({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
        setActivePopover(key)
        setSearchQ('')
        setSearchResults([])
        setNewName(fallbackName)
    }

    function closePopover() {
        setActivePopover(null)
        setPopoverRect(null)
        setSearchQ('')
        setSearchResults([])
        setNewName('')
    }

    function confirmMatch(rawName: string, matchId: string, matchName: string) {
        setResolutions(prev => prev.map(r => r.rawName === rawName
            ? { ...r, status: 'CONFIRMED', matchId, matchName }
            : r
        ))
        closePopover()
    }

    function confirmNew(rawName: string, finalName: string) {
        setResolutions(prev => prev.map(r => r.rawName === rawName
            ? { ...r, status: 'NEW', matchId: undefined, matchName: undefined, finalName }
            : r
        ))
        closePopover()
    }

    // ── Step 4: Commit ────────────────────────────────────────────────────────
    async function handleCommit() {
        setCommitting(true)
        setError(null)
        try {
            // Build entity resolutions map
            const entityResolutions: Record<string, any> = {}
            for (const r of resolutions) {
                if (r.status === 'AUTO_MATCHED' || r.status === 'CONFIRMED') {
                    entityResolutions[r.rawName] = { id: r.matchId, name: r.matchName, type: r.type }
                } else {
                    // NEW: will be created with the finalName (or rawName fallback)
                    entityResolutions[r.rawName] = 'NEW'
                }
            }

            const res = await fetch('/api/crm/projects/import/batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pipelineId, rows: mappedRows, entityResolutions })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Import failed')
            setCommitResult({ count: data.count })
            setStep('done')
        } catch (e: any) {
            setError(e.message)
        } finally {
            setCommitting(false)
        }
    }

    const canProceedToCommit = resolutions.every(r => r.status !== 'NEEDS_REVIEW')
    const needsReviewCount = resolutions.filter(r => r.status === 'NEEDS_REVIEW').length
    const stepIndex = STEPS.findIndex(s => s.key === step)

    // ── CSV Template ──────────────────────────────────────────────────────────
    function downloadTemplate() {
        const csv = `date,projectTitle,customerName,partnerName,salesRepName,stage,value\n2024-01-15,CRM System Implementation,Acme Corp,TechCorp,John Doe,WON,120000\n2024-03-20,Network Upgrade,Beta Industries,,Jane Smith,Lead,45000`
        const blob = new Blob([csv], { type: 'text/csv' })
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
        a.download = 'legacy_import_template.csv'; a.click()
    }

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gray-50/60">
            {/* Page Header */}
            <div className="bg-white border-b border-gray-200 shadow-sm">
                <div className="max-w-5xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-gray-900">Legacy Project Import</h1>
                            <p className="text-sm text-gray-500 mt-0.5">Import historical projects with smart entity deduplication</p>
                        </div>
                        <button onClick={downloadTemplate} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                            <Download className="w-4 h-4" />
                            CSV Template
                        </button>
                    </div>

                    {/* Step Indicator */}
                    {step !== 'done' && (
                        <div className="flex items-center gap-0 mt-5">
                            {STEPS.map((s, i) => {
                                const done = stepIndex > i
                                const active = stepIndex === i
                                return (
                                    <div key={s.key} className="flex items-center">
                                        <div className={cn(
                                            "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-xs font-bold",
                                            active ? "bg-blue-600 text-white shadow-sm" :
                                                done ? "text-emerald-700 bg-emerald-50" : "text-gray-400"
                                        )}>
                                            {done ? <Check className="w-3.5 h-3.5" /> : <s.icon className="w-3.5 h-3.5" />}
                                            <span className="hidden sm:inline">{s.label}</span>
                                        </div>
                                        {i < STEPS.length - 1 && (
                                            <ChevronRight className={cn("w-4 h-4 mx-1", done ? "text-emerald-400" : "text-gray-300")} />
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-6 py-8">
                {error && (
                    <div className="mb-6 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>{error}</span>
                        <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4" /></button>
                    </div>
                )}

                {/* ── STEP 1: UPLOAD ── */}
                {step === 'upload' && (
                    <div className="space-y-6">
                        {/* Pipeline selector */}
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-2">Target Pipeline</label>
                            <select
                                value={pipelineId}
                                onChange={e => setPipelineId(e.target.value)}
                                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>

                        {/* Drop zone */}
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-white rounded-2xl border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors shadow-sm p-14 flex flex-col items-center gap-4 cursor-pointer group"
                        >
                            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                                <Upload className="w-8 h-8 text-blue-500" />
                            </div>
                            <div className="text-center">
                                <p className="text-base font-bold text-gray-800">Click to select file</p>
                                <p className="text-sm text-gray-500 mt-1">Supports CSV and Excel (.xlsx, .xls)</p>
                            </div>
                            <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFile} />
                        </div>

                        {/* Info box */}
                        <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
                            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="font-semibold">Expected columns</p>
                                <p className="mt-0.5 text-blue-600">Date · Project Title · Customer · Partner (optional) · Sales Rep (optional) · Stage (optional) · Value (optional)</p>
                                <p className="mt-1 text-blue-600">Column names don't need to match exactly — you'll map them in the next step.</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── STEP 2: COLUMN MAPPING ── */}
                {step === 'map' && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="font-bold text-gray-900 text-sm">Map Columns</h2>
                                        <p className="text-xs text-gray-500 mt-0.5">{rawRows.length} rows detected · Map your file headers to the required fields</p>
                                    </div>
                                    <button onClick={() => setStep('upload')} className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
                                        <ArrowLeft className="w-3.5 h-3.5" /> Change file
                                    </button>
                                </div>
                            </div>
                            <div className="p-5 space-y-3">
                                {ALL_FIELDS.map(field => {
                                    const required = REQUIRED_FIELDS.includes(field as any)
                                    return (
                                        <div key={field} className="flex items-center gap-4">
                                            <div className="w-32 flex-shrink-0">
                                                <span className="text-xs font-bold text-gray-700">{FIELD_LABELS[field]}</span>
                                                {required && <span className="ml-1 text-red-500">*</span>}
                                            </div>
                                            <select
                                                value={columnMap[field] || ''}
                                                onChange={e => setColumnMap(prev => ({ ...prev, [field]: e.target.value || undefined }))}
                                                className={cn(
                                                    "flex-1 text-sm border rounded-xl px-3 py-2 focus:ring-blue-500 focus:border-blue-500",
                                                    required && !columnMap[field] ? "border-red-300 bg-red-50" : "border-gray-200 bg-white"
                                                )}
                                            >
                                                <option value="">— Not mapped —</option>
                                                {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                            </select>
                                            {columnMap[field] && (
                                                <span className="text-xs text-gray-400 font-mono truncate max-w-[120px]">
                                                    e.g. "{String(rawRows[0]?.[columnMap[field]!] ?? '').slice(0, 20)}"
                                                </span>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Preview Table */}
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Preview (first 3 rows)</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-100">
                                            {ALL_FIELDS.filter(f => columnMap[f]).map(f => (
                                                <th key={f} className="px-4 py-2 text-left font-bold text-gray-500 uppercase tracking-wider">{FIELD_LABELS[f]}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rawRows.slice(0, 3).map((row, i) => (
                                            <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
                                                {ALL_FIELDS.filter(f => columnMap[f]).map(f => (
                                                    <td key={f} className="px-4 py-2 text-gray-700 font-medium">{String(row[columnMap[f]!] ?? '—').slice(0, 40)}</td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <button
                                onClick={proceedToResolve}
                                disabled={REQUIRED_FIELDS.some(f => !columnMap[f])}
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                            >
                                Next: Entity Resolution <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* ── STEP 3: ENTITY RESOLUTION ── */}
                {step === 'resolve' && (
                    <div className="space-y-6">
                        {resolving ? (
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-16 flex flex-col items-center gap-4">
                                <RefreshCw className="w-10 h-10 text-blue-500 animate-spin" />
                                <p className="text-sm font-semibold text-gray-600">Analysing entity names across all {mappedRows.length} rows…</p>
                            </div>
                        ) : (
                            <>
                                {/* Stats bar */}
                                <div className="grid grid-cols-3 gap-4">
                                    {[
                                        { label: 'Auto-matched', count: resolutions.filter(r => r.status === 'AUTO_MATCHED').length, color: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
                                        { label: 'Needs Review', count: needsReviewCount, color: 'text-amber-700 bg-amber-50 border-amber-100' },
                                        { label: 'Will Create New', count: resolutions.filter(r => r.status === 'NEW').length, color: 'text-blue-700 bg-blue-50 border-blue-100' },
                                    ].map(s => (
                                        <div key={s.label} className={cn("rounded-xl border px-4 py-3 text-center", s.color)}>
                                            <div className="text-2xl font-black">{s.count}</div>
                                            <div className="text-xs font-bold mt-0.5 uppercase tracking-wider opacity-70">{s.label}</div>
                                        </div>
                                    ))}
                                </div>

                                {/* Resolution table */}
                                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                    <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                                        <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">{resolutions.length} Unique Entities</h2>
                                        {needsReviewCount > 0 && (
                                            <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                                                {needsReviewCount} need your attention
                                            </span>
                                        )}
                                    </div>

                                    <div className="divide-y divide-gray-50">
                                        {resolutions.map((r) => (
                                            <div key={r.rawName + r.type} className={cn(
                                                "px-5 py-3.5 flex items-center gap-4 transition-colors",
                                                r.status === 'NEEDS_REVIEW' ? "bg-amber-50/40" : ""
                                            )}>
                                                {/* Type badge */}
                                                <div className={cn(
                                                    "flex-shrink-0 px-2 py-0.5 rounded-md text-[10px] font-black border uppercase tracking-wider",
                                                    r.type === 'CUSTOMER'
                                                        ? "bg-blue-50 text-blue-700 border-blue-100"
                                                        : "bg-purple-50 text-purple-700 border-purple-100"
                                                )}>
                                                    {r.type === 'CUSTOMER' ? <><Users className="w-2.5 h-2.5 inline mr-1" />Cust</> : <><Briefcase className="w-2.5 h-2.5 inline mr-1" />Partner</>}
                                                </div>

                                                {/* Raw name */}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-gray-800 truncate">{r.rawName}</p>
                                                    <p className="text-xs text-gray-400 mt-0.5">
                                                        {mappedRows.filter(row =>
                                                            (r.type === 'CUSTOMER' ? row.customerName : row.partnerName) === r.rawName
                                                        ).length} project{mappedRows.filter(row =>
                                                            (r.type === 'CUSTOMER' ? row.customerName : row.partnerName) === r.rawName
                                                        ).length !== 1 ? 's' : ''}
                                                    </p>
                                                </div>

                                                {/* Arrow */}
                                                <ArrowRight className="w-4 h-4 text-gray-300 flex-shrink-0" />

                                                {/* Resolution */}
                                                <div className="flex-1 min-w-0">
                                                    {(r.status === 'AUTO_MATCHED' || r.status === 'CONFIRMED') && (
                                                        <div className="flex items-center gap-2">
                                                            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                                            <div>
                                                                <p className="text-sm font-bold text-gray-800 truncate">{r.matchName}</p>
                                                                {r.confidence && (
                                                                    <p className="text-xs text-emerald-600 font-semibold">{Math.round(r.confidence * 100)}% confident</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {r.status === 'NEW' && (
                                                        <div className="flex items-center gap-2">
                                                            <Plus className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                                            <p className="text-sm font-bold text-blue-700">Create: "{r.finalName || r.rawName}"</p>
                                                        </div>
                                                    )}
                                                    {r.status === 'NEEDS_REVIEW' && (
                                                        <div className="flex items-center gap-2">
                                                            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                                            <div>
                                                                <p className="text-xs font-bold text-amber-700">Possible match:</p>
                                                                <p className="text-sm font-bold text-gray-700">{r.suggestions[0]?.name} ({Math.round((r.suggestions[0]?.score || 0) * 100)}%)</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Action button */}
                                                <div className="flex-shrink-0">
                                                    {(r.status === 'AUTO_MATCHED' || r.status === 'CONFIRMED' || r.status === 'NEW') && (
                                                        <button
                                                            onClick={e => openPopover(r.rawName + r.type, e, r.finalName || r.rawName)}
                                                            className="text-xs text-gray-400 hover:text-blue-600 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors font-medium"
                                                        >
                                                            Change
                                                        </button>
                                                    )}
                                                    {r.status === 'NEEDS_REVIEW' && (
                                                        <button
                                                            onClick={e => openPopover(r.rawName + r.type, e, r.rawName)}
                                                            className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors"
                                                        >
                                                            <Sparkles className="w-3.5 h-3.5" /> Review
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Navigation */}
                                <div className="flex items-center justify-between">
                                    <button onClick={() => setStep('map')} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                                        <ArrowLeft className="w-4 h-4" /> Back
                                    </button>
                                    <div className="flex items-center gap-3">
                                        {needsReviewCount > 0 && (
                                            <p className="text-sm text-amber-700 font-semibold">{needsReviewCount} entity{needsReviewCount !== 1 ? 'ies need' : 'y needs'} review</p>
                                        )}
                                        <button
                                            disabled={!canProceedToCommit}
                                            onClick={() => setStep('commit')}
                                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                                        >
                                            Review & Import <ArrowRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* ── FIXED POPOVER PORTAL (renders outside the scrollable list) ── */}
                {activePopover && popoverRect && (() => {
                    const activeEntry = resolutions.find(r => r.rawName + r.type === activePopover)!
                    // Local suggestions: already-resolved entries of the same type
                    const localSuggestions = resolutions
                        .filter(r => r.rawName + r.type !== activePopover && r.type === activeEntry?.type)
                        .filter(r => r.status === 'CONFIRMED' || r.status === 'AUTO_MATCHED' || r.status === 'NEW')
                        .map(r => ({
                            id: r.matchId || `local::${r.finalName || r.rawName}`,
                            name: r.matchName || r.finalName || r.rawName,
                            score: 1,
                            isLocal: true
                        }))
                    // Flip upward if popover would go off the bottom of the screen
                    const wouldClip = popoverRect.top + 440 > window.innerHeight
                    const style: React.CSSProperties = wouldClip
                        ? { position: 'fixed', bottom: window.innerHeight - popoverRect.top + 36, right: popoverRect.right }
                        : { position: 'fixed', top: popoverRect.top, right: popoverRect.right }
                    return (
                        <div style={style} className="z-[9999] w-80 bg-white rounded-2xl border border-gray-200 shadow-2xl p-4">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-xs font-black text-gray-500 uppercase tracking-wider">Resolve: {activeEntry?.rawName}</p>
                                <button onClick={closePopover}><X className="w-4 h-4 text-gray-400" /></button>
                            </div>

                            {/* Local session suggestions (previously resolved names) */}
                            {localSuggestions.length > 0 && (
                                <div className="mb-3">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">From this import</p>
                                    <div className="space-y-1 max-h-24 overflow-y-auto">
                                        {localSuggestions.map(s => (
                                            <button key={s.id} onClick={() => s.id.startsWith('local::') ? confirmNew(activeEntry.rawName, s.name) : confirmMatch(activeEntry.rawName, s.id, s.name)}
                                                className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-blue-50 transition-colors text-sm">
                                                <Sparkles className="w-3 h-3 text-blue-400 flex-shrink-0" />
                                                <span className="font-semibold text-gray-800">{s.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* DB Suggestions */}
                            {activeEntry?.suggestions.length > 0 && (
                                <div className="mb-3">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Database matches</p>
                                    <div className="space-y-1 max-h-28 overflow-y-auto">
                                        {activeEntry.suggestions.map(s => (
                                            <button key={s.id} onClick={() => confirmMatch(activeEntry.rawName, s.id, s.name)}
                                                className="w-full text-left flex items-center justify-between px-3 py-2 rounded-xl hover:bg-blue-50 transition-colors text-sm">
                                                <span className="font-semibold text-gray-800">{s.name}</span>
                                                <span className="text-xs text-gray-400 font-bold">{Math.round(s.score * 100)}%</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Search */}
                            <div className="mb-3">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                    <input
                                        value={searchQ}
                                        onChange={e => { setSearchQ(e.target.value); doSearch(e.target.value, activeEntry?.type, activeEntry?.rawName) }}
                                        placeholder="Search database & this import…"
                                        className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                {searchLoading && <p className="text-xs text-gray-500 mt-1 pl-1">Searching…</p>}
                                {searchResults.length > 0 && (
                                    <div className="mt-1 space-y-1 max-h-24 overflow-y-auto">
                                        {searchResults.map(s => (
                                            <button key={s.id}
                                                onClick={() => s.id?.startsWith('local::') ? confirmNew(activeEntry.rawName, s.name) : confirmMatch(activeEntry.rawName, s.id, s.name)}
                                                className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-blue-50 text-sm font-semibold text-gray-800 transition-colors">
                                                {s.isLocal && <Sparkles className="w-3 h-3 text-blue-400 flex-shrink-0" />}
                                                {s.name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Create new */}
                            <div className="border-t border-gray-100 pt-3">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Create New Record</p>
                                <div className="flex gap-2">
                                    <input
                                        value={newName}
                                        onChange={e => setNewName(e.target.value)}
                                        placeholder="Correct / canonical name…"
                                        className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                    <button
                                        onClick={() => confirmNew(activeEntry.rawName, newName || activeEntry.rawName)}
                                        disabled={!newName.trim()}
                                        className="px-3 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                })()}

                {/* ── STEP 4: COMMIT ── */}
                {step === 'commit' && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
                                <h2 className="font-bold text-gray-900 text-sm">Import Summary</h2>
                                <p className="text-xs text-gray-500 mt-0.5">Review everything before committing to the database</p>
                            </div>
                            <div className="p-5 space-y-4">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    {[
                                        { label: 'Projects', value: mappedRows.length, icon: FileText, color: 'blue' },
                                        { label: 'Customers', value: resolutions.filter(r => r.type === 'CUSTOMER').length, icon: Users, color: 'indigo' },
                                        { label: 'Partners', value: resolutions.filter(r => r.type === 'PARTNER').length, icon: Briefcase, color: 'purple' },
                                        { label: 'New Records', value: resolutions.filter(r => r.status === 'NEW').length, icon: Plus, color: 'emerald' },
                                    ].map(s => (
                                        <div key={s.label} className="bg-gray-50 rounded-xl p-4 text-center border border-gray-100">
                                            <div className="text-3xl font-black text-gray-900">{s.value}</div>
                                            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-1">{s.label}</div>
                                        </div>
                                    ))}
                                </div>
                                <div className="text-xs text-gray-500 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                    <strong className="text-gray-700">Pipeline:</strong> {pipelines.find(p => p.id === pipelineId)?.name || pipelineId}
                                </div>
                            </div>
                        </div>

                        {/* Entity Summary */}
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Entity Resolution Summary</h3>
                            </div>
                            <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
                                {resolutions.map(r => (
                                    <div key={r.rawName + r.type} className="px-5 py-3 flex items-center gap-3 text-sm">
                                        <span className={cn(
                                            "text-[10px] font-black px-2 py-0.5 rounded border uppercase tracking-wider flex-shrink-0",
                                            r.type === 'CUSTOMER' ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-purple-50 text-purple-700 border-purple-100"
                                        )}>{r.type === 'CUSTOMER' ? 'Cust' : 'Part'}</span>
                                        <span className="text-gray-500 truncate flex-1">{r.rawName}</span>
                                        <ArrowRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                                        {(r.status === 'AUTO_MATCHED' || r.status === 'CONFIRMED') ? (
                                            <span className="font-semibold text-emerald-700 flex items-center gap-1 truncate flex-1">
                                                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" /> {r.matchName}
                                            </span>
                                        ) : (
                                            <span className="font-semibold text-blue-700 flex items-center gap-1 truncate flex-1">
                                                <Plus className="w-3.5 h-3.5 flex-shrink-0" /> {r.finalName || r.rawName}
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <button onClick={() => setStep('resolve')} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                                <ArrowLeft className="w-4 h-4" /> Back
                            </button>
                            <button
                                onClick={handleCommit}
                                disabled={committing}
                                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm"
                            >
                                {committing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                                {committing ? `Importing ${mappedRows.length} projects…` : `Import ${mappedRows.length} Projects`}
                            </button>
                        </div>
                    </div>
                )}

                {/* ── DONE ── */}
                {step === 'done' && commitResult && (
                    <div className="flex flex-col items-center text-center gap-6 py-16">
                        <div className="w-20 h-20 rounded-3xl bg-emerald-50 flex items-center justify-center border border-emerald-100">
                            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-gray-900">Import Complete!</h2>
                            <p className="text-base text-gray-500 mt-2">
                                <strong className="text-gray-800">{commitResult.count}</strong> legacy projects have been imported to the CRM pipeline.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setStep('upload'); setRawRows([]); setResolutions([]); setMappedRows([]); setCommitResult(null); setError(null) }}
                                className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Import Another File
                            </button>
                            <a href="/dashboard/crm/pipeline" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm">
                                View CRM Pipeline <ArrowRight className="w-4 h-4" />
                            </a>
                        </div>
                    </div>
                )}
            </div>

            {/* Overlay to close popover */}
            {activePopover && (
                <div className="fixed inset-0 z-[9998]" onClick={closePopover} />
            )}
        </div>
    )
}
