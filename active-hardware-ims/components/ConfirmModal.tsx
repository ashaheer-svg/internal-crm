'use client'

import { useEffect } from 'react'
import { AlertTriangle, Trash2, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ConfirmVariant = 'danger' | 'warning' | 'info'

interface ConfirmModalProps {
    open: boolean
    title: string
    message: string
    confirmLabel?: string
    cancelLabel?: string
    variant?: ConfirmVariant
    loading?: boolean
    onConfirm: () => void
    onCancel: () => void
}

const VARIANT_CONFIG: Record<ConfirmVariant, {
    iconBg: string
    iconBorder: string
    iconColor: string
    icon: React.ElementType
    confirmBg: string
    confirmShadow: string
}> = {
    danger: {
        iconBg: 'bg-red-50',
        iconBorder: 'border-red-100',
        iconColor: 'text-red-500',
        icon: Trash2,
        confirmBg: 'bg-red-600 hover:bg-red-700',
        confirmShadow: 'shadow-red-100',
    },
    warning: {
        iconBg: 'bg-amber-50',
        iconBorder: 'border-amber-100',
        iconColor: 'text-amber-500',
        icon: AlertTriangle,
        confirmBg: 'bg-amber-500 hover:bg-amber-600',
        confirmShadow: 'shadow-amber-100',
    },
    info: {
        iconBg: 'bg-blue-50',
        iconBorder: 'border-blue-100',
        iconColor: 'text-blue-500',
        icon: AlertTriangle,
        confirmBg: 'bg-blue-600 hover:bg-blue-700',
        confirmShadow: 'shadow-blue-100',
    },
}

export default function ConfirmModal({
    open,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'danger',
    loading = false,
    onConfirm,
    onCancel,
}: ConfirmModalProps) {
    const cfg = VARIANT_CONFIG[variant]
    const Icon = cfg.icon

    // Close on Escape key
    useEffect(() => {
        if (!open) return
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
        document.addEventListener('keydown', handler)
        return () => document.removeEventListener('keydown', handler)
    }, [open, onCancel])

    if (!open) return null

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
        >
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 w-full max-w-sm mx-4 animate-in slide-in-from-bottom-4 duration-200">
                <div className="flex items-start gap-4 mb-4">
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border', cfg.iconBg, cfg.iconBorder)}>
                        <Icon className={cn('w-5 h-5', cfg.iconColor)} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-black text-gray-900 leading-tight">{title}</h3>
                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{message}</p>
                    </div>
                    <button
                        onClick={onCancel}
                        disabled={loading}
                        className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all flex-shrink-0"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex gap-2 justify-end mt-5">
                    <button
                        onClick={onCancel}
                        disabled={loading}
                        className="px-4 py-2 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all disabled:opacity-50"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className={cn(
                            'flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-white rounded-xl shadow-md transition-all disabled:opacity-50',
                            cfg.confirmBg,
                            cfg.confirmShadow
                        )}
                    >
                        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    )
}
