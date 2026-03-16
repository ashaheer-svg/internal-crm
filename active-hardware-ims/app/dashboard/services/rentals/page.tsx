"use client"

import { useState, useEffect } from "react"
import { Package, Plus, Search, Trash2, Edit2, AlertCircle, CheckCircle } from "lucide-react"
import BackButton from "@/components/BackButton"
import ConfirmModal from "@/components/ConfirmModal"

export default function RentalAssetsPage() {
    const [assets, setAssets] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

    // New Asset Form State
    const [newName, setNewName] = useState("")
    const [newSerial, setNewSerial] = useState("")
    const [newNotes, setNewNotes] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState("")
    const [pendingAction, setPendingAction] = useState<null | { onConfirm: () => void }>(null)

    useEffect(() => {
        fetchAssets()
    }, [])

    const fetchAssets = async () => {
        try {
            const res = await fetch('/api/rentals')
            const data = await res.json()
            setAssets(data.assets || [])
        } catch (err) {
            console.error("Failed to fetch assets", err)
        } finally {
            setLoading(false)
        }
    }

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        setError("")

        try {
            const res = await fetch('/api/rentals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newName,
                    serialNumber: newSerial,
                    notes: newNotes
                })
            })

            if (!res.ok) {
                const json = await res.json()
                throw new Error(json.error || "Failed to create asset")
            }

            // Reset and refresh
            setNewName("")
            setNewSerial("")
            setNewNotes("")
            setIsCreateModalOpen(false)
            fetchAssets()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDelete = async (id: string) => {
        setPendingAction({
            onConfirm: async () => {
                setPendingAction(null)
                try {
                    const res = await fetch(`/api/rentals/${id}`, { method: 'DELETE' })
                    if (!res.ok) throw new Error("Failed to delete")
                    fetchAssets()
                } catch (err) {
                    setError("Failed to delete asset. It might be currently rented.")
                }
            }
        })
    }

    const filteredAssets = assets.filter(asset =>
        asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.serialNumber.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="space-y-6">
            <ConfirmModal
                open={!!pendingAction}
                title="Delete Rental Asset"
                message="Are you sure you want to delete this asset? This action cannot be undone."
                variant="danger"
                onConfirm={() => pendingAction?.onConfirm()}
                onCancel={() => setPendingAction(null)}
            />
            <div className="flex items-center justify-between">
                <div>
                    <BackButton className="mb-4" />
                    <h1 className="text-2xl font-bold text-gray-900">Rental Asset Manager</h1>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    New Asset
                </button>
            </div>

            {/* Search */}
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                    type="text"
                    className="block w-full pl-10 pr-3 py-2 rounded-lg border border-gray-200 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="Search assets by name or serial..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Asset List */}
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <ul className="divide-y divide-gray-200">
                    {loading ? (
                        <li className="px-4 py-4 text-center text-gray-500">Loading assets...</li>
                    ) : filteredAssets.length === 0 ? (
                        <li className="px-4 py-4 text-center text-gray-500">No assets found.</li>
                    ) : (
                        filteredAssets.map(asset => (
                            <li key={asset.id} className="px-4 py-4 flex items-center justify-between hover:bg-gray-50">
                                <div>
                                    <h3 className="text-lg font-medium text-gray-900">{asset.name}</h3>
                                    <p className="text-sm text-gray-500">Serial: <span className="font-mono text-gray-700">{asset.serialNumber}</span></p>
                                    {asset.notes && <p className="text-xs text-gray-400 mt-1">{asset.notes}</p>}
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${asset.status === 'AVAILABLE' ? 'bg-green-100 text-green-800' :
                                        asset.status === 'RENTED' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                                        }`}>
                                        {asset.status}
                                    </span>
                                    {asset.status === 'RENTED' && asset.currentContract && (
                                        <div className="text-right text-xs text-gray-500">
                                            Rented to: <br />
                                            <span className="font-medium text-gray-900">
                                                {asset.currentContract.customer.name}
                                            </span>
                                        </div>
                                    )}
                                    <button
                                        onClick={() => handleDelete(asset.id)}
                                        className="text-red-500 hover:text-red-700 p-2"
                                        title="Delete Asset"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </li>
                        ))
                    )}
                </ul>
            </div>

            {/* Create Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-md w-full p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Rental Asset</h3>

                        {error && (
                            <div className="mb-4 bg-red-50 p-2 rounded text-sm text-red-600 flex items-center">
                                <AlertCircle className="w-4 h-4 mr-2" />
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleCreateSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Name / Model</label>
                                <input
                                    type="text"
                                    required
                                    className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                    placeholder="e.g. MacBook Pro 16"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Serial Number</label>
                                <input
                                    type="text"
                                    required
                                    className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    value={newSerial}
                                    onChange={e => setNewSerial(e.target.value)}
                                    placeholder="e.g. SN-12345678"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Notes (Optional)</label>
                                <textarea
                                    className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    value={newNotes}
                                    onChange={e => setNewNotes(e.target.value)}
                                    rows={3}
                                />
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Creating...' : 'Create Asset'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
