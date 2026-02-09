"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, Save, Loader2, RefreshCcw } from "lucide-react"

type Sequence = {
    id: string
    nextNumber: number
    lastYearMonth: string | null
    prefix: string
}

export default function SequencesPage() {
    const [sequences, setSequences] = useState<Sequence[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")

    useEffect(() => {
        fetchSequences()
    }, [])

    async function fetchSequences() {
        try {
            const res = await fetch("/api/sequences")
            if (res.ok) {
                const data = await res.json()
                setSequences(data)
            }
        } catch (e) {
            setError("Failed to load sequences")
        } finally {
            setLoading(false)
        }
    }

    async function handleUpdate(id: string, nextNumber: number) {
        setSaving(true)
        setError("")
        setSuccess("")

        try {
            const res = await fetch("/api/sequences", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, nextNumber })
            })

            if (!res.ok) throw new Error("Failed to update sequence")

            setSuccess(`Updated ${id} sequence`)
            fetchSequences()
        } catch (e) {
            setError("Failed to save changes")
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Loading sequences...</div>
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/settings" className="p-2 hover:bg-gray-200 rounded-full">
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Document Sequences</h1>
                    <p className="text-sm text-gray-500">Manage running numbers for POs and GRNs</p>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4">
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}
            {success && (
                <div className="bg-green-50 border-l-4 border-green-400 p-4">
                    <p className="text-sm text-green-700">{success}</p>
                </div>
            )}

            <div className="bg-white shadow sm:rounded-lg divide-y divide-gray-200">
                {["PO", "GRN"].map(type => {
                    const seq = sequences.find(s => s.id === type)
                    const nextNum = seq?.nextNumber || 1

                    return (
                        <div key={type} className="p-6">
                            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                                {type === "PO" ? "Purchase Order" : "Goods Receipt Note"} Sequence
                            </h3>
                            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                                <div className="sm:col-span-3">
                                    <label className="block text-sm font-medium text-gray-700">Next Number</label>
                                    <div className="mt-1 flex rounded-md shadow-sm">
                                        <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                                            {seq?.prefix || (type === 'PO' ? 'PO-' : 'GRN-')}{new Date().getFullYear().toString().slice(-2)}{(new Date().getMonth() + 1).toString().padStart(2, '0')}-
                                        </span>
                                        <input
                                            type="number"
                                            min="1"
                                            className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm border"
                                            defaultValue={nextNum}
                                            id={`input-${type}`}
                                        />
                                    </div>
                                    <p className="mt-1 text-xs text-gray-500">
                                        Last reset: {seq?.lastYearMonth || 'Never'}
                                    </p>
                                </div>
                                <div className="sm:col-span-3 flex items-end">
                                    <button
                                        onClick={() => {
                                            const val = (document.getElementById(`input-${type}`) as HTMLInputElement).value
                                            handleUpdate(type, Number(val))
                                        }}
                                        disabled={saving}
                                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                                    >
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                        Update
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex">
                    <div className="flex-shrink-0">
                        <RefreshCcw className="h-5 w-5 text-blue-400" aria-hidden="true" />
                    </div>
                    <div className="ml-3">
                        <h3 className="text-sm font-medium text-blue-800">Auto-Reset Logic</h3>
                        <div className="mt-2 text-sm text-blue-700">
                            <p>
                                The sequence number (0001, 0002...) will automatically reset to 1 when the month changes (YYMM).
                                The format is always <strong>PREFIX-YYMM-XXXX</strong>.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
