'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { formatCurrency } from '@/lib/format'
import { User, Users, Printer, TrendingUp, DollarSign, Target, ArrowLeft, Phone, Calendar, Mail, FileText, ChevronLeft, ChevronRight, Search, X } from 'lucide-react'
import DocumentHeader from '@/components/DocumentHeader'
import DocumentFooter from '@/components/DocumentFooter'
import ActivityDetailModal from '@/components/crm/ActivityDetailModal'
import { format, startOfWeek, endOfWeek, addWeeks, parseISO } from 'date-fns'
import '@/styles/print.css'

export default function CRMReportsPage() {
    const searchParams = useSearchParams()
    const scopeFromUrl = (searchParams.get('scope') as 'all' | 'mine') || 'all'
    const rangeFromUrl = (searchParams.get('range') as 'forecast' | 'history' | 'activities') || 'forecast'

    const [salesReps, setSalesReps] = useState<any[]>([])
    const [selectedRep, setSelectedRep] = useState('ALL')
    const [scope, setScope] = useState<'all' | 'mine'>(scopeFromUrl)
    const [range, setRange] = useState<'forecast' | 'history' | 'activities'>(rangeFromUrl)
    const [weekOffset, setWeekOffset] = useState(0)
    const [viewType, setViewType] = useState<'weekly' | 'monthly'>('weekly')
    const [selectedCustomer, setSelectedCustomer] = useState<{ id: string, name: string } | null>(null)
    const [customerSearch, setCustomerSearch] = useState('')
    const [customerResults, setCustomerResults] = useState<any[]>([])
    const [showResults, setShowResults] = useState(false)
    const [canViewAll, setCanViewAll] = useState<boolean | null>(null)
    const [hasReportAccess, setHasReportAccess] = useState<boolean | null>(null)

    // Customer Search logic
    useEffect(() => {
        if (customerSearch.trim().length >= 2) {
            const timer = setTimeout(() => {
                fetch(`/api/customers?search=${customerSearch}&limit=5`)
                    .then(res => res.json())
                    .then(data => {
                        setCustomerResults(data.customers || [])
                        setShowResults(true)
                    })
                    .catch(console.error)
            }, 300)
            return () => clearTimeout(timer)
        } else {
            setCustomerResults([])
            setShowResults(false)
        }
    }, [customerSearch])

    // Check report access
    useEffect(() => {
        fetch('/api/auth/me')
            .then(r => r.json())
            .then(d => {
                const perms: string[] = d.user?.permissions || []
                setHasReportAccess(
                    perms.includes('all:manage') ||
                    perms.includes('reports:read') ||
                    perms.includes('reports:manage')
                )
            })
            .catch(() => setHasReportAccess(false))
    }, [])

    useEffect(() => {
        fetch('/api/crm/projects?limit=1&page=1')
            .then(r => r.json())
            .then(d => setCanViewAll(typeof d.canViewAll === 'boolean' ? d.canViewAll : false))
            .catch(() => setCanViewAll(false))
    }, [])

    useEffect(() => {
        if (canViewAll) {
            fetch('/api/sales-reps')
                .then(res => res.ok ? res.json() : [])
                .then(data => setSalesReps(Array.isArray(data) ? data : []))
                .catch(() => setSalesReps([]))
        }
    }, [canViewAll])

    const repLabel = selectedRep === 'ALL'
        ? 'All Representatives'
        : (salesReps.find(r => r.id === selectedRep)?.name || '')

    // Early return if user has no report access
    if (hasReportAccess === false) {
        return (
            <div className="p-6 max-w-7xl mx-auto">
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <p className="text-gray-500 font-medium">You do not have permission to view this report.</p>
                    <p className="text-sm text-gray-400 mt-1">Contact your administrator to request access.</p>
                </div>
            </div>
        )
    }

    return (
        <>
            <style>{`
                @media print {
                    @page { size: A4 landscape; margin: 10mm; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; }
                    .no-print { display: none !important; }
                    nav, aside, header, .sidebar { display: none !important; }

                    /* Compact table — border-only, no fills */
                    .crm-report-table th {
                        font-size: 7.5pt !important;
                        padding: 4px 8px !important;
                        height: 22px !important;
                        line-height: 1;
                        border-bottom: 2px solid #111827 !important;
                        background-color: transparent !important;
                        color: #111827 !important;
                    }
                    .crm-report-table td {
                        font-size: 7.5pt !important;
                        padding: 3px 8px !important;
                        height: 20px !important;
                        line-height: 1.3 !important;
                        border-bottom: 1px solid #d1d5db !important;
                        background-color: transparent !important;
                        vertical-align: top !important;
                    }
                    .crm-report-table .totals-row td {
                        border-top: 2px solid #111827 !important;
                        border-bottom: none !important;
                        font-weight: 700 !important;
                    }
                    .crm-report-table tbody tr:nth-child(even) td { background-color: transparent !important; }
                    .crm-report-table.compact th, .crm-report-table.compact td {
                        font-size: 6.5pt !important;
                        padding: 2px 4px !important;
                    }
                    .crm-report-table.compact th { height: 18px !important; }
                    .crm-report-table.compact td { height: 16px !important; }

                    thead { display: table-header-group; }
                    tr { break-inside: avoid; }

                    /* Summary table */
                    .rep-summary-table th, .rep-summary-table td {
                        font-size: 8pt !important;
                        border-bottom: 1px solid #d1d5db !important;
                        background-color: transparent !important;
                    }
                    .rep-summary-table th {
                        font-weight: 700 !important;
                        border-bottom: 2px solid #111827 !important;
                        padding: 5px 8px !important;
                        text-transform: uppercase;
                        font-size: 7pt !important;
                        letter-spacing: 0.05em;
                        color: #374151 !important;
                    }
                    .rep-summary-table td { padding: 5px 8px !important; height: 22px !important; vertical-align: middle !important; }
                    .rep-summary-table .totals-row td { border-top: 2px solid #111827 !important; border-bottom: none !important; font-weight: 700 !important; }
                }
            `}</style>

            <div className="p-6 max-w-7xl mx-auto space-y-5">

                {/* ── Page header ─────────────────────────────────── */}
                <div className="no-print flex flex-col md:flex-row md:items-center justify-between gap-x-6 gap-y-4 py-2">
                    <div className="flex items-center gap-3">
                        <Link href="/dashboard/crm/pipeline" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </Link>
                        <div>
                            <h1 className="text-lg font-bold tracking-tight text-gray-900 leading-tight">
                                {range === 'history' ? '12-Month History' : range === 'activities' ? 'SalesRep Activity Report' : 'Sales Forecast & History'}
                            </h1>
                            <p className="text-[11px] text-gray-500 leading-none mt-0.5">
                                {range === 'history' ? 'Performance summary over the last year' : range === 'activities' ? 'Daily activity counts with weekly view' : 'Pipeline breakdown by rep · ±2 months'}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* Range Toggle */}
                        <div className="flex bg-gray-100 rounded-lg p-0.5 border border-gray-200">
                            <button onClick={() => setRange('forecast')}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${range === 'forecast' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
                                Forecast
                            </button>
                            <button onClick={() => setRange('history')}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${range === 'history' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
                                History
                            </button>
                            <button onClick={() => setRange('activities')}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${range === 'activities' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
                                Activities
                            </button>
                        </div>

                        {canViewAll && (
                            <>
                                <div className="flex bg-gray-100 rounded-lg p-0.5 border border-gray-200">
                                    <button onClick={() => { setScope('all'); setSelectedRep('ALL') }}
                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${scope === 'all' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                                        <Users className="w-3.5 h-3.5" /> All
                                    </button>
                                    <button onClick={() => { setScope('mine'); setSelectedRep('ALL') }}
                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${scope === 'mine' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                                        <User className="w-3.5 h-3.5" /> Mine
                                    </button>
                                </div>
                                {scope === 'all' && (
                                    <div className="flex items-center gap-2">
                                        <select
                                            className="rounded-lg border border-gray-200 shadow-sm px-2 py-1.5 text-sm bg-white focus:ring-blue-500 focus:border-blue-500 outline-none"
                                            value={selectedRep}
                                            onChange={(e) => setSelectedRep(e.target.value)}
                                        >
                                            <option value="ALL">All Representatives</option>
                                            {salesReps.map(rep => (
                                                <option key={rep.id} value={rep.id}>{rep.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </>
                        )}
                        <button
                            onClick={() => window.print()}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm ms-auto md:ms-0"
                        >
                            <Printer className="w-4 h-4" /> Print
                        </button>
                    </div>
                </div>

                {/* ── Print header ─────────────────────────────────── */}
                <div className="hidden print:block">
                    <DocumentHeader
                        title={range === 'history' ? "CRM 12-MONTH HISTORY" : range === 'activities' ? "SALESREP ACTIVITY REPORT" : "SALES FORECAST & HISTORY"}
                        subtitle="CRM Performance Report"
                        titleSize="text-2xl"
                    />
                    <div style={{ fontSize: '8pt', color: '#6b7280', marginBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{scope === 'mine' ? 'Scope: My Projects' : `Scope: All Projects${repLabel !== 'All Representatives' ? ` · Rep: ${repLabel}` : ''}`} · Period: ±2 months from current</span>
                        <span>Printed {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    </div>
                </div>

                {/* ── Report ───────────────────────────────────────── */}
                {canViewAll !== null && (
                    range === 'activities' ? (
                        <div className="space-y-6">
                            {/* Activities Specific Filters */}
                            <div className="no-print grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-inner">
                                {/* Customer Search Filter */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Target Customer / Partner</label>
                                    <div className="relative">
                                        <div className={`flex items-center gap-3 w-full px-4 py-2.5 bg-white border rounded-xl transition-all ${selectedCustomer ? 'border-blue-500 ring-2 ring-blue-500/10' : 'border-slate-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10'}`}>
                                            <Search className={`w-4 h-4 ${selectedCustomer ? 'text-blue-500' : 'text-slate-400'}`} />
                                            {selectedCustomer ? (
                                                <div className="flex-1 flex items-center justify-between">
                                                    <span className="text-sm font-bold text-slate-900">{selectedCustomer.name}</span>
                                                    <button
                                                        onClick={() => { setSelectedCustomer(null); setCustomerSearch('') }}
                                                        className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <input
                                                    type="text"
                                                    placeholder="Search customer or partner name..."
                                                    className="flex-1 bg-transparent border-none outline-none text-sm text-slate-700 placeholder:text-slate-400"
                                                    value={customerSearch}
                                                    onChange={(e) => setCustomerSearch(e.target.value)}
                                                    onFocus={() => setShowResults(true)}
                                                />
                                            )}
                                        </div>

                                        {showResults && customerResults.length > 0 && !selectedCustomer && (
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1">
                                                {customerResults.map(c => (
                                                    <button
                                                        key={c.id}
                                                        onClick={() => {
                                                            setSelectedCustomer({ id: c.id, name: c.name });
                                                            setShowResults(false);
                                                            setCustomerSearch('');
                                                        }}
                                                        className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 flex flex-col gap-0.5"
                                                    >
                                                        <span className="text-sm font-bold text-slate-900">{c.name}</span>
                                                        <span className="text-[10px] text-slate-400 uppercase tracking-tighter">{c.roles?.join(' · ') || 'Customer'}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* View Scope Info */}
                                <div className="space-y-2 flex flex-col justify-end">
                                    <div className="bg-white/60 p-3 rounded-xl border border-slate-100 flex items-center gap-4">
                                        <div className="p-2 bg-blue-50 rounded-lg">
                                            <TrendingUp className="w-4 h-4 text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Current Matrix View</p>
                                            <p className="text-xs font-bold text-slate-700">
                                                {viewType === 'weekly' ? '7-Day Weekly Breakdown' : 'Full Month Activity Grid'}
                                                {selectedCustomer && <span className="text-blue-600"> · Filtered by {selectedCustomer.name}</span>}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <ActivitySummaryTable
                                selectedRep={scope === 'mine' ? 'ALL' : selectedRep}
                                scope={scope}
                                weekOffset={weekOffset}
                                setWeekOffset={setWeekOffset}
                                viewType={viewType}
                                setViewType={setViewType}
                                customerId={selectedCustomer?.id}
                            />
                        </div>
                    ) : (
                        <PerformanceTable
                            selectedRep={scope === 'mine' ? 'ALL' : selectedRep}
                            scope={scope}
                            range={range}
                        />
                    )
                )}

                {/* ── Print footer ─────────────────────────────────── */}
                <div className="hidden print:block">
                    <DocumentFooter />
                </div>
            </div>
        </>
    )
}


function PerformanceTable({ selectedRep, scope, range }: { selectedRep: string; scope: string; range: string }) {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        setLoading(true)
        fetch(`/api/crm/reports/performance?salesRepId=${selectedRep}&scope=${scope}&range=${range}`)
            .then(res => res.json())
            .then(setData)
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [selectedRep, scope, range])

    if (loading) return <div className="text-center py-12 text-gray-400 text-sm">Loading report…</div>
    if (!data) return null

    // Per-rep totals
    const repTotals = data.data.map((rep: any) => {
        let totalWon = 0, totalExpected = 0, bestMonth = '', bestWon = 0
        data.months.forEach((m: string) => {
            const cell = rep.data[m] || { won: 0, expected: 0 }
            totalWon += cell.won
            totalExpected += cell.expected
            if (cell.won > bestWon) { bestWon = cell.won; bestMonth = m }
        })
        const winRate = (totalWon + totalExpected) > 0
            ? Math.round((totalWon / (totalWon + totalExpected)) * 100) : 0
        return { ...rep, totalWon, totalExpected, winRate, bestMonth }
    })

    const grandWon = repTotals.reduce((s: number, r: any) => s + r.totalWon, 0)
    const grandExpected = repTotals.reduce((s: number, r: any) => s + r.totalExpected, 0)
    const grandWinRate = (grandWon + grandExpected) > 0
        ? Math.round((grandWon / (grandWon + grandExpected)) * 100) : 0

    // Month totals
    const monthTotals: Record<string, { won: number; expected: number }> = {}
    data.months.forEach((m: string) => {
        let won = 0, expected = 0
        data.data.forEach((rep: any) => {
            const cell = rep.data[m] || { won: 0, expected: 0 }
            won += cell.won; expected += cell.expected
        })
        monthTotals[m] = { won, expected }
    })

    const isHistory = range === 'history'
    const formatReportValue = (val: number) => {
        if (isHistory && val > 0) {
            const kVal = val / 1000
            // If it's a whole number or close to it, avoid decimals to save space
            const formattedK = kVal >= 10
                ? Math.round(kVal).toLocaleString()
                : kVal.toLocaleString('en-US', { maximumFractionDigits: 1 })
            return `${formattedK}k`
        }
        return formatCurrency(val)
    }

    return (
        <div className="space-y-5">

            {/* ── KPI cards (screen only) ───────────────────────── */}
            <div className={`no-print grid grid-cols-3 gap-4`}>
                {[
                    { icon: DollarSign, label: 'Total Won', value: formatReportValue(grandWon), color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
                    { icon: Target, label: 'Pipeline (Expected)', value: formatReportValue(grandExpected), color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
                    { icon: TrendingUp, label: 'Overall Win Rate', value: `${grandWinRate}%`, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
                ].map(card => (
                    <div key={card.label} className={`flex items-center gap-3 p-4 rounded-xl border ${card.border} ${card.bg}`}>
                        <div className="p-2 rounded-lg bg-white shadow-sm">
                            <card.icon className={`w-4 h-4 ${card.color}`} />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">{card.label}</p>
                            <p className={`text-lg font-bold ${card.color}`}>{card.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Rep Summary table (both screen + print) ──────── */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden print:shadow-none print:border-0 print:rounded-none print:overflow-visible">

                {/* Section label */}
                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between print:px-0 print:py-1 print:border-gray-300">
                    <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Representative Summary</h2>
                    <span className="no-print text-xs text-gray-400">{data.data.length} rep{data.data.length !== 1 ? 's' : ''}</span>
                </div>

                <div className="overflow-x-auto print:overflow-visible">
                    <table className={`rep-summary-table min-w-full ${isHistory ? 'compact' : ''}`} style={{ borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ backgroundColor: undefined }}>
                                {['Sales Representative', 'Total Won', 'Pipeline', 'Total Forecast', 'Win Rate', 'Best Month'].map((h, i) => (
                                    <th key={h} style={{
                                        padding: '8px 12px',
                                        fontSize: '10px',
                                        fontWeight: 700,
                                        textTransform: 'uppercase' as const,
                                        letterSpacing: '0.05em',
                                        color: '#6b7280',
                                        textAlign: i === 0 ? 'left' as const : 'right' as const,
                                        borderBottom: '2px solid #e5e7eb',
                                        backgroundColor: '#fff',
                                        whiteSpace: 'nowrap' as const,
                                    }}>
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {repTotals.map((rep: any, idx: number) => (
                                <tr key={rep.id} style={{ backgroundColor: '#fff' }}>
                                    <td style={{ padding: '8px 12px', fontSize: '13px', fontWeight: 600, color: '#111827', borderBottom: '1px solid #f3f4f6' }}>{rep.name}</td>
                                    <td style={{ padding: '8px 12px', fontSize: '13px', fontWeight: 600, color: '#16a34a', textAlign: 'right', borderBottom: '1px solid #f3f4f6', whiteSpace: 'nowrap' }}>
                                        {rep.totalWon > 0 ? formatReportValue(rep.totalWon) : <span style={{ color: '#d1d5db' }}>—</span>}
                                    </td>
                                    <td style={{ padding: '8px 12px', fontSize: '13px', color: '#2563eb', textAlign: 'right', borderBottom: '1px solid #f3f4f6', whiteSpace: 'nowrap' }}>
                                        {rep.totalExpected > 0 ? formatReportValue(rep.totalExpected) : <span style={{ color: '#d1d5db' }}>—</span>}
                                    </td>
                                    <td style={{ padding: '8px 12px', fontSize: '13px', fontWeight: 500, color: '#374151', textAlign: 'right', borderBottom: '1px solid #f3f4f6', whiteSpace: 'nowrap' }}>
                                        {formatReportValue(rep.totalWon + rep.totalExpected)}
                                    </td>
                                    <td style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '1px solid #f3f4f6' }}>
                                        <span style={{ fontSize: '12px', fontWeight: 700, color: rep.winRate >= 50 ? '#16a34a' : rep.winRate >= 25 ? '#d97706' : '#dc2626' }}>
                                            {rep.winRate}%
                                        </span>
                                    </td>
                                    <td style={{ padding: '8px 12px', fontSize: '12px', color: '#6b7280', textAlign: 'right', borderBottom: '1px solid #f3f4f6' }}>
                                        {rep.bestMonth || <span style={{ color: '#d1d5db' }}>—</span>}
                                    </td>
                                </tr>
                            ))}
                            {/* Grand total row */}
                            <tr className="totals-row" style={{ borderTop: '2px solid #e5e7eb', backgroundColor: '#fff' }}>
                                <td style={{ padding: '8px 12px', fontSize: '12px', fontWeight: 700, color: '#374151' }}>TOTAL</td>
                                <td style={{ padding: '8px 12px', fontSize: '13px', fontWeight: 700, color: '#16a34a', textAlign: 'right', whiteSpace: 'nowrap' }}>{formatReportValue(grandWon)}</td>
                                <td style={{ padding: '8px 12px', fontSize: '13px', fontWeight: 700, color: '#2563eb', textAlign: 'right', whiteSpace: 'nowrap' }}>{formatReportValue(grandExpected)}</td>
                                <td style={{ padding: '8px 12px', fontSize: '13px', fontWeight: 700, color: '#111827', textAlign: 'right', whiteSpace: 'nowrap' }}>{formatReportValue(grandWon + grandExpected)}</td>
                                <td style={{ padding: '8px 12px', fontSize: '13px', fontWeight: 700, color: '#7c3aed', textAlign: 'right' }}>{grandWinRate}%</td>
                                <td style={{ padding: '8px 12px' }}></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Monthly crosstab: reps as rows, months as cols ── */}
            {/* Original orientation preserved */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden print:shadow-none print:border-0 print:rounded-none print:overflow-visible print:mt-4">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between print:px-0 print:py-1 print:border-gray-300">
                    <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Monthly Breakdown</h2>
                    <div className="no-print flex items-center gap-4 text-xs text-gray-400">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-green-500 inline-block" /> Won</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-400 inline-block" /> Pipeline</span>
                    </div>
                </div>
                <div className="overflow-x-auto print:overflow-visible text-[10px]">
                    <table className={`crm-report-table min-w-full ${isHistory ? 'compact' : ''}`} style={{ borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                {/* First col: Sales Rep */}
                                <th style={{
                                    padding: '8px 12px', textAlign: 'left', fontSize: '10px', fontWeight: 700,
                                    textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280',
                                    borderBottom: '2px solid #e5e7eb', backgroundColor: '#fff',
                                    position: 'sticky', left: 0, zIndex: 1, minWidth: '130px', whiteSpace: 'nowrap',
                                }}>
                                    Sales Rep
                                </th>
                                {data.months.map((month: string) => (
                                    <th key={month} style={{
                                        padding: '4px 8px', textAlign: 'right', fontSize: isHistory ? '7.5px' : '9px', fontWeight: 700,
                                        textTransform: 'uppercase', letterSpacing: '0.03em', color: '#6b7280',
                                        borderBottom: '2px solid #e5e7eb', backgroundColor: '#fff',
                                        minWidth: isHistory ? '60px' : '110px', whiteSpace: 'nowrap',
                                    }}>
                                        {month}
                                    </th>
                                ))}
                                {/* Total column */}
                                <th style={{
                                    padding: '4px 8px', textAlign: 'right', fontSize: isHistory ? '7.5px' : '9px', fontWeight: 700,
                                    textTransform: 'uppercase', letterSpacing: '0.03em', color: '#374151',
                                    borderBottom: '2px solid #e5e7eb', backgroundColor: '#fff',
                                    minWidth: isHistory ? '60px' : '110px', whiteSpace: 'nowrap', borderLeft: '2px solid #e5e7eb',
                                }}>
                                    Total
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* One row per rep */}
                            {repTotals.map((rep: any, idx: number) => (
                                <tr key={rep.id} style={{ backgroundColor: '#fff' }}>
                                    <td style={{
                                        padding: '8px 12px', fontSize: '12px', fontWeight: 600, color: '#111827',
                                        borderBottom: '1px solid #f3f4f6', borderRight: '1px solid #e5e7eb',
                                        position: 'sticky', left: 0, backgroundColor: '#fff',
                                        zIndex: 1, maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                    }} title={rep.name}>
                                        {rep.name}
                                    </td>
                                    {data.months.map((month: string) => {
                                        const cell = rep.data[month] || { won: 0, expected: 0 }
                                        return (
                                            <td key={month} style={{ padding: isHistory ? '4px 8px' : '7px 12px', textAlign: 'right', borderBottom: '1px solid #f3f4f6', borderRight: '1px solid #f9fafb', verticalAlign: 'top' }}>
                                                {cell.won > 0 && <div style={{ fontSize: isHistory ? '10px' : '12px', fontWeight: 600, color: '#16a34a', lineHeight: 1.3 }}>{formatReportValue(cell.won)}</div>}
                                                {cell.expected > 0 && <div style={{ fontSize: isHistory ? '8px' : '10px', color: '#2563eb', lineHeight: 1.3, marginTop: cell.won > 0 ? '2px' : 0 }}>{formatReportValue(cell.expected)}</div>}
                                                {!cell.won && !cell.expected && <span style={{ color: '#d1d5db', fontSize: '11px' }}>—</span>}
                                            </td>
                                        )
                                    })}
                                    {/* Row total */}
                                    <td style={{ padding: isHistory ? '4px 8px' : '7px 12px', textAlign: 'right', borderBottom: '1px solid #f3f4f6', borderLeft: '2px solid #e5e7eb', verticalAlign: 'top', backgroundColor: '#fff' }}>
                                        {rep.totalWon > 0 && <div style={{ fontSize: isHistory ? '10px' : '12px', fontWeight: 700, color: '#16a34a', lineHeight: 1.3 }}>{formatReportValue(rep.totalWon)}</div>}
                                        {rep.totalExpected > 0 && <div style={{ fontSize: isHistory ? '8px' : '10px', color: '#2563eb', lineHeight: 1.3, marginTop: rep.totalWon > 0 ? '2px' : 0 }}>{formatReportValue(rep.totalExpected)}</div>}
                                    </td>
                                </tr>
                            ))}
                            {/* Month totals row */}
                            <tr className="totals-row" style={{ borderTop: '2px solid #e5e7eb' }}>
                                <td style={{ padding: '8px 12px', fontSize: '11px', fontWeight: 700, color: '#374151', position: 'sticky', left: 0, backgroundColor: '#fff', zIndex: 1, borderRight: '1px solid #e5e7eb' }}>
                                    TOTAL
                                </td>
                                {data.months.map((month: string) => (
                                    <td key={month} style={{ padding: isHistory ? '4px 8px' : '8px 12px', textAlign: 'right', backgroundColor: '#fff', verticalAlign: 'top' }}>
                                        {monthTotals[month].won > 0 && <div style={{ fontSize: isHistory ? '10px' : '12px', fontWeight: 700, color: '#16a34a', lineHeight: 1.3 }}>{formatReportValue(monthTotals[month].won)}</div>}
                                        {monthTotals[month].expected > 0 && <div style={{ fontSize: isHistory ? '8px' : '10px', fontWeight: 600, lineHeight: 1.3, marginTop: monthTotals[month].won > 0 ? '2px' : 0 }}>{formatReportValue(monthTotals[month].expected)}</div>}
                                        {!monthTotals[month].won && !monthTotals[month].expected && <span style={{ color: '#d1d5db', fontSize: '11px' }}>—</span>}
                                    </td>
                                ))}
                                <td style={{ padding: isHistory ? '4px 8px' : '8px 12px', textAlign: 'right', backgroundColor: '#fff', borderLeft: '2px solid #e5e7eb', verticalAlign: 'top' }}>
                                    <div style={{ fontSize: isHistory ? '11px' : '12px', fontWeight: 700, color: '#16a34a' }}>{formatReportValue(grandWon)}</div>
                                    <div style={{ fontSize: isHistory ? '9px' : '10px', color: '#2563eb', fontWeight: 600, marginTop: '2px' }}>{formatReportValue(grandExpected)}</div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Legend — screen */}
                <div className="no-print px-5 py-2 border-t border-gray-100 bg-gray-50 flex items-center gap-5 text-xs text-gray-400">
                    <span>Green = Won (closed &amp; won)</span>
                    <span>Blue = Pipeline (open forecast)</span>
                </div>
                {/* Legend — print */}
                <div className="hidden print:block" style={{ fontSize: '6pt', color: '#9ca3af', marginTop: '4px' }}>
                    {isHistory ? "All amounts in 'k' (e.g. 5,000 = 5k) · " : ""}Green = Won · Blue = Pipeline (open forecast)
                </div>
            </div>
        </div>
    )
}

function ActivitySummaryTable({ selectedRep, scope, weekOffset, setWeekOffset, viewType, setViewType, customerId }: {
    selectedRep: string;
    scope: string;
    weekOffset: number;
    setWeekOffset: (v: number) => void;
    viewType: 'weekly' | 'monthly';
    setViewType: (v: 'weekly' | 'monthly') => void;
    customerId?: string;
}) {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [selectedCell, setSelectedCell] = useState<{ userName: string; date: string; items: any[] } | null>(null)

    useEffect(() => {
        setLoading(true)
        const params = new URLSearchParams({
            salesRepId: selectedRep,
            scope,
            weekOffset: weekOffset.toString(),
            viewType,
        })
        if (customerId && customerId !== 'ALL') params.append('customerId', customerId)

        fetch(`/api/crm/reports/activities?${params.toString()}`)
            .then(res => res.json())
            .then(setData)
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [selectedRep, scope, weekOffset, viewType, customerId])

    if (loading) return <div className="text-center py-12 text-gray-400 text-sm">Loading activities…</div>
    if (!data) return null

    const dateRangeStr = viewType === 'monthly'
        ? format(new Date(data.weekStart), 'MMMM yyyy')
        : (data.weekStart && data.weekEnd
            ? `${format(new Date(data.weekStart), 'do MMM')} - ${format(new Date(data.weekEnd), 'do MMM yyyy')}`
            : 'Loading...')

    return (
        <div className="space-y-5">
            {/* View Controls & Navigation */}
            <div className="no-print flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex bg-gray-100 rounded-lg p-0.5 border border-gray-200 shrink-0">
                    <button onClick={() => { setViewType('weekly'); setWeekOffset(0) }}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${viewType === 'weekly' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
                        Weekly
                    </button>
                    <button onClick={() => { setViewType('monthly'); setWeekOffset(0) }}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${viewType === 'monthly' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
                        Monthly
                    </button>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setWeekOffset(weekOffset - 1)}
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors border border-transparent hover:border-gray-200"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="text-center min-w-[150px]">
                        <p className="text-sm font-bold text-gray-900">{dateRangeStr}</p>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">
                            {viewType === 'monthly' ? 'Month View' : 'Week View'}
                        </p>
                    </div>
                    <button
                        onClick={() => setWeekOffset(weekOffset + 1)}
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors border border-transparent hover:border-gray-200"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>

                <button
                    onClick={() => setWeekOffset(0)}
                    disabled={weekOffset === 0}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 disabled:opacity-30 px-3 py-1.5 rounded-lg border border-blue-100 hover:bg-blue-50 transition-all uppercase tracking-tight"
                >
                    Current {viewType === 'monthly' ? 'Month' : 'Week'}
                </button>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden print:shadow-none print:border-0 print:rounded-none">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="min-w-full divide-y divide-gray-200" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                        <thead>
                            <tr className="bg-gray-50/50">
                                <th className="px-5 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-200 sticky left-0 bg-white z-10 min-w-[180px] shadow-[1px_0_0_0_#e5e7eb]">
                                    Sales Representative
                                </th>
                                {data.columns.map((col: any) => (
                                    <th key={col.id} className="px-3 py-4 text-center text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-200 min-w-[100px]">
                                        {viewType === 'monthly' ? (
                                            <span className="text-gray-900">{col.label}</span>
                                        ) : (
                                            <div className="flex flex-col items-center">
                                                <span className="opacity-60">{col.label.split(' ')[0]}</span>
                                                <span className="text-gray-900 mt-0.5">{col.label.split(' ')[1]}</span>
                                            </div>
                                        )}
                                    </th>
                                ))}
                                <th className="px-3 py-4 text-center text-[10px] font-bold text-gray-900 uppercase tracking-widest border-b border-gray-200 min-w-[80px] bg-slate-50/50">
                                    Total
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {data.data.map((rep: any) => {
                                const rowTotal = Object.values(rep.columns).reduce((acc: number, curr: any) => acc + curr.total, 0)
                                const rowCalls = Object.values(rep.columns).reduce((acc: number, curr: any) => acc + curr.CALL, 0)
                                const rowMeetings = Object.values(rep.columns).reduce((acc: number, curr: any) => acc + curr.MEETING, 0)

                                return (
                                    <tr key={rep.userId} className="hover:bg-gray-50/30 transition-colors">
                                        <td className="px-5 py-3 text-[11px] font-bold text-gray-900 sticky left-0 bg-white border-r border-gray-200 z-10 shadow-[1px_0_0_0_#e5e7eb]">
                                            {rep.userName}
                                        </td>
                                        {data.columns.map((col: any) => {
                                            const cell = rep.columns[col.id]
                                            return (
                                                <td
                                                    key={col.id}
                                                    className={`px-2 py-3 text-center border-r border-gray-50/50 last:border-r-0 cursor-pointer hover:bg-blue-50/50 transition-all group relative`}
                                                    onClick={() => cell.total > 0 && setSelectedCell({ userName: rep.userName, date: col.label, items: cell.items })}
                                                >
                                                    {cell.total > 0 ? (
                                                        <div className="flex flex-wrap justify-center gap-1">
                                                            {cell.CALL > 0 && (
                                                                <div title="Calls" className="flex items-center gap-1 bg-green-50 text-green-700 px-1.5 py-0.5 rounded text-[9px] font-bold border border-green-100">
                                                                    <Phone className="w-2.5 h-2.5" /> {cell.CALL}
                                                                </div>
                                                            )}
                                                            {cell.MEETING > 0 && (
                                                                <div title="Visits" className="flex items-center gap-1 bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[9px] font-bold border border-blue-100">
                                                                    <Users className="w-2.5 h-2.5" /> {cell.MEETING}
                                                                </div>
                                                            )}
                                                            <span className="no-print absolute top-0 right-0 opacity-0 group-hover:opacity-100 bg-sky-500 text-[6px] text-white px-1 rounded-sm font-bold uppercase transition-opacity">View</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-200 text-[10px]">—</span>
                                                    )}
                                                </td>
                                            )
                                        })}
                                        <td className="px-3 py-3 text-center bg-slate-50/30 font-bold border-l border-gray-200">
                                            <div className="flex flex-col items-center gap-1">
                                                <div className="flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-[10px]">
                                                    {rowTotal}
                                                </div>
                                                <div className="flex items-center justify-center gap-1">
                                                    {rowCalls > 0 && <span className="text-[8px] text-green-600">C:{rowCalls}</span>}
                                                    {rowMeetings > 0 && <span className="text-[8px] text-blue-600">V:{rowMeetings}</span>}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                        <tfoot className="bg-slate-50/50 font-bold text-gray-900 text-[10px]">
                            <tr>
                                <td className="px-5 py-3 sticky left-0 bg-slate-50/80 z-10 border-r border-gray-200">TOTAL</td>
                                {data.columns.map((col: any) => {
                                    const colTotal = data.data.reduce((acc: number, rep: any) => acc + (rep.columns[col.id]?.total || 0), 0)
                                    const colCalls = data.data.reduce((acc: number, rep: any) => acc + (rep.columns[col.id]?.CALL || 0), 0)
                                    const colMeetings = data.data.reduce((acc: number, rep: any) => acc + (rep.columns[col.id]?.MEETING || 0), 0)
                                    return (
                                        <td key={col.id} className="px-2 py-3 text-center border-r border-gray-200 last:border-r-0">
                                            <div className="flex flex-col items-center">
                                                <span>{colTotal}</span>
                                                <div className="flex gap-1 mt-0.5">
                                                    {colCalls > 0 && <span className="text-[7px] text-green-600">C:{colCalls}</span>}
                                                    {colMeetings > 0 && <span className="text-[7px] text-blue-600">V:{colMeetings}</span>}
                                                </div>
                                            </div>
                                        </td>
                                    )
                                })}
                                <td className="px-3 py-3 text-center bg-gray-100/50">
                                    {data.data.reduce((acc: number, rep: any) => acc + Object.values(rep.columns).reduce((sum: number, c: any) => sum + c.total, 0), 0)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {selectedCell && (
                <ActivityDetailModal
                    isOpen={!!selectedCell}
                    onClose={() => setSelectedCell(null)}
                    userName={selectedCell.userName}
                    date={selectedCell.date}
                    activities={selectedCell.items}
                />
            )}
        </div>
    )
}
