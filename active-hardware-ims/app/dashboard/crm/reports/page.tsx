'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { formatCurrency } from '@/lib/format'
import { User, Users, Printer } from 'lucide-react'
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
            .then(d => {
                if (typeof d.canViewAll === 'boolean') setCanViewAll(d.canViewAll)
                else setCanViewAll(false)
            })
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
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .no-print  { display: none !important; }
                    nav, aside, header, .sidebar { display: none !important; }

                    /* Recharts SVG must have explicit dimensions in print */
                    .recharts-wrapper,
                    .recharts-wrapper svg { width: 100% !important; height: 260px !important; }

                    /* Compact table */
                    .crm-report-table th,
                    .crm-report-table td { font-size: 7.5pt !important; padding: 3px 6px !important; }

                    /* Zebra stripes */
                    .crm-report-table tbody tr:nth-child(even) { background-color: #f8fafc !important; }

                    /* Row break */
                    .crm-report-table tr { break-inside: avoid; }
                    thead { display: table-header-group; }

                    /* Keep chart and table on same page if they fit, else break before chart */
                    .print-chart-section { break-before: auto; }
                }
            `}</style>

            <div className="p-8 max-w-7xl mx-auto space-y-6">

                {/* ── Screen header ───────────────────────────────── */}
                <div className="no-print flex justify-between items-center">
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900">Sales Forecast &amp; History</h1>
                        <p className="text-sm text-gray-500 mt-0.5">Performance breakdown by sales representative</p>
                    </div>

                    <div className="flex items-center gap-3">
                        {canViewAll && (
                            <>
                                <div className="flex bg-gray-100 rounded-lg p-0.5 border border-gray-200">
                                    <button
                                        onClick={() => { setScope('all'); setSelectedRep('ALL') }}
                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${scope === 'all' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        <Users className="w-3.5 h-3.5" /> All
                                    </button>
                                    <button
                                        onClick={() => { setScope('mine'); setSelectedRep('ALL') }}
                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${scope === 'mine' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
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

                        {/* Print button */}
                        <button
                            onClick={() => window.print()}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            <Printer className="w-4 h-4" />
                            Print Report
                        </button>
                    </div>
                </div>

                {/* ── Print header (hidden on screen) ─────────────── */}
                <div className="hidden print:block">
                    <DocumentHeader title="SALES FORECAST & HISTORY" subtitle="CRM Performance Report" />
                    <div style={{ fontSize: '8pt', color: '#6b7280', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                        <span>
                            {scope === 'mine' ? 'Scope: My Projects' : `Scope: All Projects${repLabel !== 'All Representatives' ? ` · Rep: ${repLabel}` : ''}`}
                        </span>
                        <span>Printed {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    </div>
                </div>

                {/* ── Report content ───────────────────────────────── */}
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

    if (loading) return <div className="text-center py-8 text-gray-400">Loading report...</div>
    if (!data) return null

    const chartData = data.months.map((month: string) => {
        let totalWon = 0
        let totalExpected = 0
        data.data.forEach((rep: any) => {
            const cell = rep.data[month] || { won: 0, expected: 0 }
            totalWon += cell.won
            totalExpected += cell.expected
        })
        return { month, totalWon, totalExpected }
    })

    // Totals row
    const totals: Record<string, { won: number; expected: number }> = {}
    data.months.forEach((m: string) => { totals[m] = { won: 0, expected: 0 } })
    data.data.forEach((rep: any) => {
        data.months.forEach((m: string) => {
            const cell = rep.data[m] || { won: 0, expected: 0 }
            totals[m].won += cell.won
            totals[m].expected += cell.expected
        })
    })

    return (
        <div className="space-y-6">
            {/* ── Performance Table ─────────────────────────────── */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden print:shadow-none print:border-gray-300">
                <div className="px-6 py-4 border-b border-gray-200 print:py-2 print:px-0 print:border-gray-300">
                    <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
                        Performance Breakdown
                    </h2>
                    <p className="text-[10px] text-gray-400 mt-0.5 no-print">
                        Green = Won · Blue = Expected/Forecast
                    </p>
                </div>
                <div className="overflow-x-auto print:overflow-visible">
                    <table className="crm-report-table min-w-full divide-y divide-gray-200" style={{ borderCollapse: 'collapse' }}>
                        <thead style={{ backgroundColor: '#2563eb' }}>
                            <tr>
                                <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '10px', fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em', position: 'sticky', left: 0, backgroundColor: '#2563eb', minWidth: '130px' }}>
                                    Sales Rep
                                </th>
                                {data.months.map((month: string) => (
                                    <th key={month} style={{ padding: '8px 8px', textAlign: 'right', fontSize: '10px', fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.03em', minWidth: '80px', whiteSpace: 'nowrap' }}>
                                        {month}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {data.data.map((rep: any, idx: number) => (
                                <tr key={rep.id} style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#f8fafc' }}>
                                    <td style={{ padding: '6px 12px', fontSize: '12px', fontWeight: 600, color: '#111827', position: 'sticky', left: 0, backgroundColor: idx % 2 === 0 ? '#fff' : '#f8fafc', borderRight: '1px solid #e5e7eb', maxWidth: '130px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={rep.name}>
                                        {rep.name}
                                    </td>
                                    {data.months.map((month: string) => {
                                        const cell = rep.data[month] || { won: 0, expected: 0 }
                                        return (
                                            <td key={month} style={{ padding: '6px 8px', textAlign: 'right', fontSize: '11px', borderRight: '1px solid #f3f4f6', borderBottom: '1px solid #f3f4f6' }}>
                                                {cell.won > 0 && <div style={{ color: '#16a34a', fontWeight: 600 }}>{formatCurrency(cell.won)}</div>}
                                                {cell.expected > 0 && <div style={{ color: '#2563eb', fontWeight: 500, fontSize: '10px' }}>{formatCurrency(cell.expected)}</div>}
                                                {!cell.won && !cell.expected && <span style={{ color: '#d1d5db', fontSize: '11px' }}>—</span>}
                                            </td>
                                        )
                                    })}
                                </tr>
                            ))}
                            {/* Totals row */}
                            {data.data.length > 1 && (
                                <tr style={{ backgroundColor: '#1e3a8a', borderTop: '2px solid #1d4ed8' }}>
                                    <td style={{ padding: '7px 12px', fontSize: '11px', fontWeight: 700, color: '#fff', position: 'sticky', left: 0, backgroundColor: '#1e3a8a', borderRight: '1px solid #1d4ed8' }}>
                                        TOTAL
                                    </td>
                                    {data.months.map((month: string) => (
                                        <td key={month} style={{ padding: '7px 8px', textAlign: 'right', fontSize: '11px', borderRight: '1px solid #1d4ed8' }}>
                                            {totals[month].won > 0 && <div style={{ color: '#86efac', fontWeight: 700 }}>{formatCurrency(totals[month].won)}</div>}
                                            {totals[month].expected > 0 && <div style={{ color: '#93c5fd', fontWeight: 500, fontSize: '10px' }}>{formatCurrency(totals[month].expected)}</div>}
                                            {!totals[month].won && !totals[month].expected && <span style={{ color: '#4b5563' }}>—</span>}
                                        </td>
                                    ))}
                                </tr>
                            )}
                            {data.data.length === 0 && (
                                <tr>
                                    <td colSpan={data.months.length + 1} style={{ padding: '32px', textAlign: 'center', fontSize: '12px', color: '#9ca3af' }}>
                                        No data available for this period
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Legend — screen only */}
                <div className="no-print px-6 py-2 border-t border-gray-100 bg-gray-50 flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-green-600 inline-block" /> Won (closed &amp; won)</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-600 inline-block" /> Expected (open pipeline)</span>
                </div>

                {/* Legend for print */}
                <div className="hidden print:flex items-center gap-6 px-0 py-2 border-t border-gray-200 text-[7.5pt] text-gray-500">
                    <span>■ Green = Won (closed &amp; won)</span>
                    <span>■ Blue = Expected (open pipeline)</span>
                </div>
            </div>

            {/* ── Bar Chart ─────────────────────────────────────── */}
            <div className="print-chart-section bg-white p-6 rounded-lg shadow-sm border border-gray-200 print:shadow-none print:border-gray-300 print:p-0 print:pt-4">
                <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide mb-4">Total Performance Overview</h2>
                <div style={{ height: '280px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrency(v)} width={80} />
                            <Tooltip formatter={(value: any) => formatCurrency(value)} />
                            <Legend wrapperStyle={{ fontSize: 12 }} />
                            <Bar dataKey="totalWon" name="Total Won" fill="#10b981" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="totalExpected" name="Total Expected" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    )
}
