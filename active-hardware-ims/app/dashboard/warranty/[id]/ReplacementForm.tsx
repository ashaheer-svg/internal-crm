'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Package, AlertCircle, CheckCircle } from 'lucide-react'

interface ReplacementFormProps {
    claimId: string
    hasReplacement: boolean
    replacementType?: string | null
}

interface InventoryItem {
    id: string
    serialNumber: string
    product: {
        name: string
        sku: string
        brand: string | null
    }
    status: string
}

export default function ReplacementForm({ claimId, hasReplacement, replacementType }: ReplacementFormProps) {
    const router = useRouter()
    const [searchTerm, setSearchTerm] = useState('')
    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
    const [selectedType, setSelectedType] = useState<'TEMPORARY' | 'PERMANENT' | ''>('')
    const [notes, setNotes] = useState('')
    const [isUntracked, setIsUntracked] = useState(false)
    const [externalInfo, setExternalInfo] = useState('')
    const [loading, setLoading] = useState(false)
    const [searching, setSearching] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    // Don't show form if replacement already provided
    if (hasReplacement) {
        return null
    }

    async function searchInventory() {
        if (searchTerm.length < 2) {
            setInventoryItems([])
            return
        }

        setSearching(true)
        try {
            const params = new URLSearchParams({
                status: 'AVAILABLE',
                serialNumber: searchTerm
            })

            const res = await fetch(`/api/inventory?${params.toString()}`)
            const data = await res.json()

            setInventoryItems(data)
        } catch (error) {
            console.error('Failed to search inventory:', error)
            setInventoryItems([])
        } finally {
            setSearching(false)
        }
    }

    async function handleProvideReplacement() {
        if (!selectedType) {
            setError('Please select a replacement type')
            return
        }

        if (!isUntracked && !selectedItem) {
            setError('Please select an inventory item')
            return
        }

        if (isUntracked && !externalInfo.trim()) {
            setError('Please provide details for the untracked unit')
            return
        }

        setLoading(true)
        setError('')
        setSuccess('')

        try {
            const res = await fetch(`/api/warranty/${claimId}/replacement`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    replacementType: selectedType,
                    replacementItemId: isUntracked ? null : selectedItem?.id,
                    replacementExternalInfo: isUntracked ? externalInfo : null,
                    notes
                })
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Failed to provide replacement')
            }

            setSuccess(`${selectedType} replacement provided successfully!`)
            setTimeout(() => {
                router.refresh()
            }, 1500)

        } catch (error: any) {
            setError(error.message || 'Failed to provide replacement')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="bg-white shadow sm:rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Provide Replacement</h3>

            {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-800">{error}</p>
                </div>
            )}

            {success && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-green-800">{success}</p>
                </div>
            )}

            {/* Replacement Type Selection */}
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Replacement Type
                </label>
                <div className="space-y-2">
                    <label className="flex items-start gap-3 p-3 border rounded-md cursor-pointer hover:bg-gray-50">
                        <input
                            type="radio"
                            name="replacementType"
                            value="TEMPORARY"
                            checked={selectedType === 'TEMPORARY'}
                            onChange={(e) => setSelectedType(e.target.value as 'TEMPORARY')}
                            className="mt-1"
                        />
                        <div>
                            <div className="font-medium text-gray-900">Temporary (Loaner)</div>
                            <div className="text-sm text-gray-500">
                                Customer borrows device while original is being repaired. Both devices will be returned.
                            </div>
                        </div>
                    </label>
                    <label className="flex items-start gap-3 p-3 border rounded-md cursor-pointer hover:bg-gray-50">
                        <input
                            type="radio"
                            name="replacementType"
                            value="PERMANENT"
                            checked={selectedType === 'PERMANENT'}
                            onChange={(e) => setSelectedType(e.target.value as 'PERMANENT')}
                            className="mt-1"
                        />
                        <div>
                            <div className="font-medium text-gray-900">Permanent Replacement</div>
                            <div className="text-sm text-gray-500">
                                Customer keeps replacement device. Original device will be returned to you.
                            </div>
                        </div>
                    </label>
                </div>
            </div>

            {/* Untracked Toggle */}
            <div className="mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={isUntracked}
                        onChange={(e) => {
                            setIsUntracked(e.target.checked)
                            if (e.target.checked) setSelectedItem(null)
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Untracked Unit (Manual Entry)</span>
                </label>
                <p className="mt-1 text-xs text-gray-500">
                    Use this for used items or loaners not in inventory tracking.
                </p>
            </div>

            {/* Inventory Search or Manual Entry */}
            {!isUntracked ? (
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Search Replacement Item
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value)
                                searchInventory()
                            }}
                            placeholder="Search by serial number..."
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <Search className="absolute right-3 top-2.5 w-5 h-5 text-gray-400" />
                    </div>
                    {searching && (
                        <p className="mt-2 text-sm text-gray-500">Searching...</p>
                    )}
                </div>
            ) : (
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Unit Details (Model / Serial #)
                    </label>
                    <input
                        type="text"
                        value={externalInfo}
                        onChange={(e) => setExternalInfo(e.target.value)}
                        placeholder="e.g. Dell Latitude 5420 (Used) - SN: 12345"
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
            )}

            {/* Search Results */}
            {inventoryItems.length > 0 && (
                <div className="mb-4 max-h-60 overflow-y-auto border rounded-md">
                    {inventoryItems.map((item) => (
                        <div
                            key={item.id}
                            onClick={() => setSelectedItem(item)}
                            className={`p-3 border-b last:border-b-0 cursor-pointer hover:bg-gray-50 ${selectedItem?.id === item.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <Package className="w-4 h-4 text-gray-400" />
                                <div className="flex-1">
                                    <div className="font-medium text-gray-900">{item.serialNumber}</div>
                                    <div className="text-sm text-gray-500">
                                        {item.product.name} {item.product.brand && `• ${item.product.brand}`}
                                    </div>
                                    <div className="text-xs text-gray-400">SKU: {item.product.sku}</div>
                                </div>
                                {selectedItem?.id === item.id && (
                                    <CheckCircle className="w-5 h-5 text-blue-600" />
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Selected Item Display */}
            {selectedItem && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm font-medium text-blue-900">Selected Replacement:</p>
                    <p className="text-sm text-blue-800">
                        {selectedItem.serialNumber} - {selectedItem.product.name}
                    </p>
                </div>
            )}

            {/* Notes */}
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (Optional)
                </label>
                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Add any notes about this replacement..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
            </div>

            {/* Submit Button */}
            <button
                onClick={handleProvideReplacement}
                disabled={(!selectedItem && !isUntracked) || !selectedType || (isUntracked && !externalInfo.trim()) || loading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
            >
                {loading ? 'Providing Replacement...' : 'Provide Replacement'}
            </button>
        </div>
    )
}
