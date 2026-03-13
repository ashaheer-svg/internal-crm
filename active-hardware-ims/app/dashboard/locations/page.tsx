"use client"

import { useState, useEffect } from "react"
import { Plus, MapPin, Warehouse, Edit, Trash2, X } from "lucide-react"
import BackButton from "@/components/BackButton"

type Location = {
    id: string
    name: string
    type: string
    address: string | null
    _count: { inventory: number }
}

export default function LocationsPage() {
    const [locations, setLocations] = useState<Location[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [formData, setFormData] = useState({ name: '', type: 'PHYSICAL', address: '' })
    const [error, setError] = useState('')

    useEffect(() => {
        fetchLocations()
    }, [])

    async function fetchLocations() {
        try {
            const res = await fetch('/api/locations')
            const data = await res.json()
            setLocations(data)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    function resetForm() {
        setFormData({ name: '', type: 'PHYSICAL', address: '' })
        setEditingId(null)
        setShowForm(false)
        setError('')
    }

    function handleEdit(location: Location) {
        setFormData({
            name: location.name,
            type: location.type,
            address: location.address || ''
        })
        setEditingId(location.id)
        setShowForm(true)
        setError('')
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError('')

        try {
            const url = editingId ? `/api/locations/${editingId}` : '/api/locations'
            const method = editingId ? 'PUT' : 'POST'

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Failed to save location')
            }

            resetForm()
            fetchLocations()
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Failed to save location')
        }
    }

    const [showTransferModal, setShowTransferModal] = useState(false)
    const [locationToDelete, setLocationToDelete] = useState<{ id: string; name: string; inventoryCount: number } | null>(null)
    const [transferToLocationId, setTransferToLocationId] = useState('')

    async function handleDelete(id: string, name: string) {
        try {
            const res = await fetch(`/api/locations/${id}`, {
                method: 'DELETE'
            })

            const data = await res.json()

            // If location has inventory and requires transfer
            if (!res.ok && data.requiresTransfer) {
                setLocationToDelete({ id, name, inventoryCount: data.inventoryCount })
                setShowTransferModal(true)
                setTransferToLocationId('')
                return
            }

            if (!res.ok) {
                throw new Error(data.error || 'Failed to delete location')
            }

            fetchLocations()
            alert(data.message || 'Location deleted successfully')
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Failed to delete location')
        }
    }

    async function handleTransferAndDelete() {
        if (!locationToDelete || !transferToLocationId) {
            alert('Please select a destination location')
            return
        }

        try {
            const res = await fetch(`/api/locations/${locationToDelete.id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transferToLocationId })
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Failed to delete location')
            }

            setShowTransferModal(false)
            setLocationToDelete(null)
            setTransferToLocationId('')
            fetchLocations()
            alert(data.message || 'Location deleted and inventory transferred successfully')
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Failed to delete location')
        }
    }

    return (
        <div className="space-y-6">
            <BackButton />
            <div className="sm:flex sm:items-center sm:justify-between">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">Locations</h1>
                <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
                    <button
                        onClick={() => {
                            resetForm()
                            setShowForm(!showForm)
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Add Location
                    </button>
                </div>
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} className="bg-white p-6 shadow sm:rounded-lg space-y-4 border border-blue-100">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-medium text-gray-900">
                            {editingId ? 'Edit Location' : 'New Location'}
                        </h3>
                        <button
                            type="button"
                            onClick={resetForm}
                            className="text-gray-400 hover:text-gray-500"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-400 p-3">
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Name *</label>
                            <input
                                type="text"
                                required
                                className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Type *</label>
                            <select
                                className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            >
                                <option value="PHYSICAL">Physical Warehouse</option>
                                <option value="VIRTUAL">Virtual (e.g. In-Transit)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Address (Optional)</label>
                            <input
                                type="text"
                                className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end pt-2 gap-3">
                        <button
                            type="button"
                            onClick={resetForm}
                            className="inline-flex items-center px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            {editingId ? 'Update' : 'Save'}
                        </button>
                    </div>
                </form>
            )}

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {locations.map((location) => (
                    <div key={location.id} className="bg-white overflow-hidden shadow rounded-lg border-l-4 border-blue-500">
                        <div className="px-4 py-5 sm:p-6">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center flex-1">
                                    <div className="flex-shrink-0 bg-blue-50 rounded-md p-3">
                                        <Warehouse className="h-6 w-6 text-blue-600" />
                                    </div>
                                    <div className="ml-5 w-0 flex-1">
                                        <dl>
                                            <dt className="text-sm font-medium text-gray-500 truncate">{location.type}</dt>
                                            <dd>
                                                <div className="text-lg font-medium text-gray-900">{location.name}</div>
                                            </dd>
                                        </dl>
                                    </div>
                                </div>
                                <div className="flex gap-2 ml-2">
                                    <button
                                        onClick={() => handleEdit(location)}
                                        className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-gray-100 transition-colors"
                                        title="Edit location"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(location.id, location.name)}
                                        className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                        title="Delete location"
                                        disabled={location._count.inventory > 0}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <div className="mt-4">
                                <div className="flex items-center text-sm text-gray-500">
                                    <MapPin className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                                    {location.address || "No address provided"}
                                </div>
                                <div className="mt-2 text-sm text-gray-500">
                                    Stock count: <span className="font-bold text-gray-900">{location._count.inventory}</span> units
                                </div>
                                {location._count.inventory > 0 && (
                                    <p className="mt-1 text-xs text-gray-400">
                                        Cannot delete while items are in stock
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                {locations.length === 0 && !loading && (
                    <div className="col-span-full py-12 text-center text-gray-500">
                        No locations found. Create your first warehouse.
                    </div>
                )}
            </div>

            {/* Transfer Modal */}
            {showTransferModal && locationToDelete && (
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">
                            Transfer Inventory Before Deletion
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Location <strong>{locationToDelete.name}</strong> has <strong>{locationToDelete.inventoryCount}</strong> items in stock.
                            Please select a destination location to transfer all inventory before deletion.
                        </p>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Transfer to Location *
                            </label>
                            <select
                                value={transferToLocationId}
                                onChange={(e) => setTransferToLocationId(e.target.value)}
                                className="block w-full rounded-md border-gray-300 shadow-sm border p-2"
                            >
                                <option value="">Select destination location...</option>
                                {locations
                                    .filter(loc => loc.id !== locationToDelete.id)
                                    .map(loc => (
                                        <option key={loc.id} value={loc.id}>
                                            {loc.name} ({loc._count.inventory} items)
                                        </option>
                                    ))
                                }
                            </select>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setShowTransferModal(false)
                                    setLocationToDelete(null)
                                    setTransferToLocationId('')
                                }}
                                className="inline-flex items-center px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleTransferAndDelete}
                                disabled={!transferToLocationId}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-600 text-sm font-medium text-white hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Transfer &amp; Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
