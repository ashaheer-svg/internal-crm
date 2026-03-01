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
        <div
            onClick={() => onSort?.(column)}
            className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${onSort ? "cursor-pointer hover:bg-gray-100" : ""
                } ${isActive ? "text-blue-600 font-semibold" : "text-gray-500"}`}
        >
            {label && <span className="text-xs uppercase tracking-wider">{label}</span>}
            {isActive ? (
                sort.direction === "asc" ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                )
            ) : (
                <div className="w-3.5 h-3.5" />
            )}
        </div>
    )
}
