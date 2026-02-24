'use client'

import React from 'react'
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'

interface InsightCardProps {
    title: string
    value: string | number
    subtitle?: string
    icon: LucideIcon
    trend?: {
        value: number
        label: string
        isPositive: boolean
    }
    variant?: 'blue' | 'green' | 'indigo' | 'slate'
}

export default function InsightCard({
    title,
    value,
    subtitle,
    icon: Icon,
    trend,
    variant = 'blue',
}: InsightCardProps) {
    const variantStyles = {
        blue: {
            bg: 'bg-blue-50/50',
            icon: 'text-blue-600',
            border: 'border-blue-100',
            accent: 'bg-blue-600',
        },
        green: {
            bg: 'bg-green-50/50',
            icon: 'text-green-600',
            border: 'border-green-100',
            accent: 'bg-green-600',
        },
        indigo: {
            bg: 'bg-indigo-50/50',
            icon: 'text-indigo-600',
            border: 'border-indigo-100',
            accent: 'bg-indigo-600',
        },
        slate: {
            bg: 'bg-slate-50/50',
            icon: 'text-slate-600',
            border: 'border-slate-100',
            accent: 'bg-slate-600',
        },
    }

    const style = variantStyles[variant]

    return (
        <div className={`relative p-5 rounded-2xl border ${style.border} ${style.bg} transition-all hover:shadow-lg hover:shadow-slate-200/50 group overflow-hidden`}>
            {/* Visual Accent */}
            <div className={`absolute top-0 left-0 w-1 h-full ${style.accent} opacity-20`} />

            <div className="flex justify-between items-start">
                <div className="space-y-1">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{title}</p>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">{value}</h3>
                    {subtitle && <p className="text-[10px] text-slate-500 font-medium">{subtitle}</p>}
                </div>

                <div className={`p-2.5 rounded-xl bg-white shadow-sm border ${style.border} group-hover:scale-110 transition-transform`}>
                    <Icon className={`w-5 h-5 ${style.icon}`} />
                </div>
            </div>

            {trend && (
                <div className="mt-4 flex items-center gap-2">
                    <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${trend.isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {trend.isPositive ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                        {trend.value}%
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">vs {trend.label}</span>
                </div>
            )}
        </div>
    )
}
