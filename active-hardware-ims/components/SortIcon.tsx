"use client"

import { ChevronUp, ChevronDown } from "lucide-react"

interface SortIconProps {
    sort: { key: string; direction: "asc" | "desc" } | null
    column: string
    label?: string
    onSort?: (column: string) => void
}

export default function SortIcon({ sort, column, label, onSort }: SortIconProps) {
    const isActive = sort?.key === column

    return (
        <button
            onClick={() => onSort?.(column)}
            type="button"
            className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all text-[11px] font-bold uppercase tracking-wider shadow-sm",
                onSort ? "cursor-pointer" : "cursor-default",
                isActive
                    ? "bg-blue-50 border-blue-200 text-blue-700"
                    : "bg-white border-gray-200 text-gray-400 hover:bg-gray-50 hover:border-gray-300"
            )}
        >
            {label && <span>{label}</span>}
            {isActive && (
                sort.direction === "asc" ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                )
            )}
        </button>
    )
}
