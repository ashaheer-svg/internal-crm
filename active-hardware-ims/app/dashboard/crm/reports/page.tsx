'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { formatCurrency } from '@/lib/format'
import { User, Users } from 'lucide-react'

export default function CRMReportsPage() {
    const searchParams = useSearchParams()
    const scopeFromUrl = (searchParams.get('scope') as 'all' | 'mine') || 'all'

    const [salesReps, setSalesReps] = useState<any[]>([])
    const [selectedRep, setSelectedRep] = useState('ALL')
    const [scope, setScope] = useState<'all' | 'mine'>(scopeFromUrl)
    const [canViewAll, setCanViewAll] = useState<boolean | null>(null) // null = loading

    useEffect(() => {
        // Determine canViewAll by fetching a scoped project count
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

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-xl font-semibold text-gray-900">Sales Forecast &amp; History</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Performance breakdown by sales representative</p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Scope selector — shown only to users with view_all */}
                    {canViewAll && (
                        <>
                            <div className="flex bg-gray-100 rounded-lg p-0.5 border border-gray-200">
                                <button
                                    onClick={() => { setScope('all'); setSelectedRep('ALL') }}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${scope === 'all' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    <Users className="w-3.5 h-3.5" />
                                    All
                                </button>
                                <button
                                    onClick={() => { setScope('mine'); setSelectedRep('ALL') }}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${scope === 'mine' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    <User className="w-3.5 h-3.5" />
                                    Mine
                                </button>
                            </div>

                            {/* Rep filter — only in all-scope */}
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
                </div>
            </div>

            {canViewAll !== null && (
                <PerformanceTable selectedRep={scope === 'mine' ? 'ALL' : selectedRep} scope={scope} />
            )}
        </div>
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

    // Prepare chart data (Total Won / Total Expected per Month)
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

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">Performance Breakdown</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10 w-32">
                                    Sales Rep
                                </th>
                                {data.months.map((month: string) => (
                                    <th key={month} className="px-2 py-2 text-right text-[10px] font-medium text-gray-500 uppercase tracking-wider min-w-[80px]">
                                        {month}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {data.data.map((rep: any) => (
                                <tr key={rep.id}>
                                    <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-gray-900 sticky left-0 bg-white z-10 border-r w-32 truncate" title={rep.name}>
                                        {rep.name}
                                    </td>
                                    {data.months.map((month: string) => {
                                        const cell = rep.data[month] || { won: 0, expected: 0 }
                                        const hasWon = cell.won > 0
                                        const hasExp = cell.expected > 0
                                        return (
                                            <td key={month} className="px-2 py-2 whitespace-nowrap text-xs text-right border-r last:border-r-0">
                                                {hasWon && <div className="text-green-600 font-medium">{formatCurrency(cell.won)}</div>}
                                                {hasExp && <div className="text-blue-600 font-medium">{formatCurrency(cell.expected)}</div>}
                                                {!hasWon && !hasExp && <span className="text-gray-300">-</span>}
                                            </td>
                                        )
                                    })}
                                </tr>
                            ))}
                            {data.data.length === 0 && (
                                <tr>
                                    <td colSpan={data.months.length + 1} className="px-6 py-6 text-center text-xs text-gray-400">
                                        No data available for this period
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Performance Chart */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide mb-4">Total Performance Overview</h2>
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
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
