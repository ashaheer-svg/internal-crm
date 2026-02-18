'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Save, ArrowLeft } from 'lucide-react'
import { formatCurrency } from '@/lib/format'
import ProductSelector from "@/app/dashboard/transactions/invoices/new/ProductSelector"
import CustomerSelector from "@/app/dashboard/transactions/invoices/new/CustomerSelector"

// Types
interface QuoteItem {
    id: string
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
    const [validUntil, setValidUntil] = useState('')
    const [terms, setTerms] = useState('Standard Terms & Conditions Apply.\nValidity: 30 Days.\nPayment: 100% Advance.')

    // Sale Type State
    const [saleType, setSaleType] = useState<"DIRECT" | "PARTNER">("DIRECT")

    // Partner / End Customer State
    const [billToCustomer, setBillToCustomer] = useState<any>(null)
    const [shipToCustomer, setShipToCustomer] = useState<any>(null)

    // Items State
    const [items, setItems] = useState<QuoteItem[]>([])

    useEffect(() => {
        // Set default valid until date (30 days)
        const date = new Date()
        date.setDate(date.getDate() + 30)
        setValidUntil(date.toISOString().split('T')[0])
    }, [])

    // Calculations
    const subtotal = items.reduce((sum, item) => sum + item.total, 0)
    const tax = subtotal * 0.18 // Assuming 18% GST
    const total = subtotal + tax

    // Auto-select BillTo/ShipTo logic could be added here if we fetch Project details
    // For now, let user select manually or default to basic flow

    // Handlers
    const updateItem = (id: string, field: keyof QuoteItem, value: any) => {
        setItems(prev => prev.map(item => {
            if (item.id === id) {
                const updated = { ...item, [field]: value }
                // Recalculate total
                updated.total = updated.quantity * updated.unitPrice
                return updated
            }
            return item
        }))
    }

    const removeItem = (id: string) => {
        setItems(prev => prev.filter(item => item.id !== id))
    }

    const handleProductSelect = (product: any) => {
        const newItem: QuoteItem = {
            id: Math.random().toString(),
            productId: product.id,
            description: `${product.brand} ${product.name}`,
            quantity: 1,
            unitPrice: product.resellerPrice || 0,
            total: product.resellerPrice || 0
        }
        setItems(prev => [...prev, newItem])
    }

    // Add Custom Item (Empty)
    const addCustomItem = () => {
        const newItem: QuoteItem = {
            id: Math.random().toString(),
            productId: null,
            description: '',
            quantity: 1,
            unitPrice: 0,
            total: 0
        }
        setItems(prev => [...prev, newItem])
    }

