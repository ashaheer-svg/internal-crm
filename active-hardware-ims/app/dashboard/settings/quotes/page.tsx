'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Edit2, Save, X, ArrowLeft } from 'lucide-react'
import ConfirmModal from '@/components/ConfirmModal'

interface TaxConfig {
    id: string
    name: string
    rate: number
    type: string
    isActive: boolean
}

export default function QuoteSettingsPage() {
    const router = useRouter()
    const [taxes, setTaxes] = useState<TaxConfig[]>([])
    const [loading, setLoading] = useState(true)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [newTax, setNewTax] = useState({ name: '', rate: 0 }) // For quick add

    // Edit form state
    const [editForm, setEditForm] = useState({ name: '', rate: 0 })
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

    useEffect(() => {
        fetchTaxes()
    }, [])

    async function fetchTaxes() {
        try {
            const res = await fetch('/api/settings/taxes')
            if (res.ok) {
                const data = await res.json()
                setTaxes(data)
            }
        } catch (error) {
            console.error('Failed to fetch taxes', error)
        } finally {
            setLoading(false)
        }
    }

    async function handleAdd() {
        if (!newTax.name) return

        try {
            const res = await fetch('/api/settings/taxes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...newTax, type: 'PERCENTAGE' })
            })

            if (res.ok) {
                setNewTax({ name: '', rate: 0 })
                fetchTaxes()
            }
        } catch (error) {
            console.error('Failed to add tax', error)
        }
    }

    async function handleUpdate(id: string) {
        try {
            const res = await fetch('/api/settings/taxes', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, ...editForm })
            })

            if (res.ok) {
                setEditingId(null)
                fetchTaxes()
            }
        } catch (error) {
            console.error('Failed to update tax', error)
        }
    }

    async function handleToggleActive(tax: TaxConfig) {
        try {
            const res = await fetch('/api/settings/taxes', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: tax.id, isActive: !tax.isActive })
            })

            if (res.ok) {
                fetchTaxes()
            }
        } catch (error) {
            console.error('Failed to toggle tax', error)
        }
    }

    async function handleDelete(id: string) {
        setPendingDeleteId(id)
    }

    async function confirmDelete() {
        if (!pendingDeleteId) return
        const id = pendingDeleteId
        setPendingDeleteId(null)
        try {
            const res = await fetch(`/api/settings/taxes?id=${id}`, { method: 'DELETE' })
            if (res.ok) fetchTaxes()
        } catch (error) {
            console.error('Failed to delete tax', error)
        }
    }

    function startEdit(tax: TaxConfig) {
        setEditingId(tax.id)
        setEditForm({ name: tax.name, rate: tax.rate })
    }

    return (
        <div className="space-y-6">
            <ConfirmModal
                open={!!pendingDeleteId}
                title="Delete Tax Configuration"
                message="Are you sure you want to delete this tax? This will not affect existing quotes."
                variant="danger"
                onConfirm={confirmDelete}
                onCancel={() => setPendingDeleteId(null)}
            />
            <div className="flex items-center gap-4">
                <button
                    onClick={() => router.back()}
                    className="p-2 hover:bg-gray-100 rounded-full text-gray-600"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">Quote Configuration</h1>
            </div>

            <div className="bg-white shadow sm:rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-base font-semibold leading-6 text-gray-900">Tax Tables</h3>
                    <div className="mt-2 text-sm text-gray-500">
                        <p>Configure taxes that can be applied to quotes.</p>
                    </div>

                    <div className="mt-6 flow-root">
                        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                            <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                                <table className="min-w-full divide-y divide-gray-300">
                                    <thead>
                                        <tr>
                                            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">Tax Name</th>
                                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Rate (%)</th>
                                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
                                            <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-0">
                                                <span className="sr-only">Actions</span>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {/* Add Row */}
                                        <tr className="bg-gray-50">
                                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">
                                                <input
                                                    type="text"
                                                    placeholder="Tax Name (e.g. GST)"
                                                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                                                    value={newTax.name}
                                                    onChange={e => setNewTax({ ...newTax, name: e.target.value })}
                                                />
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                <input
                                                    type="number"
                                                    placeholder="0"
                                                    className="block w-24 rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                                                    value={newTax.rate}
                                                    onChange={e => setNewTax({ ...newTax, rate: parseFloat(e.target.value) || 0 })}
                                                />
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">New</span>
                                            </td>
                                            <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-0">
                                                <button
                                                    onClick={handleAdd}
                                                    className="text-blue-600 hover:text-blue-900 flex items-center justify-end gap-1 ml-auto"
                                                    disabled={!newTax.name}
                                                >
                                                    <Plus className="w-4 h-4" /> Add
                                                </button>
                                            </td>
                                        </tr>

                                        {taxes.map((tax) => (
                                            <tr key={tax.id}>
                                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">
                                                    {editingId === tax.id ? (
                                                        <input
                                                            type="text"
                                                            className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6"
                                                            value={editForm.name}
                                                            onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                                        />
                                                    ) : tax.name}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                    {editingId === tax.id ? (
                                                        <div className="flex items-center gap-1">
                                                            <input
                                                                type="number"
                                                                className="block w-20 rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6"
                                                                value={editForm.rate}
                                                                onChange={e => setEditForm({ ...editForm, rate: parseFloat(e.target.value) || 0 })}
                                                            />
                                                            <span className="text-gray-500">%</span>
                                                        </div>
                                                    ) : `${tax.rate}%`}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                    <button
                                                        onClick={() => handleToggleActive(tax)}
                                                        className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${tax.isActive
                                                            ? 'bg-green-50 text-green-700 ring-green-600/20'
                                                            : 'bg-gray-50 text-gray-600 ring-gray-500/10'
                                                            }`}
                                                    >
                                                        {tax.isActive ? 'Active' : 'Inactive'}
                                                    </button>
                                                </td>
                                                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-0">
                                                    {editingId === tax.id ? (
                                                        <div className="flex justify-end gap-2">
                                                            <button onClick={() => handleUpdate(tax.id)} className="text-green-600 hover:text-green-900"><Save className="w-4 h-4" /></button>
                                                            <button onClick={() => setEditingId(null)} className="text-gray-600 hover:text-gray-900"><X className="w-4 h-4" /></button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex justify-end gap-2">
                                                            <button onClick={() => startEdit(tax)} className="text-blue-600 hover:text-blue-900"><Edit2 className="w-4 h-4" /></button>
                                                            <button onClick={() => handleDelete(tax.id)} className="text-red-600 hover:text-red-900"><Trash2 className="w-4 h-4" /></button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
