'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { formatCurrency } from '@/lib/format'
import { User, Users, Printer, TrendingUp, DollarSign, Target } from 'lucide-react'
import DocumentHeader from '@/components/DocumentHeader'
import DocumentFooter from '@/components/DocumentFooter'
import '@/styles/print.css'

export default function CRMReportsPage() {
    const searchParams = useSearchParams()
    const scopeFromUrl = (searchParams.get('scope') as 'all' | 'mine') || 'all'

    const [salesReps, setSalesReps] = useState<any[]>([])
    const [selectedRep, setSelectedRep] = useState('ALL')
    const [scope, setScope] = useState<'all' | 'mine'>(scopeFromUrl)
    const [canViewAll, setCanViewAll] = useState<boolean | null>(null)

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
                <div className="no-print flex justify-between items-start">
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900">Sales Forecast &amp; History</h1>
                        <p className="text-sm text-gray-500 mt-0.5">Performance breakdown by sales representative · ±2 months</p>
                    </div>
                    <div className="flex items-center gap-3">
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
                                        <label className="text-sm font-medium text-gray-600">Rep:</label>
                                        <select
                                            className="rounded-lg border border-gray-200 shadow-sm px-2 py-1.5 text-sm bg-white focus:ring-blue-500 focus:border-blue-500"
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
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            <Printer className="w-4 h-4" /> Print Report
                        </button>
                    </div>
                </div>

                {/* ── Print header ─────────────────────────────────── */}
                <div className="hidden print:block">
                    <DocumentHeader title="SALES FORECAST & HISTORY" subtitle="CRM Performance Report" />
                    <div style={{ fontSize: '8pt', color: '#6b7280', marginBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{scope === 'mine' ? 'Scope: My Projects' : `Scope: All Projects${repLabel !== 'All Representatives' ? ` · Rep: ${repLabel}` : ''}`} · Period: ±2 months from current</span>
                        <span>Printed {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    </div>
                </div>

                {/* ── Report ───────────────────────────────────────── */}
                {canViewAll !== null && (
                    <PerformanceTable
                        selectedRep={scope === 'mine' ? 'ALL' : selectedRep}
                        scope={scope}
                    />
                )}

                {/* ── Print footer ─────────────────────────────────── */}
                <div className="hidden print:block">
                    <DocumentFooter />
                </div>
            </div>
        </>
    )
}


function PerformanceTable({ selectedRep, scope }: { selectedRep: string; scope: string }) {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        setLoading(true)
        fetch(`/api/crm/reports/performance?salesRepId=${selectedRep}&scope=${scope}`)
            .then(res => res.json())
            .then(setData)
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [selectedRep, scope])

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

    return (
        <div className="space-y-5">

            {/* ── KPI cards (screen only) ───────────────────────── */}
            <div className="no-print grid grid-cols-3 gap-4">
                {[
                    { icon: DollarSign, label: 'Total Won', value: formatCurrency(grandWon), color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
                    { icon: Target, label: 'Pipeline (Expected)', value: formatCurrency(grandExpected), color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
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
                    <table className="rep-summary-table min-w-full" style={{ borderCollapse: 'collapse' }}>
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
                                        backgroundColor: '#f9fafb',
                                        whiteSpace: 'nowrap' as const,
                                    }}>
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {repTotals.map((rep: any, idx: number) => (
                                <tr key={rep.id} style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                                    <td style={{ padding: '8px 12px', fontSize: '13px', fontWeight: 600, color: '#111827', borderBottom: '1px solid #f3f4f6' }}>{rep.name}</td>
                                    <td style={{ padding: '8px 12px', fontSize: '13px', fontWeight: 600, color: '#16a34a', textAlign: 'right', borderBottom: '1px solid #f3f4f6', whiteSpace: 'nowrap' }}>
                                        {rep.totalWon > 0 ? formatCurrency(rep.totalWon) : <span style={{ color: '#d1d5db' }}>—</span>}
                                    </td>
                                    <td style={{ padding: '8px 12px', fontSize: '13px', color: '#2563eb', textAlign: 'right', borderBottom: '1px solid #f3f4f6', whiteSpace: 'nowrap' }}>
                                        {rep.totalExpected > 0 ? formatCurrency(rep.totalExpected) : <span style={{ color: '#d1d5db' }}>—</span>}
                                    </td>
                                    <td style={{ padding: '8px 12px', fontSize: '13px', fontWeight: 500, color: '#374151', textAlign: 'right', borderBottom: '1px solid #f3f4f6', whiteSpace: 'nowrap' }}>
                                        {formatCurrency(rep.totalWon + rep.totalExpected)}
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
                            <tr className="totals-row" style={{ borderTop: '2px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                                <td style={{ padding: '8px 12px', fontSize: '12px', fontWeight: 700, color: '#374151' }}>TOTAL</td>
                                <td style={{ padding: '8px 12px', fontSize: '13px', fontWeight: 700, color: '#16a34a', textAlign: 'right', whiteSpace: 'nowrap' }}>{formatCurrency(grandWon)}</td>
                                <td style={{ padding: '8px 12px', fontSize: '13px', fontWeight: 700, color: '#2563eb', textAlign: 'right', whiteSpace: 'nowrap' }}>{formatCurrency(grandExpected)}</td>
                                <td style={{ padding: '8px 12px', fontSize: '13px', fontWeight: 700, color: '#111827', textAlign: 'right', whiteSpace: 'nowrap' }}>{formatCurrency(grandWon + grandExpected)}</td>
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
                <div className="overflow-x-auto print:overflow-visible">
                    <table className="crm-report-table min-w-full" style={{ borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                {/* First col: Sales Rep */}
                                <th style={{
                                    padding: '8px 12px', textAlign: 'left', fontSize: '10px', fontWeight: 700,
                                    textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280',
                                    borderBottom: '2px solid #e5e7eb', backgroundColor: '#f9fafb',
                                    position: 'sticky', left: 0, zIndex: 1, minWidth: '130px', whiteSpace: 'nowrap',
                                }}>
                                    Sales Rep
                                </th>
                                {data.months.map((month: string) => (
                                    <th key={month} style={{
                                        padding: '8px 12px', textAlign: 'right', fontSize: '10px', fontWeight: 700,
                                        textTransform: 'uppercase', letterSpacing: '0.03em', color: '#6b7280',
                                        borderBottom: '2px solid #e5e7eb', backgroundColor: '#f9fafb',
                                        minWidth: '110px', whiteSpace: 'nowrap',
                                    }}>
                                        {month}
                                    </th>
                                ))}
                                {/* Total column */}
                                <th style={{
                                    padding: '8px 12px', textAlign: 'right', fontSize: '10px', fontWeight: 700,
                                    textTransform: 'uppercase', letterSpacing: '0.03em', color: '#374151',
                                    borderBottom: '2px solid #e5e7eb', backgroundColor: '#f0f4ff',
                                    minWidth: '110px', whiteSpace: 'nowrap', borderLeft: '2px solid #e5e7eb',
                                }}>
                                    Total
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* One row per rep */}
                            {repTotals.map((rep: any, idx: number) => (
                                <tr key={rep.id} style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                                    <td style={{
                                        padding: '8px 12px', fontSize: '12px', fontWeight: 600, color: '#111827',
                                        borderBottom: '1px solid #f3f4f6', borderRight: '1px solid #e5e7eb',
                                        position: 'sticky', left: 0, backgroundColor: idx % 2 === 0 ? '#fff' : '#fafafa',
                                        zIndex: 1, maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                    }} title={rep.name}>
                                        {rep.name}
                                    </td>
                                    {data.months.map((month: string) => {
                                        const cell = rep.data[month] || { won: 0, expected: 0 }
                                        return (
                                            <td key={month} style={{ padding: '7px 12px', textAlign: 'right', borderBottom: '1px solid #f3f4f6', borderRight: '1px solid #f9fafb', verticalAlign: 'top' }}>
                                                {cell.won > 0 && <div style={{ fontSize: '12px', fontWeight: 600, color: '#16a34a', lineHeight: 1.3 }}>{formatCurrency(cell.won)}</div>}
                                                {cell.expected > 0 && <div style={{ fontSize: '10px', color: '#2563eb', lineHeight: 1.3, marginTop: cell.won > 0 ? '2px' : 0 }}>{formatCurrency(cell.expected)}</div>}
                                                {!cell.won && !cell.expected && <span style={{ color: '#d1d5db', fontSize: '11px' }}>—</span>}
                                            </td>
                                        )
                                    })}
                                    {/* Row total */}
                                    <td style={{ padding: '7px 12px', textAlign: 'right', borderBottom: '1px solid #f3f4f6', borderLeft: '2px solid #e5e7eb', verticalAlign: 'top', backgroundColor: idx % 2 === 0 ? '#f8faff' : '#f5f7ff' }}>
                                        {rep.totalWon > 0 && <div style={{ fontSize: '12px', fontWeight: 700, color: '#16a34a', lineHeight: 1.3 }}>{formatCurrency(rep.totalWon)}</div>}
                                        {rep.totalExpected > 0 && <div style={{ fontSize: '10px', color: '#2563eb', lineHeight: 1.3, marginTop: rep.totalWon > 0 ? '2px' : 0 }}>{formatCurrency(rep.totalExpected)}</div>}
                                    </td>
                                </tr>
                            ))}
                            {/* Month totals row */}
                            <tr className="totals-row" style={{ borderTop: '2px solid #e5e7eb' }}>
                                <td style={{ padding: '8px 12px', fontSize: '11px', fontWeight: 700, color: '#374151', position: 'sticky', left: 0, backgroundColor: '#f9fafb', zIndex: 1, borderRight: '1px solid #e5e7eb' }}>
                                    TOTAL
                                </td>
                                {data.months.map((month: string) => (
                                    <td key={month} style={{ padding: '8px 12px', textAlign: 'right', backgroundColor: '#f9fafb', verticalAlign: 'top' }}>
                                        {monthTotals[month].won > 0 && <div style={{ fontSize: '12px', fontWeight: 700, color: '#16a34a', lineHeight: 1.3 }}>{formatCurrency(monthTotals[month].won)}</div>}
                                        {monthTotals[month].expected > 0 && <div style={{ fontSize: '10px', color: '#2563eb', fontWeight: 600, lineHeight: 1.3, marginTop: monthTotals[month].won > 0 ? '2px' : 0 }}>{formatCurrency(monthTotals[month].expected)}</div>}
                                        {!monthTotals[month].won && !monthTotals[month].expected && <span style={{ color: '#d1d5db', fontSize: '11px' }}>—</span>}
                                    </td>
                                ))}
                                <td style={{ padding: '8px 12px', textAlign: 'right', backgroundColor: '#eef2ff', borderLeft: '2px solid #e5e7eb', verticalAlign: 'top' }}>
                                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#16a34a' }}>{formatCurrency(grandWon)}</div>
                                    <div style={{ fontSize: '10px', color: '#2563eb', fontWeight: 600, marginTop: '2px' }}>{formatCurrency(grandExpected)}</div>
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
                <div className="hidden print:block" style={{ fontSize: '7pt', color: '#9ca3af', marginTop: '4px' }}>
                    Green = Won · Blue = Pipeline (open forecast)
                </div>
            </div>
        </div>
    )
}