    async function handleSave() {
        if (items.length === 0) {
            alert("Please add at least one item.")
            return
        }

        if (saleType === 'PARTNER' && !billToCustomer) {
            alert("Please select a Partner for billing.")
            return
        }

        setLoading(true)
        try {
            const res = await fetch('/api/crm/quotes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId,
                    validUntil,
                    terms,
                    saleType,
                    billToId: billToCustomer?.id || null,
                    shipToId: shipToCustomer?.id || null,
                    items: items.map(item => ({
                        productId: item.productId,
                        description: item.description,
                        quantity: Number(item.quantity),
                        unitPrice: Number(item.unitPrice)
                    }))
                })
            })

            if (res.ok) {
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
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                    >
                        <Save className="w-4 h-4 mr-2" />
                        {loading ? 'Saving...' : 'Save Quote'}
                    </button>
                </div>
            </div>

            <div className="flex-1 p-8 max-w-6xl mx-auto w-full space-y-8">

                {/* Sale Type & Partners */}
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-6">
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Quote Details</h3>
                        <div className="flex gap-6 border-b pb-4 mb-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="saleType"
                                    value="DIRECT"
                                    checked={saleType === "DIRECT"}
                                    onChange={() => {
                                        setSaleType("DIRECT")
                                        setBillToCustomer(null)
                                        setShipToCustomer(null)
                                    }}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                />
                                <span className="text-sm font-medium text-gray-700">Direct Quote</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="saleType"
                                    value="PARTNER"
                                    checked={saleType === "PARTNER"}
                                    onChange={() => setSaleType("PARTNER")}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                />
                                <span className="text-sm font-medium text-gray-700">Partner Quote</span>
                            </label>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {saleType === 'PARTNER' ? 'Bill To (Partner)' : 'Bill To (Customer)'}
                            </label>
                            <CustomerSelector
                                onSelect={setBillToCustomer}
                                selectedCustomer={billToCustomer}
                                type={saleType === 'PARTNER' ? 'PARTNER' : undefined}
                            />
                            {saleType === 'DIRECT' && <p className="text-xs text-gray-500 mt-1">Optional override. Default is Project Customer.</p>}
                        </div>

                        {saleType === 'PARTNER' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Ship To (End Customer)
                                </label>
                                <CustomerSelector
                                    onSelect={setShipToCustomer}
                                    selectedCustomer={shipToCustomer}
                                    type="CUSTOMER"
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until</label>
                            <input
                                type="date"
                                className="w-full border-gray-300 rounded-md shadow-sm p-2 border"
                                value={validUntil}
                                onChange={(e) => setValidUntil(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Add Items Section */}
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium text-gray-900">Add Items</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Select Product</label>
                            <ProductSelector
                                onProductSelect={handleProductSelect}
                                excludeProductIds={[]}
                            />
                            <p className="text-xs text-gray-500">Search DB for products to add</p>
                        </div>
                        <div className="flex items-end pb-1">
                            <button
                                onClick={addCustomItem}
                                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center"
                            >
                                <Plus className="w-4 h-4 mr-1" />
                                Add Custom Line Item
                            </button>
                        </div>
                    </div>
                </div>

                {/* Line Items Table */}
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Quote Items</h3>
                    {items.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
                            No items added. Select products above.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-b">
                                        <th className="pb-2 w-1/2">Description</th>
                                        <th className="pb-2 w-24">Qty</th>
                                        <th className="pb-2 w-32">Unit Price</th>
                                        <th className="pb-2 w-32 text-right">Total</th>
                                        <th className="pb-2 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {items.map((item) => (
                                        <tr key={item.id} className="group">
                                            <td className="py-3 px-2 align-top">
                                                <textarea
                                                    className="w-full border-gray-300 rounded-md text-sm p-2 border"
                                                    rows={2}
                                                    value={item.description}
                                                    onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                                    placeholder="Item description..."
                                                />
                                            </td>
                                            <td className="py-3 px-2 align-top">
                                                <input
                                                    type="number"
                                                    className="w-full border-gray-300 rounded-md text-sm p-2 border"
                                                    min="1"
                                                    value={item.quantity}
                                                    onChange={(e) => updateItem(item.id, 'quantity', Number(e.target.value))}
                                                />
                                            </td>
                                            <td className="py-3 px-2 align-top">
                                                <div className="relative rounded-md shadow-sm">
                                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                                        <span className="text-gray-500 sm:text-sm">Rs.</span>
                                                    </div>
                                                    <input
                                                        type="number"
                                                        className="w-full border-gray-300 rounded-md text-sm p-2 pl-10 border"
                                                        min="0"
                                                        step="0.01"
                                                        value={item.unitPrice}
                                                        onChange={(e) => updateItem(item.id, 'unitPrice', Number(e.target.value))}
                                                    />
                                                </div>
                                            </td>
                                            <td className="py-3 px-2 align-top text-right font-medium text-gray-900 pt-4">
                                                {formatCurrency(item.total)}
                                            </td>
                                            <td className="py-3 pl-2 align-top text-right pt-4">
                                                <button
                                                    onClick={() => removeItem(item.id)}
                                                    className="text-gray-400 hover:text-red-600 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Totals */}
                            <div className="border-t border-gray-100 pt-4 flex justify-end">
                                <div className="w-64 space-y-2">
                                    <div className="flex justify-between text-sm text-gray-600">
                                        <span>Subtotal</span>
                                        <span>{formatCurrency(subtotal)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-gray-600">
                                        <span>Tax (18%)</span>
                                        <span>{formatCurrency(tax)}</span>
                                    </div>
                                    <div className="flex justify-between text-lg font-bold text-gray-900 border-t border-gray-200 pt-2">
                                        <span>Total</span>
                                        <span>{formatCurrency(total)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Terms */}
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                    <label className="block text-lg font-medium text-gray-900 mb-4">Terms & Conditions</label>
                    <textarea
                        className="w-full border-gray-300 rounded-md text-sm font-mono bg-gray-50 p-2 border"
                        rows={6}
                        value={terms}
                        onChange={(e) => setTerms(e.target.value)}
                    />
                </div>
            </div>
        </div>
    )
}
