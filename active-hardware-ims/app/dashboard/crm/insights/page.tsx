'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
    BarChart3,
    ArrowLeft,
    TrendingUp,
    Users,
    Target,
    DollarSign,
    Calendar,
    ChevronRight,
    Search,
    Filter,
    ArrowUpDown,
    Check
} from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts'
import InsightCard from '@/components/crm/InsightCard'
import { formatCurrency } from '@/lib/format'

export default function CRMInsightsPage() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [showScopeDropdown, setShowScopeDropdown] = useState(false)
    const [selectedRepId, setSelectedRepId] = useState<string | null>(null)
    const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
    const searchParams = useSearchParams()
    const scope = searchParams.get('scope') || 'all'
    const router = useRouter()

    useEffect(() => {
        fetchData()
    }, [scope])

    async function fetchData() {
        setLoading(true)
        try {
            // Reusing the existing comprehensive API but parsing it for insights
            const res = await fetch(`/api/crm/reports/performance?scope=${scope}&range=history`)
            const json = await res.json()
            setData(json)
        } catch (error) {
            console.error('Failed to fetch insights:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-slate-50/50">
                <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
                <p className="mt-4 text-sm font-bold text-slate-400 uppercase tracking-widest">Generating Insights...</p>
            </div>
        )
    }

    if (!data) return null

    // Process data for charts and cards
    const months = data.months || []
    const chartData = months.map((m: string) => {
        let won = 0, expected = 0
        const items = data.data || []
        items.forEach((rep: any) => {
            const cell = rep.data && rep.data[m]
            won += cell?.won || 0
            expected += cell?.expected || 0
        })
        return { name: m, Won: won, Pipeline: expected }
    })

    const totalWon = chartData.reduce((acc: number, curr: any) => acc + (curr.Won || 0), 0)
    const totalPipeline = chartData.reduce((acc: number, curr: any) => acc + (curr.Pipeline || 0), 0)
    const winRate = (totalWon + totalPipeline) > 0 ? Math.round((totalWon / (totalWon + totalPipeline)) * 100) : 0

    // Dynamic Trend Calculation
    const currentMonthLabel = format(new Date(), 'MMM yy')
    const currentMonthData = chartData.find((c: any) => c.name === currentMonthLabel)
    const avgMonthlyWon = totalWon / (chartData.length || 1)
    const wonTrendValue = avgMonthlyWon > 0 ? Math.round(((currentMonthData?.Won || 0) - avgMonthlyWon) / avgMonthlyWon * 100) : 0

    const avgMonthlyPipeline = totalPipeline / (chartData.length || 1)
    const pipelineTrendValue = avgMonthlyPipeline > 0 ? Math.round(((currentMonthData?.Pipeline || 0) - avgMonthlyPipeline) / avgMonthlyPipeline * 100) : 0

    // Derived Metric: Average Deal Value (Mocked for UI from totals)
    const avgDealValue = totalWon / ((data.data || []).length || 1)

    // Detailed Selection Logic
    const filteredProjects: any[] = []
    data.data.forEach((rep: any) => {
        if (selectedRepId && rep.id !== selectedRepId) return
        data.months.forEach((m: string) => {
            if (selectedMonth && m !== selectedMonth) return
            const cell = rep.data && rep.data[m]
            if (cell && cell.projects) {
                cell.projects.forEach((proj: any) => {
                    filteredProjects.push({
                        ...proj,
                        repName: rep.name,
                        monthLabel: m
                    })
                })
            }
        })
    })

    // Sort by value descending
    filteredProjects.sort((a, b) => (b.value || 0) - (a.value || 0))

    return (
        <div className="min-h-screen bg-[#f8fafc] pb-12">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-4 flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => router.back()}
                        className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-900 border border-transparent hover:border-slate-200"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-tighter">BETA</span>
                            <h1 className="text-xl font-black text-slate-900 tracking-tight">CRM Insights Dashboard</h1>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium">Modular performance intelligence for {scope === 'all' ? 'Entire Organization' : 'Your Portfolio'}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Link
                        href={`/dashboard/crm/reports?scope=${scope}`}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all hover:border-slate-300"
                    >
                        <Search className="w-4 h-4" />
                        Comprehensive Report
                    </Link>
                    <div className="h-8 w-px bg-slate-200" />
                    <div className="relative">
                        <button
                            onClick={() => setShowScopeDropdown(!showScopeDropdown)}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                        >
                            <Filter className="w-4 h-4" />
                            {scope === 'all' ? 'Organization' : 'My Portfolio'}
                        </button>

                        {showScopeDropdown && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 p-2 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                <button
                                    onClick={() => {
                                        router.push(`/dashboard/crm/insights?scope=all`)
                                        setShowScopeDropdown(false)
                                    }}
                                    className={`w-full flex items-center justify-between p-3 rounded-xl text-left text-xs font-bold transition-colors ${scope === 'all' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                                >
                                    <span>Entire Organization</span>
                                    {scope === 'all' && <Check className="w-3.5 h-3.5" />}
                                </button>
                                <button
                                    onClick={() => {
                                        router.push(`/dashboard/crm/insights?scope=mine`)
                                        setShowScopeDropdown(false)
                                    }}
                                    className={`w-full flex items-center justify-between p-3 rounded-xl text-left text-xs font-bold transition-colors ${scope === 'mine' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                                >
                                    <span>My Portfolio</span>
                                    {scope === 'mine' && <Check className="w-3.5 h-3.5" />}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <main className="px-8 mt-8 space-y-8 max-w-7xl mx-auto">
                {/* 0. Filter Status (only visible when filtering) */}
                {(selectedRepId || selectedMonth) && (
                    <div className="flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Filters:</span>
                        {selectedRepId && (
                            <button
                                onClick={() => setSelectedRepId(null)}
                                className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-100 hover:bg-blue-100 transition-colors"
                            >
                                Representative: {data.data.find((r: any) => r.id === selectedRepId)?.name}
                                <span className="opacity-50">×</span>
                            </button>
                        )}
                        {selectedMonth && (
                            <button
                                onClick={() => setSelectedMonth(null)}
                                className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-100 hover:bg-emerald-100 transition-colors"
                            >
                                Month: {selectedMonth}
                                <span className="opacity-50">×</span>
                            </button>
                        )}
                        <button
                            onClick={() => { setSelectedRepId(null); setSelectedMonth(null) }}
                            className="text-[10px] font-black text-slate-400 hover:text-slate-600 underline underline-offset-4 decoration-slate-200"
                        >
                            CLEAR ALL
                        </button>
                    </div>
                )}
                {/* 1. Pulse Section (KPIs) */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Pipeline Pulse</h2>
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full uppercase">Real-time stats</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <InsightCard
                            title="Total Sales (WON)"
                            value={formatCurrency(totalWon)}
                            subtitle="Last 12 Months"
                            icon={DollarSign}
                            variant="green"
                            trend={{ value: Math.abs(wonTrendValue), label: 'Monthly Avg', isPositive: wonTrendValue >= 0 }}
                        />
                        <InsightCard
                            title="Active Pipeline"
                            value={formatCurrency(totalPipeline)}
                            subtitle="Open Opportunities"
                            icon={Target}
                            variant="indigo"
                            trend={{ value: Math.abs(pipelineTrendValue), label: 'Monthly Avg', isPositive: pipelineTrendValue >= 0 }}
                        />
                        <InsightCard
                            title="Winning Momentum"
                            value={`${winRate}%`}
                            subtitle="Conversion Efficiency"
                            icon={TrendingUp}
                            variant="blue"
                        />
                        <InsightCard
                            title="Team Capacity"
                            value={(data.data || []).length}
                            subtitle="Active Agents"
                            icon={Users}
                            variant="slate"
                        />
                    </div>
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* 2. Revenue Trend Section */}
                    <section className="lg:col-span-2 space-y-4">
                        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm shadow-slate-100 flex flex-col h-[400px]">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h2 className="text-sm font-black text-slate-900">Revenue Performance Map</h2>
                                    <p className="text-[11px] text-slate-500 font-medium">Comparison of Secured vs Forecasted Revenue</p>
                                </div>
                                <div className="flex gap-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                        <span className="text-[10px] font-bold text-slate-600 uppercase">Won</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                                        <span className="text-[10px] font-bold text-slate-600 uppercase">Pipeline</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 w-full -ml-8">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <linearGradient id="colorWon" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorPipe" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <XAxis
                                            dataKey="name"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                                        />
                                        <YAxis hide />
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <RechartsTooltip
                                            contentStyle={{
                                                borderRadius: '16px',
                                                border: 'none',
                                                boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                                                fontSize: '11px',
                                                fontWeight: 800
                                            }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="Won"
                                            stroke="#10b981"
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#colorWon)"
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="Pipeline"
                                            stroke="#6366f1"
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#colorPipe)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </section>

                    {/* 3. Team Leaderboard */}
                    <section className="space-y-4">
                        <div className="bg-white overflow-hidden rounded-3xl border border-slate-200 shadow-sm shadow-slate-100 flex flex-col h-[400px]">
                            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                                <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">Top Performers</h2>
                                <Link href={`/dashboard/crm/reports?scope=${scope}`} className="text-[10px] font-black text-blue-600 hover:text-blue-700">VIEW ALL</Link>
                            </div>

                            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                {(data.data || [])
                                    .map((rep: any) => {
                                        let total = 0
                                        months.forEach((m: string) => total += (rep.data && rep.data[m])?.won || 0)
                                        return { ...rep, total }
                                    })
                                    .sort((a: any, b: any) => b.total - a.total)
                                    .map((rep: any, idx: number) => {
                                        const isSelected = selectedRepId === rep.id
                                        return (
                                            <button
                                                key={rep.id}
                                                onClick={() => setSelectedRepId(isSelected ? null : rep.id)}
                                                className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all group ${isSelected ? 'bg-blue-600 text-white shadow-lg shadow-blue-100 ring-2 ring-blue-100' : 'hover:bg-slate-50'}`}
                                            >
                                                <div className="flex items-center gap-4 text-left">
                                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black transition-colors ${isSelected ? 'bg-white text-blue-600' : 'bg-slate-900 text-white'}`}>
                                                        #{idx + 1}
                                                    </div>
                                                    <div>
                                                        <p className={`text-xs font-black transition-colors ${isSelected ? 'text-white' : 'text-slate-900'}`}>{rep.name}</p>
                                                        <p className={`text-[10px] uppercase tracking-widest font-bold transition-colors ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>Agent Profile</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className={`text-[11px] font-black transition-colors ${isSelected ? 'text-white' : 'text-emerald-600'}`}>{formatCurrency(rep.total)}</p>
                                                    <span className={`text-[9px] font-medium transition-colors ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>Secured</span>
                                                </div>
                                            </button>
                                        )
                                    })}
                            </div>
                        </div>
                    </section>
                </div>

                {/* 4. Monthly Calendar Strip */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Monthly Footprint</h2>
                        <div className="flex bg-white rounded-lg p-0.5 border border-slate-200">
                            <button className="px-3 py-1 bg-slate-100 rounded-md text-[10px] font-black text-slate-900">WON</button>
                            <button className="px-3 py-1 text-[10px] font-black text-slate-400">PIPELINE</button>
                        </div>
                    </div>
                    <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                        {months.map((m: string) => {
                            let total = 0
                            const items = data.data || []
                            items.forEach((rep: any) => total += (rep.data && rep.data[m])?.won || 0)
                            const isCurrent = typeof m === 'string' && m.includes(format(new Date(), 'MMM yy'))
                            const maxWon = Math.max(...chartData.map((c: any) => c.Won), 1)
                            const weight = Math.round((total / maxWon) * 100)
                            const isSelected = selectedMonth === m

                            return (
                                <button
                                    key={m}
                                    onClick={() => setSelectedMonth(isSelected ? null : m)}
                                    className={`flex-shrink-0 w-36 p-4 rounded-2xl border transition-all hover:-translate-y-1 text-left ${isSelected ? 'bg-emerald-600 border-emerald-500 shadow-lg shadow-emerald-200 ring-4 ring-emerald-50' : (isCurrent ? 'bg-blue-600 border-blue-500 shadow-lg shadow-blue-200' : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm shadow-slate-100')}`}
                                >
                                    <p className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? 'text-emerald-100' : (isCurrent ? 'text-blue-100' : 'text-slate-400')}`}>{m}</p>
                                    <p className={`mt-2 text-sm font-black ${isSelected ? 'text-white' : (isCurrent ? 'text-white' : 'text-slate-900')}`}>{formatCurrency(total)}</p>
                                    <div className="mt-3 flex items-center justify-between">
                                        <div className={`w-full h-1 rounded-full ${isSelected ? 'bg-emerald-400' : (isCurrent ? 'bg-blue-400' : 'bg-slate-100')}`}>
                                            <div className={`h-full rounded-full ${isSelected ? 'bg-white' : (isCurrent ? 'bg-white' : 'bg-emerald-500')}`} style={{ width: `${weight}%` }} />
                                        </div>
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                </section>

                {/* 5. Detailed Selection Audit */}
                {(selectedRepId || selectedMonth) && (
                    <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="flex items-center justify-between mb-4 px-1">
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-6 bg-slate-900 rounded-full" />
                                <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">Selection Intelligence Audit</h2>
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{filteredProjects.length} Deals Identified</span>
                        </div>

                        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-2xl shadow-slate-200/50 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-100 bg-slate-50/50">
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Project Details</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Representative</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Month</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                                            <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Value (Secured)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {filteredProjects.length > 0 ? (
                                            filteredProjects.map((proj: any) => (
                                                <tr key={proj.id} className="group hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-6 py-5">
                                                        <div className="flex flex-col">
                                                            <div className="flex items-center gap-2 mb-0.5">
                                                                <span className="text-[10px] font-black text-slate-400 p-0.5 bg-slate-100 rounded leading-none">{proj.projectCode || 'PROJ'}</span>
                                                                <Link href={`/dashboard/crm/projects/${proj.id}`} className="text-xs font-black text-slate-900 hover:text-blue-600 transition-colors">{proj.title}</Link>
                                                            </div>
                                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                                                                {proj.quoteNumber ? `Quote: ${proj.quoteNumber}` : 'Direct Entry'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 text-center">
                                                        <span className="text-[11px] font-bold text-slate-600">{proj.repName}</span>
                                                    </td>
                                                    <td className="px-6 py-5 text-center">
                                                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-tighter">{proj.monthLabel}</span>
                                                    </td>
                                                    <td className="px-6 py-5 text-center">
                                                        <span className={`inline-flex px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest ${proj.status === 'WON' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                            {proj.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-5 text-right font-black text-xs text-slate-900">
                                                        {formatCurrency(proj.value)}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-12 text-center">
                                                    <p className="text-sm font-bold text-slate-300 uppercase tracking-widest">No matching deals found for this selection</p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                    {filteredProjects.length > 0 && (
                                        <tfoot className="border-t border-slate-100 bg-slate-50/30">
                                            <tr>
                                                <td colSpan={4} className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Selection Value</td>
                                                <td className="px-6 py-4 text-right text-sm font-black text-blue-600">
                                                    {formatCurrency(filteredProjects.reduce((sum, p) => sum + (p.value || 0), 0))}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>
                        </div>
                    </section>
                )}
            </main>
        </div>
    )
}
