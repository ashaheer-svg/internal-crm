"use client"

import { useState, useEffect, useRef } from "react"
import { Search, ChevronDown, User } from "lucide-react"

type SalesRep = {
    id: string
    name: string
    email?: string
    phone?: string
}

type SalesRepSelectorProps = {
    onSelect: (salesRep: SalesRep | null) => void
    selectedId: string | null
    label?: string
    className?: string
}

export default function SalesRepSelector({
    onSelect,
    selectedId,
    label = "Sales Representative",
    className = ""
}: SalesRepSelectorProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [reps, setReps] = useState<SalesRep[]>([])
    const [selectedRep, setSelectedRep] = useState<SalesRep | null>(null)
    const [loading, setLoading] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    useEffect(() => {
        if (isOpen) {
            fetchReps()
        }
    }, [isOpen, searchQuery])

    useEffect(() => {
        if (selectedId && !selectedRep) {
            // Find in current list or fetch specifically
            fetchReps(true)
        } else if (!selectedId) {
            setSelectedRep(null)
        }
    }, [selectedId])

    async function fetchReps(forceFind = false) {
        setLoading(true)
        try {
            const url = searchQuery
                ? `/api/sales-reps?search=${encodeURIComponent(searchQuery)}`
                : `/api/sales-reps`
            const res = await fetch(url, { cache: 'no-store' })
            if (!res.ok) throw new Error("Failed to fetch")
            const data = await res.json()

            const list = Array.isArray(data) ? data : (data.salesReps || [])
            setReps(list)

            if (forceFind && selectedId) {
                const found = list.find((r: SalesRep) => r.id === selectedId)
                if (found) setSelectedRep(found)
            }
        } catch (error) {
            console.error("Error fetching sales reps:", error)
        } finally {
            setLoading(false)
        }
    }

    function handleSelect(rep: SalesRep) {
        setSelectedRep(rep)
        onSelect(rep)
        setIsOpen(false)
        setSearchQuery("")
    }

    function handleClear(e: React.MouseEvent) {
        e.stopPropagation()
        setSelectedRep(null)
        onSelect(null)
        setIsOpen(false)
    }

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            {label && (
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            )}

            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-2.5 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 text-left shadow-sm transition-all focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    <User className={`h-4 w-4 shrink-0 ${selectedRep ? 'text-blue-500' : 'text-gray-400'}`} />
                    <span className={`text-sm truncate ${selectedRep ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                        {selectedRep ? selectedRep.name : "Select representative..."}
                    </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    {selectedRep && (
                        <span
                            onClick={handleClear}
                            className="text-[10px] font-bold text-gray-400 hover:text-red-500 px-1.5 py-0.5"
                        >
                            CLEAR
                        </span>
                    )}
                    <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </button>

            {isOpen && (
                <div className="absolute z-50 mt-2 w-full bg-white shadow-xl max-h-80 rounded-xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in duration-200">
                    <div className="p-2 border-b border-gray-100">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search representatives..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-100 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="max-h-60 overflow-y-auto">
                        {loading && reps.length === 0 ? (
                            <div className="p-8 text-center text-xs text-gray-400">Loading...</div>
                        ) : reps.length === 0 ? (
                            <div className="p-8 text-center text-xs text-gray-400">No matches found</div>
                        ) : (
                            <ul className="py-1">
                                {reps.map((rep) => (
                                    <li key={rep.id}>
                                        <button
                                            type="button"
                                            onClick={() => handleSelect(rep)}
                                            className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${selectedId === rep.id ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-50 text-gray-700'}`}
                                        >
                                            {rep.name}
                                            {rep.email && <span className="block text-[10px] text-gray-400 font-normal">{rep.email}</span>}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
