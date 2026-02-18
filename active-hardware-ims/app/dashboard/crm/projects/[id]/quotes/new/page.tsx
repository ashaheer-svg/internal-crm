'use client'

import { useState, useEffect, use } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, Trash2, Save, ArrowLeft } from 'lucide-react'

// Types
interface Product {
    id: string
    name: string
    sku: string
    resellerPrice: number
    description: string
}

interface QuoteItem {
    id: string // temporary ID for UI
    productId: string | null
    description: string
    quantity: number
    unitPrice: number
    total: number
}

export default function NewQuotePage({ params }: { params: Promise<{ id: string }> }) {
    const { id: projectId } = use(params)
    const router = useRouter()

    // State
    const [loading, setLoading] = useState(false)
    const [products, setProducts] = useState<Product[]>([])
    const [validUntil, setValidUntil] = useState('')
    const [terms, setTerms] = useState('Standard Terms & Conditions Apply.\nValidity: 30 Days.\nPayment: 100% Advance.')

    // Items State
    const [items, setItems] = useState<QuoteItem[]>([
        { id: '1', productId: null, description: '', quantity: 1, unitPrice: 0, total: 0 }
    ])

    useEffect(() => {
        // Fetch products for dropdown/search
        fetch('/api/inventory/products') // Assuming this exists or similar
            .then(res => res.json())
            .then(data => setProducts(data))
            .catch(err => console.error(err))

        // Set default valid until date (30 days)
        const date = new Date()
        date.setDate(date.getDate() + 30)
        setValidUntil(date.toISOString().split('T')[0])
    }, [])

    // Calculations
    const subtotal = items.reduce((sum, item) => sum + item.total, 0)
    const tax = subtotal * 0.18 // Assuming 18% GST/Tax for now. Make configurable later.
    const total = subtotal + tax

    // Handlers
    const updateItem = (id: string, field: keyof QuoteItem, value: any) => {
        setItems(prev => prev.map(item => {
            if (item.id === id) {
                const updated = { ...item, [field]: value }

                // Auto-fill from product selection
                if (field === 'productId') {
                    const product = products.find(p => p.id === value)
                    if (product) {
                        updated.description = product.name + (product.description ? ` - ${product.description}` : '')
                        updated.unitPrice = product.resellerPrice
                    }
                }

                // Recalculate total
                updated.total = updated.quantity * updated.unitPrice
                return updated
            }
            return item
        }))
    }

    const addItem = () => {
        setItems(prev => [
            ...prev,
            { id: Math.random().toString(), productId: null, description: '', quantity: 1, unitPrice: 0, total: 0 }
        ])
    }

    const removeItem = (id: string) => {
        if (items.length === 1) return // Prevent empty list
        setItems(prev => prev.filter(item => item.id !== id))
    }

    async function handleSave() {
        setLoading(true)
        try {
            const res = await fetch('/api/crm/quotes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId,
                    validUntil,
                    terms,
                    items: items.map(item => ({
                        productId: item.productId,
                        description: item.description,
                        quantity: Number(item.quantity),
                        unitPrice: Number(item.unitPrice)
                    }))
                })
            })

            if (res.ok) {
                const quote = await res.json()
                // Redirect to Quote Detail or PDF view (Phase 4.2)
                // For now, back to Project detail
                router.push(`/dashboard/crm/projects/${projectId}`)
            } else {
                alert('Failed to save quote')
            }
        } catch (error) {
            console.error(error)
            alert('Error saving quote')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <div className="bg-white border-b border-gray-200 px-8 py-4 shadow-sm flex justify-between items-center sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900">New Quote</h1>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm text-sm font-medium hover:bg-blue-700"
                    >
                        <Save className="w-4 h-4 mr-2" />
                        {loading ? 'Saving...' : 'Save Quote'}
                    </button>
                </div>
            </div>

            <div className="flex-1 p-8 max-w-5xl mx-auto w-full space-y-8">
                {/* Settings */}
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm grid grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until</label>
                        <input
                            type="date"
                            className="w-full border-gray-300 rounded-md shadow-sm"
                            value={validUntil}
                            onChange={(e) => setValidUntil(e.target.value)}
                        />
                    </div>
                </div>

                {/* Line Items */}
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Line Items</h3>
                    <table className="w-full">
                        <thead>
                            <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-b">
                                <th className="pb-2 w-1/4">Product</th>
                                <th className="pb-2 w-1/3">Description</th>
                                <th className="pb-2 w-24">Qty</th>
                                <th className="pb-2 w-32">Unit Price</th>
                                <th className="pb-2 w-32 text-right">Total</th>
                                <th className="pb-2 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {items.map((item) => (
                                <tr key={item.id} className="group">
                                    <td className="py-3 align-top">
                                        <select
                                            className="w-full border-gray-300 rounded-md text-sm"
                                            value={item.productId || ''}
                                            onChange={(e) => updateItem(item.id, 'productId', e.target.value || null)}
                                        >
                                            <option value="">Custom Item</option>
                                            {products.map(p => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="py-3 px-2 align-top">
                                        <textarea
                                            className="w-full border-gray-300 rounded-md text-sm"
                                            rows={2}
                                            value={item.description}
                                            onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                            placeholder="Item description..."
                                        />
                                    </td>
                                    <td className="py-3 px-2 align-top">
                                        <input
                                            type="number"
                                            className="w-full border-gray-300 rounded-md text-sm"
                                            min="1"
                                            value={item.quantity}
                                            onChange={(e) => updateItem(item.id, 'quantity', Number(e.target.value))}
                                        />
                                    </td>
                                    <td className="py-3 px-2 align-top">
                                        <input
                                            type="number"
                                            className="w-full border-gray-300 rounded-md text-sm"
                                            min="0"
                                            step="0.01"
                                            value={item.unitPrice}
                                            onChange={(e) => updateItem(item.id, 'unitPrice', Number(e.target.value))}
                                        />
                                    </td>
                                    <td className="py-3 px-2 align-top text-right font-medium text-gray-900">
                                        {item.total.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                                    </td>
                                    <td className="py-3 pl-2 align-top text-right">
                                        <button
                                            onClick={() => removeItem(item.id)}
                                            className="text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <button
                        onClick={addItem}
                        className="mt-4 flex items-center text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Line Item
                    </button>

                    {/* Totals */}
                    <div className="mt-8 border-t border-gray-100 pt-4 flex justify-end">
                        <div className="w-64 space-y-2">
                            <div className="flex justify-between text-sm text-gray-600">
                                <span>Subtotal</span>
                                <span>{subtotal.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span>
                            </div>
                            <div className="flex justify-between text-sm text-gray-600">
                                <span>Tax (18%)</span>
                                <span>{tax.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span>
                            </div>
                            <div className="flex justify-between text-lg font-bold text-gray-900 border-t border-gray-200 pt-2">
                                <span>Total</span>
                                <span>{total.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Terms */}
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                    <label className="block text-lg font-medium text-gray-900 mb-4">Terms & Conditions</label>
                    <textarea
                        className="w-full border-gray-300 rounded-md text-sm font-mono bg-gray-50"
                        rows={6}
                        value={terms}
                        onChange={(e) => setTerms(e.target.value)}
                    />
                </div>
            </div>
        </div>
    )
}
