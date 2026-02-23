'use client'

import { useState } from 'react'
import { X, Phone, Users, Mail, FileText, Clock, Search, Building2, Briefcase, DollarSign, ExternalLink, Filter } from 'lucide-react'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/format'

interface ActivityDetailModalProps {
    isOpen: boolean
    onClose: () => void
    userName: string
    date: string
    activities: {
        id: string
        type: string
        subject: string
        content: string | null
        createdAt: string
        projectName: string
        customerName: string
        projectValue: number
        projectStatus: string
    }[]
}

export default function ActivityDetailModal({ isOpen, onClose, userName, date, activities }: ActivityDetailModalProps) {
    const [search, setSearch] = useState('')
    const [activeTypes, setActiveTypes] = useState<string[]>(['CALL', 'MEETING'])

    if (!isOpen) return null

    const typeIcons: Record<string, any> = {
        CALL: Phone,
        MEETING: Users,
        EMAIL: Mail,
        NOTE: FileText
    }

    const typeColors: Record<string, string> = {
        CALL: 'bg-green-100 text-green-700 border-green-200',
        MEETING: 'bg-blue-100 text-blue-700 border-blue-200',
        EMAIL: 'bg-purple-100 text-purple-700 border-purple-200',
        NOTE: 'bg-orange-100 text-orange-700 border-orange-200'
    }

    const statusColors: Record<string, string> = {
        WON: 'bg-emerald-500 text-white',
        OPEN: 'bg-sky-500 text-white',
        LOST: 'bg-rose-500 text-white',
        ON_HOLD: 'bg-amber-500 text-white'
    }

    const toggleType = (type: string) => {
        setActiveTypes(prev =>
            prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
        )
    }

    const filteredActivities = activities.filter(a => {
        const matchesSearch =
            a.subject.toLowerCase().includes(search.toLowerCase()) ||
            a.projectName.toLowerCase().includes(search.toLowerCase()) ||
            a.customerName.toLowerCase().includes(search.toLowerCase()) ||
            (a.content || '').toLowerCase().includes(search.toLowerCase());

        const isOther = !['CALL', 'MEETING'].includes(a.type);
        const matchesType = activeTypes.includes(a.type) || (activeTypes.includes('OTHER') && isOther);

        return matchesSearch && matchesType;
    })

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-8 bg-slate-900/60 backdrop-blur-md">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300 max-h-[90vh]">
                {/* Header Section */}
                <div className="relative bg-gradient-to-r from-slate-900 to-slate-800 px-8 py-8 text-white">
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all outline-none"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sky-400 text-sm font-bold uppercase tracking-widest">
                                <Clock className="w-4 h-4" />
                                {(() => {
                                    try {
                                        return format(new Date(date), 'MMMM d, yyyy')
                                    } catch (e) {
                                        return date
                                    }
                                })()}
                            </div>
                            <h3 className="text-3xl font-black tracking-tight">{userName}</h3>
                            <p className="text-white/60 text-sm font-medium">Daily Activity Breakdown & Opportunity Analysis</p>
                        </div>

                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 flex items-center gap-5 border border-white/10">
                            <div className="text-center">
                                <p className="text-[10px] font-bold text-white/40 uppercase tracking-tighter">Total Events</p>
                                <p className="text-2xl font-black text-sky-400">{activities.length}</p>
                            </div>
                            <div className="w-px h-8 bg-white/10" />
                            <div className="text-center">
                                <p className="text-[10px] font-bold text-white/40 uppercase tracking-tighter">Opportunities</p>
                                <p className="text-2xl font-black text-emerald-400">
                                    {new Set(activities.map(a => a.projectName)).size}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Search & Filter Bar */}
                <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        <div className="relative flex-1 w-full group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-sky-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Filter by subject, company, or project name..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition-all shadow-sm shadow-slate-200/50"
                            />
                        </div>
                        <div className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-[11px] font-bold text-slate-500 shadow-sm">
                            <kbd className="bg-slate-100 px-1 rounded border border-slate-200">ESC</kbd> to Close
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 mr-2">
                            <Filter className="w-3 h-3" /> Quick Filter:
                        </div>
                        <button
                            onClick={() => toggleType('CALL')}
                            className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${activeTypes.includes('CALL') ? 'bg-green-500 text-white border-green-600 shadow-lg shadow-green-500/20' : 'bg-white text-slate-400 border-slate-200 hover:border-green-200'}`}
                        >
                            Calls
                        </button>
                        <button
                            onClick={() => toggleType('MEETING')}
                            className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${activeTypes.includes('MEETING') ? 'bg-blue-500 text-white border-blue-600 shadow-lg shadow-blue-500/20' : 'bg-white text-slate-400 border-slate-200 hover:border-blue-200'}`}
                        >
                            Visits
                        </button>
                        <button
                            onClick={() => toggleType('OTHER')}
                            className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${activeTypes.includes('OTHER') ? 'bg-slate-700 text-white border-slate-800 shadow-lg shadow-slate-700/20' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'}`}
                        >
                            Other
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto bg-slate-50/30 p-8 pt-6">
                    {filteredActivities.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center">
                                <Search className="w-10 h-10 text-slate-300" />
                            </div>
                            <div>
                                <h4 className="text-lg font-bold text-slate-900">No matching activities</h4>
                                <p className="text-slate-500 text-sm">Adjust your filters or search criteria to find what you're looking for.</p>
                            </div>
                            <button
                                onClick={() => { setSearch(''); setActiveTypes(['CALL', 'MEETING', 'OTHER']) }}
                                className="text-sm font-bold text-sky-600 hover:text-sky-700"
                            >
                                Reset All Filters
                            </button>
                        </div>
                    ) : (
                        <div className="grid gap-6">
                            {filteredActivities.map((activity) => {
                                const Icon = typeIcons[activity.type] || FileText
                                return (
                                    <div key={activity.id} className="group relative bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:border-sky-200 hover:-translate-y-0.5 transition-all duration-300">
                                        <div className="flex flex-col lg:flex-row gap-6">
                                            {/* Left Column: Icon & Type */}
                                            <div className="flex lg:flex-col items-center justify-between lg:justify-start gap-4 lg:w-32 lg:shrink-0 lg:border-r lg:border-slate-100 lg:pr-6">
                                                <div className={`p-4 rounded-2xl border ${typeColors[activity.type] || 'bg-slate-100 text-slate-600 border-slate-200'} shadow-sm shadow-current/5`}>
                                                    <Icon className="w-7 h-7" />
                                                </div>
                                                <div className="text-center space-y-1">
                                                    <span className={`block text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${typeColors[activity.type] || 'bg-slate-100 text-slate-600'}`}>
                                                        {activity.type}
                                                    </span>
                                                    <span className="block text-[11px] font-bold text-slate-400 tabular-nums">
                                                        {format(new Date(activity.createdAt), 'h:mm a')}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Middle Column: Details */}
                                            <div className="flex-1 space-y-4">
                                                <div className="space-y-1">
                                                    <h4 className="text-xl font-bold text-slate-900 group-hover:text-sky-600 transition-colors">
                                                        {activity.subject}
                                                    </h4>
                                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500 font-medium">
                                                        <div className="flex items-center gap-1.5">
                                                            <Building2 className="w-4 h-4 text-slate-400 mt-0.5" />
                                                            <span className="text-slate-900 font-bold">{activity.customerName}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            <Briefcase className="w-4 h-4 text-slate-400 mt-0.5" />
                                                            <span>{activity.projectName}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="text-sm text-slate-600 leading-relaxed bg-slate-50/50 p-4 rounded-2xl border border-slate-100 whitespace-pre-wrap italic">
                                                    {activity.content || 'Note: Discussion points were not recorded for this activity.'}
                                                </div>
                                            </div>

                                            {/* Right Column: Financials & Status */}
                                            <div className="lg:w-48 lg:shrink-0 flex flex-row lg:flex-col justify-between items-center lg:items-end gap-4 lg:pl-6 lg:border-l lg:border-slate-100 lg:bg-slate-50/20 lg:-mr-6 lg:-my-6 lg:rounded-r-3xl p-6 lg:p-6">
                                                <div className="text-right space-y-0.5">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Opportunity Value</p>
                                                    <p className="text-lg font-black text-emerald-600">
                                                        {formatCurrency(activity.projectValue)}
                                                    </p>
                                                </div>
                                                <div className="space-y-2 w-full lg:w-auto">
                                                    <div className={`text-[10px] font-black px-3 py-1.5 rounded-xl text-center uppercase tracking-widest ${statusColors[activity.projectStatus] || 'bg-slate-200 text-slate-600'}`}>
                                                        {activity.projectStatus}
                                                    </div>
                                                    <button className="hidden lg:flex items-center justify-center gap-1.5 w-full px-4 py-2 bg-white border border-slate-200 text-[11px] font-bold text-slate-700 rounded-xl hover:bg-slate-50 hover:text-sky-600 transition-all shadow-sm">
                                                        Project <ExternalLink className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Footer Section */}
                <div className="px-8 py-4 border-t border-slate-100 bg-white flex items-center justify-between">
                    <p className="text-slate-400 text-[11px] font-medium italic">
                        All financial values are displayed in original project currency.
                    </p>
                    <button
                        onClick={onClose}
                        className="px-8 py-3 bg-slate-900 text-white rounded-2xl text-sm font-bold hover:bg-slate-800 active:scale-95 transition-all shadow-lg shadow-slate-900/10"
                    >
                        Close Report
                    </button>
                </div>
            </div>
        </div>
    )
}
