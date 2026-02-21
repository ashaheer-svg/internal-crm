'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
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
                    @page { size: A4 portrait; margin: 12mm 10mm; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; }
                    .no-print { display: none !important; }
                    nav, aside, header, .sidebar { display: none !important; }

                    /* Hide screen-only elements */
                    .screen-only { display: none !important; }

                    /* Show print-only elements */
                    .print-only { display: block !important; }

                    /* Rep summary table for print */
                    .rep-summary-table { width: 100%; border-collapse: collapse; }
                    .rep-summary-table th {
                        font-size: 7pt;
                        font-weight: 700;
                        text-transform: uppercase;
                        letter-spacing: 0.05em;
                        color: #374151;
                        padding: 5px 8px;
                        border-bottom: 2px solid #111827;
                        text-align: right;
                    }
                    .rep-summary-table th:first-child { text-align: left; }
                    .rep-summary-table td {
                        font-size: 8pt;
                        padding: 5px 8px;
                        border-bottom: 1px solid #d1d5db;
                        text-align: right;
                        vertical-align: middle;
                        height: 22px;
                        white-space: nowrap;
                    }
                    .rep-summary-table td:first-child { text-align: left; font-weight: 600; }
                    .rep-summary-table tr:nth-child(even) td { background-color: transparent; }
                    .rep-summary-table .totals-row td {
                        border-top: 2px solid #111827;
                        border-bottom: none;
                        font-weight: 700;
                    }

                    /* Month detail table */
                    .month-detail-table { width: 100%; border-collapse: collapse; margin-top: 0; }
                    .month-detail-table th {
                        font-size: 7pt;
                        font-weight: 700;
                        text-transform: uppercase;
                        letter-spacing: 0.05em;
                        color: #374151;
                        padding: 4px 8px;
                        border-bottom: 1px solid #374151;
                        text-align: right;
                    }
                    .month-detail-table th:first-child { text-align: left; }
                    .month-detail-table td {
                        font-size: 7.5pt;
                        padding: 4px 8px;
                        border-bottom: 1px solid #e5e7eb;
                        text-align: right;
                        vertical-align: middle;
                        height: 20px;
                        white-space: nowrap;
                    }
                    .month-detail-table td:first-child { text-align: left; }
                    .month-detail-table .totals-row td {
                        border-top: 1px solid #374151;
                        border-bottom: none;
                        font-weight: 700;
                        background: transparent;
                    }
                    thead { display: table-header-group; }
                    tr { break-inside: avoid; }
                }
                .print-only { display: none; }
            `}</style>

            <div className="p-6 max-w-7xl mx-auto space-y-5">

                {/* ── Screen page header ──────────────────────────── */}
                <div className="no-print flex justify-between items-start">
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900">Sales Forecast &amp; History</h1>
                        <p className="text-sm text-gray-500 mt-0.5">Performance breakdown by sales representative</p>
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
                <div className="print-only hidden print:block">
                    <DocumentHeader title="SALES FORECAST & HISTORY" subtitle="CRM Performance Report" />
                    <div style={{ fontSize: '8pt', color: '#6b7280', marginBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{scope === 'mine' ? 'Scope: My Projects' : `Scope: All Projects${repLabel !== 'All Representatives' ? ` · Rep: ${repLabel}` : ''}`}</span>
                        <span>Printed {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    </div>
                </div>

                {/* ── Report tables ─────────────────────────────────── */}
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

    // Pre-compute per-rep totals
    const repTotals = data.data.map((rep: any) => {
        let totalWon = 0, totalExpected = 0, bestMonth = '', bestWon = 0
        data.months.forEach((m: string) => {
            const cell = rep.data[m] || { won: 0, expected: 0 }
            totalWon += cell.won
            totalExpected += cell.expected
            if (cell.won > bestWon) { bestWon = cell.won; bestMonth = m }
        })
        const winRate = (totalWon + totalExpected) > 0
            ? Math.round((totalWon / (totalWon + totalExpected)) * 100)
            : 0
        return { ...rep, totalWon, totalExpected, winRate, bestMonth }
    })

    // Grand totals
    const grandWon = repTotals.reduce((s: number, r: any) => s + r.totalWon, 0)
    const grandExpected = repTotals.reduce((s: number, r: any) => s + r.totalExpected, 0)
    const grandWinRate = (grandWon + grandExpected) > 0
        ? Math.round((grandWon / (grandWon + grandExpected)) * 100) : 0

    // Month totals for crosstab
    const monthTotals: Record<string, { won: number; expected: number }> = {}
    data.months.forEach((m: string) => {
        let won = 0, expected = 0
        data.data.forEach((rep: any) => {
            const cell = rep.data[m] || { won: 0, expected: 0 }
            won += cell.won
            expected += cell.expected
        })
        monthTotals[m] = { won, expected }
    })

    // Chart data (months × totals)
    const chartData = data.months.map((month: string) => ({
        month,
        Won: monthTotals[month].won,
        Expected: monthTotals[month].expected,
    }))

    return (
        <div className="space-y-5">

            {/* ── KPI summary cards (screen only) ───────────────── */}
            <div className="no-print grid grid-cols-3 gap-4">
                {[
                    { icon: DollarSign, label: 'Total Won', value: formatCurrency(grandWon), color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
                    { icon: Target, label: 'Pipeline (Expected)', value: formatCurrency(grandExpected), color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
                    { icon: TrendingUp, label: 'Overall Win Rate', value: `${grandWinRate}%`, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
                ].map(card => (
                    <div key={card.label} className={`flex items-center gap-3 p-4 rounded-xl border ${card.border} ${card.bg}`}>
                        <div className={`p-2 rounded-lg bg-white shadow-sm`}>
                            <card.icon className={`w-4 h-4 ${card.color}`} />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">{card.label}</p>
                            <p className={`text-lg font-bold ${card.color}`}>{card.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Rep Summary Table (PRINT ONLY) ────────────────── */}
            {/* Portrait A4 friendly: one row per rep, totals columns */}
            <div className="print-only hidden">
                <p style={{ fontSize: '8pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#374151', marginBottom: '6px', borderBottom: '1px solid #e5e7eb', paddingBottom: '4px' }}>
                    Representative Summary
                </p>
                <table className="rep-summary-table">
                    <thead>
                        <tr>
                            <th style={{ textAlign: 'left' }}>Sales Representative</th>
                            <th>Total Won</th>
                            <th>Pipeline</th>
                            <th>Total Forecast</th>
                            <th>Win Rate</th>
                            <th>Best Month</th>
                        </tr>
                    </thead>
                    <tbody>
                        {repTotals.map((rep: any) => (
                            <tr key={rep.id}>
                                <td>{rep.name}</td>
                                <td>{rep.totalWon > 0 ? formatCurrency(rep.totalWon) : '—'}</td>
                                <td>{rep.totalExpected > 0 ? formatCurrency(rep.totalExpected) : '—'}</td>
                                <td>{formatCurrency(rep.totalWon + rep.totalExpected)}</td>
                                <td>{rep.winRate}%</td>
                                <td>{rep.bestMonth || '—'}</td>
                            </tr>
                        ))}
                        <tr className="totals-row">
                            <td>TOTAL</td>
                            <td>{formatCurrency(grandWon)}</td>
                            <td>{formatCurrency(grandExpected)}</td>
                            <td>{formatCurrency(grandWon + grandExpected)}</td>
                            <td>{grandWinRate}%</td>
                            <td></td>
                        </tr>
                    </tbody>
                </table>

                {/* Month breakdown per rep (print) */}
                {data.data.length > 0 && (
                    <>
                        <p style={{ fontSize: '8pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#374151', margin: '14px 0 6px', borderBottom: '1px solid #e5e7eb', paddingBottom: '4px' }}>
                            Monthly Detail — Won / Pipeline
                        </p>
                        <table className="month-detail-table">
                            <thead>
                                <tr>
                                    <th style={{ textAlign: 'left' }}>Month</th>
                                    {data.data.map((rep: any) => (
                                        <th key={rep.id}>{rep.name}</th>
                                    ))}
                                    <th>Total Won</th>
                                    <th>Total Pipeline</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.months.map((month: string, idx: number) => (
                                    <tr key={month} style={{ backgroundColor: idx % 2 === 1 ? '#fafafa' : 'transparent' }}>
                                        <td style={{ fontWeight: 600 }}>{month}</td>
                                        {data.data.map((rep: any) => {
                                            const cell = rep.data[month] || { won: 0, expected: 0 }
                                            if (!cell.won && !cell.expected) return <td key={rep.id} style={{ color: '#d1d5db' }}>—</td>
                                            return (
                                                <td key={rep.id}>
                                                    {cell.won > 0 && <div style={{ color: '#15803d' }}>{formatCurrency(cell.won)}</div>}
                                                    {cell.expected > 0 && <div style={{ color: '#1d4ed8', fontSize: '6.5pt' }}>{formatCurrency(cell.expected)}</div>}
                                                </td>
                                            )
                                        })}
                                        <td style={{ fontWeight: 600, color: '#15803d' }}>
                                            {monthTotals[month].won > 0 ? formatCurrency(monthTotals[month].won) : '—'}
                                        </td>
                                        <td style={{ color: '#1d4ed8' }}>
                                            {monthTotals[month].expected > 0 ? formatCurrency(monthTotals[month].expected) : '—'}
                                        </td>
                                    </tr>
                                ))}
                                <tr className="totals-row">
                                    <td>TOTAL</td>
                                    {repTotals.map((rep: any) => (
                                        <td key={rep.id} style={{ fontWeight: 700 }}>
                                            {rep.totalWon > 0 ? formatCurrency(rep.totalWon) : '—'}
                                        </td>
                                    ))}
                                    <td style={{ fontWeight: 700 }}>{formatCurrency(grandWon)}</td>
                                    <td style={{ fontWeight: 700 }}>{formatCurrency(grandExpected)}</td>
                                </tr>
                            </tbody>
                        </table>
                        <div style={{ fontSize: '7pt', color: '#9ca3af', marginTop: '6px' }}>
                            Top row in each cell = Won (closed) · Bottom row = Pipeline (open forecast)
                        </div>
                    </>
                )}
            </div>

            {/* ── SCREEN: rep summary table ─────────────────────── */}
            <div className="screen-only bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Representative Summary</h2>
                    <span className="text-xs text-gray-400">{data.data.length} rep{data.data.length !== 1 ? 's' : ''}</span>
                </div>
                <table className="min-w-full" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                        <tr className="border-b border-gray-100">
                            {['Sales Rep', 'Total Won', 'Pipeline', 'Total Forecast', 'Win Rate', 'Best Month'].map((h, i) => (
                                <th key={h} style={{
                                    padding: '8px 14px',
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    color: '#6b7280',
                                    textAlign: i === 0 ? 'left' : 'right',
                                    borderBottom: '1px solid #e5e7eb',
                                    backgroundColor: '#f9fafb',
                                }}>
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {repTotals.map((rep: any, idx: number) => (
                            <tr key={rep.id} style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                                <td style={{ padding: '9px 14px', fontSize: '13px', fontWeight: 600, color: '#111827', borderBottom: '1px solid #f3f4f6' }}>{rep.name}</td>
                                <td style={{ padding: '9px 14px', fontSize: '13px', fontWeight: 600, color: '#16a34a', textAlign: 'right', borderBottom: '1px solid #f3f4f6' }}>
                                    {rep.totalWon > 0 ? formatCurrency(rep.totalWon) : <span style={{ color: '#d1d5db' }}>—</span>}
                                </td>
                                <td style={{ padding: '9px 14px', fontSize: '13px', color: '#2563eb', textAlign: 'right', borderBottom: '1px solid #f3f4f6' }}>
                                    {rep.totalExpected > 0 ? formatCurrency(rep.totalExpected) : <span style={{ color: '#d1d5db' }}>—</span>}
                                </td>
                                <td style={{ padding: '9px 14px', fontSize: '13px', fontWeight: 500, color: '#374151', textAlign: 'right', borderBottom: '1px solid #f3f4f6' }}>
                                    {formatCurrency(rep.totalWon + rep.totalExpected)}
                                </td>
                                <td style={{ padding: '9px 14px', textAlign: 'right', borderBottom: '1px solid #f3f4f6' }}>
                                    <span style={{
                                        fontSize: '12px', fontWeight: 700,
                                        color: rep.winRate >= 50 ? '#16a34a' : rep.winRate >= 25 ? '#d97706' : '#dc2626',
                                    }}>{rep.winRate}%</span>
                                </td>
                                <td style={{ padding: '9px 14px', fontSize: '12px', color: '#6b7280', textAlign: 'right', borderBottom: '1px solid #f3f4f6' }}>
                                    {rep.bestMonth || <span style={{ color: '#d1d5db' }}>—</span>}
                                </td>
                            </tr>
                        ))}
                        {/* Grand total row */}
                        <tr style={{ borderTop: '2px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                            <td style={{ padding: '9px 14px', fontSize: '12px', fontWeight: 700, color: '#374151' }}>TOTAL</td>
                            <td style={{ padding: '9px 14px', fontSize: '13px', fontWeight: 700, color: '#16a34a', textAlign: 'right' }}>{formatCurrency(grandWon)}</td>
                            <td style={{ padding: '9px 14px', fontSize: '13px', fontWeight: 700, color: '#2563eb', textAlign: 'right' }}>{formatCurrency(grandExpected)}</td>
                            <td style={{ padding: '9px 14px', fontSize: '13px', fontWeight: 700, color: '#111827', textAlign: 'right' }}>{formatCurrency(grandWon + grandExpected)}</td>
                            <td style={{ padding: '9px 14px', fontSize: '13px', fontWeight: 700, color: '#7c3aed', textAlign: 'right' }}>{grandWinRate}%</td>
                            <td style={{ padding: '9px 14px' }}></td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* ── SCREEN: month-by-month crosstab ──────────────── */}
            <div className="screen-only bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Monthly Breakdown</h2>
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-green-500 inline-block" /> Won</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-blue-400 inline-block" /> Pipeline</span>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table style={{ borderCollapse: 'collapse', minWidth: '100%' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                                <th style={{ padding: '8px 14px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', textAlign: 'left', minWidth: '100px', position: 'sticky', left: 0, backgroundColor: '#f9fafb', zIndex: 1 }}>
                                    Month
                                </th>
                                {data.data.map((rep: any) => (
                                    <th key={rep.id} style={{ padding: '8px 14px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', textAlign: 'right', minWidth: '130px' }}>
                                        {rep.name}
                                    </th>
                                ))}
                                <th style={{ padding: '8px 14px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#374151', textAlign: 'right', minWidth: '130px', borderLeft: '2px solid #e5e7eb' }}>
                                    Month Total
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.months.map((month: string, idx: number) => (
                                <tr key={month} style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#fafafa', borderBottom: '1px solid #f3f4f6' }}>
                                    <td style={{ padding: '8px 14px', fontSize: '12px', fontWeight: 600, color: '#374151', position: 'sticky', left: 0, backgroundColor: idx % 2 === 0 ? '#fff' : '#fafafa', borderRight: '1px solid #e5e7eb', zIndex: 1 }}>
                                        {month}
                                    </td>
                                    {data.data.map((rep: any) => {
                                        const cell = rep.data[month] || { won: 0, expected: 0 }
                                        return (
                                            <td key={rep.id} style={{ padding: '8px 14px', textAlign: 'right', borderRight: '1px solid #f3f4f6', verticalAlign: 'top' }}>
                                                {cell.won > 0 && <div style={{ fontSize: '12px', fontWeight: 600, color: '#16a34a' }}>{formatCurrency(cell.won)}</div>}
                                                {cell.expected > 0 && <div style={{ fontSize: '10px', color: '#2563eb', marginTop: cell.won > 0 ? '1px' : 0 }}>{formatCurrency(cell.expected)}</div>}
                                                {!cell.won && !cell.expected && <span style={{ color: '#d1d5db', fontSize: '11px' }}>—</span>}
                                            </td>
                                        )
                                    })}
                                    <td style={{ padding: '8px 14px', textAlign: 'right', borderLeft: '2px solid #e5e7eb', verticalAlign: 'top' }}>
                                        {monthTotals[month].won > 0 && <div style={{ fontSize: '12px', fontWeight: 700, color: '#16a34a' }}>{formatCurrency(monthTotals[month].won)}</div>}
                                        {monthTotals[month].expected > 0 && <div style={{ fontSize: '10px', color: '#2563eb', marginTop: monthTotals[month].won > 0 ? '1px' : 0 }}>{formatCurrency(monthTotals[month].expected)}</div>}
                                        {!monthTotals[month].won && !monthTotals[month].expected && <span style={{ color: '#d1d5db', fontSize: '11px' }}>—</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── SCREEN: bar chart ─────────────────────────────── */}
            <div className="screen-only bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">Monthly Overview</h2>
                <div style={{ height: '260px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                            <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrency(v)} width={88} axisLine={false} tickLine={false} />
                            <Tooltip formatter={(value: any) => formatCurrency(value)} />
                            <Legend wrapperStyle={{ fontSize: 12 }} />
                            <Bar dataKey="Won" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={40} />
                            <Bar dataKey="Expected" fill="#60a5fa" radius={[3, 3, 0, 0]} maxBarSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    )
}
