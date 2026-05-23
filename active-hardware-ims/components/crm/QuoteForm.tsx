'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Save, ArrowLeft, X, Box } from 'lucide-react'
import { formatCurrency } from '@/lib/format'
import ProductSelector from "@/components/selectors/ProductSelector"
import CustomerSelector from "@/components/selectors/CustomerSelector"
import FormattedNumberInput from "@/components/FormattedNumberInput"

// Types
export interface QuoteItem {
    id: string
    productId: string | null
    description: string
    productModel?: string | null
    serialNumbers?: string | null
    details?: { modelName: string; serialNumbers: string }[]
    quantity: number
    unitPrice: number
    discount?: number // Percentage
    taxRate?: number
    total: number
    availableStock?: number
    locations?: string
}

interface QuoteFormProps {
    initialData?: any
    projectId: string
    onSubmit: (data: any) => Promise<void>
    loading: boolean
    title: string
    mode?: 'HARDWARE' | 'SERVICE'
}

export default function QuoteForm({ initialData, projectId, onSubmit, loading, title, mode = 'HARDWARE' }: QuoteFormProps) {
    const router = useRouter()

    // State
    const [validUntil, setValidUntil] = useState(initialData?.validUntil || '')
    const [terms, setTerms] = useState(initialData?.terms || 'Standard Terms & Conditions Apply.\nValidity: 30 Days.\nPayment: 100% Advance.')
    const [quoteNumber, setQuoteNumber] = useState(initialData?.quoteNumber || '')
    const [comment, setComment] = useState(initialData?.comment || '')

    // Sale Type State
    const [saleType, setSaleType] = useState<"DIRECT" | "PARTNER">(initialData?.saleType || "DIRECT")

    // Project Defaults
    const [projectDefaults, setProjectDefaults] = useState<any>(null)

    // Partner / End Customer State
    const [billToCustomer, setBillToCustomer] = useState<any>(initialData?.billTo || null)
    const [shipToCustomer, setShipToCustomer] = useState<any>(initialData?.shipTo || null)

    // Items State
    const [items, setItems] = useState<QuoteItem[]>(initialData?.items || [])

    const [availableTaxes, setAvailableTaxes] = useState<any[]>([])
    const [selectedTaxIds, setSelectedTaxIds] = useState<string[]>([])

    useEffect(() => {
        // Fetch Project Defaults
        fetch(`/api/crm/projects/${projectId}`)
            .then(res => res.ok ? res.json() : null)
            .then(project => {
                if (project) {
                    setProjectDefaults(project)

                    // Default values if not already provided
                    if (!initialData) {
                        if (saleType === "DIRECT") {
                            setBillToCustomer(project.customer)
                        } else {
                            setBillToCustomer(project.partner)
                            setShipToCustomer(project.customer)
                        }
                    } else {
                        // For existing quotes, if billTo or shipTo is explicitly null/undefined, 
                        // we can potentially default them if they match the current project.
                        if (!initialData.billTo && saleType === "DIRECT") {
                            setBillToCustomer(project.customer)
                        } else if (saleType === "PARTNER") {
                            if (!initialData.billTo) setBillToCustomer(project.partner)
                            if (!initialData.shipTo) setShipToCustomer(project.customer)
                        }
                    }
                }
            })

        if (!validUntil) {
            const date = new Date()
            date.setDate(date.getDate() + 30)
            setValidUntil(date.toISOString().split('T')[0])
        }

        // Fetch Suggested Quote Number if new
        if (!initialData) {
            fetch('/api/crm/quotes/preview')
                .then(res => res.ok ? res.json() : null)
                .then(data => {
                    if (data?.suggestedNumber) setQuoteNumber(data.suggestedNumber)
                })
        }

        // Fetch Taxes
        fetch('/api/settings/taxes')
            .then(res => res.ok ? res.json() : [])
            .then(data => {
                setAvailableTaxes(data)

                if (initialData?.taxDetails) {
                    // Match existing taxes...
                    try {
                        const savedTaxes = JSON.parse(initialData.taxDetails)
                        if (Array.isArray(savedTaxes)) {
                            const matchedIds = data.filter((t: any) =>
                                savedTaxes.some((st: any) => st.name === t.name && st.rate === t.rate)
                            ).map((t: any) => t.id)
                            setSelectedTaxIds(matchedIds)
                        }
                    } catch (e) { }
                } else if (!initialData) {
                    setSelectedTaxIds(data.filter((t: any) => t.isActive).map((t: any) => t.id))
                }
            })
            .catch(err => console.error('Failed to fetch taxes', err))
    }, [projectId])

    // Calculations
    const subtotal = items.reduce((sum, item) => sum + item.total, 0)

    // Calculate Tax
    const selectedTaxes = availableTaxes.filter(t => selectedTaxIds.includes(t.id))
    const taxTotal = selectedTaxes.reduce((sum, tax) => {
        return sum + (subtotal * (tax.rate / 100))
    }, 0)

    const total = subtotal + taxTotal

    // Handlers
    const handleSaleTypeChange = (newType: "DIRECT" | "PARTNER") => {
        setSaleType(newType)
        if (projectDefaults) {
            if (newType === "DIRECT") {
                setBillToCustomer(projectDefaults.customer)
                setShipToCustomer(null)
            } else {
                setBillToCustomer(projectDefaults.partner)
                setShipToCustomer(projectDefaults.customer)
            }
        } else {
            setBillToCustomer(null)
            setShipToCustomer(null)
        }
    }

    const updateItem = (id: string, field: keyof QuoteItem, value: any) => {
        setItems(prev => prev.map(item => {
            if (item.id === id) {
                const updated = { ...item, [field]: value }

                // Recalculate total
                // Total = (Qty * UnitPrice) - Discount
                const rawTotal = updated.quantity * updated.unitPrice
                const discountAmount = updated.discount ? (rawTotal * (updated.discount / 100)) : 0
                updated.total = rawTotal - discountAmount

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
            productModel: product.model || '',
            serialNumbers: '',
            quantity: 1,
            unitPrice: product.resellerPrice || 0,
            discount: 0,
            total: product.resellerPrice || 0,
            details: mode === 'SERVICE' ? [{ modelName: product.model || '', serialNumbers: '' }] : [],
            availableStock: product._count?.inventory,
            locations: product.inventory && product.inventory.length > 0
                ? Object.entries(
                    product.inventory.reduce((acc: Record<string, number>, item: any) => {
                        const loc = item.location.name;
                        acc[loc] = (acc[loc] || 0) + 1;
                        return acc;
                    }, {})
                ).map(([loc, count]) => `${loc} (${count})`).join(', ')
                : undefined
        }
        setItems(prev => [...prev, newItem])
    }

    // Add Custom Item
    const addCustomItem = () => {
        const newItem: QuoteItem = {
            id: Math.random().toString(),
            productId: null,
            description: 'New Item',
            productModel: '',
            serialNumbers: '',
            quantity: 1,
            unitPrice: 0,
            discount: 0,
            total: 0,
            details: mode === 'SERVICE' ? [{ modelName: '', serialNumbers: '' }] : []
        }
        setItems(prev => [...prev, newItem])
    }

    // Add Charge
    const addChargeItem = () => {
        const newItem: QuoteItem = {
            id: Math.random().toString(),
            productId: null,
            description: 'Additional Charge (Shipping/Installation)',
            productModel: '',
            serialNumbers: '',
            quantity: 1,
            unitPrice: 0,
            discount: 0,
            total: 0,
            details: []
        }
        setItems(prev => [...prev, newItem])
    }

    const addEquipment = (itemId: string) => {
        setItems(prev => prev.map(item => {
            if (item.id === itemId) {
                return { ...item, details: [...(item.details || []), { modelName: '', serialNumbers: '' }] }
            }
            return item
        }))
    }

    const removeEquipment = (itemId: string, index: number) => {
        setItems(prev => prev.map(item => {
            if (item.id === itemId) {
                return { ...item, details: (item.details || []).filter((_, i) => i !== index) }
            }
            return item
        }))
    }

    const updateEquipment = (itemId: string, index: number, field: 'modelName' | 'serialNumbers', value: string) => {
        setItems(prev => prev.map(item => {
            if (item.id === itemId) {
                const newDetails = [...(item.details || [])]
                newDetails[index] = { ...newDetails[index], [field]: value }
                return { ...item, details: newDetails }
            }
            return item
        }))
    }

    function handleSubmit() {
        if (items.length === 0) {
            alert("Please add at least one item.")
            return
        }

        if (saleType === 'PARTNER' && !billToCustomer) {
            alert("Please select a Partner for billing.")
            return
        }

        // Prepare tax details
        const taxDetails = selectedTaxes.map(t => ({
            name: t.name,
            rate: t.rate,
            amount: subtotal * (t.rate / 100)
        }))

        onSubmit({
            projectId,
            quoteNumber,
            validUntil,
            terms,
            saleType,
            billToId: billToCustomer?.id || null,
            shipToId: shipToCustomer?.id || null,
            taxDetails: JSON.stringify(taxDetails),
            items,
            comment
        })
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] flex flex-col">
            <div className="bg-white/80 backdrop-blur-md border-b border-gray-200 px-8 py-5 shadow-sm flex justify-between items-center sticky top-0 z-30">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                    >
                        <Save className="w-4 h-4 mr-2" />
                        {loading ? 'Saving...' : 'Save Quote'}
                    </button>
                </div>
            </div>

            <div className="flex-1 p-8 max-w-6xl mx-auto w-full space-y-10">

                {/* Sale Type & Partners */}
                <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-xl shadow-blue-500/5 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-75">
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Quote Details</h3>
                        <div className="flex gap-6 border-b pb-4 mb-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="saleType"
                                    value="DIRECT"
                                    checked={saleType === "DIRECT"}
                                    onChange={() => handleSaleTypeChange("DIRECT")}
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
                                    onChange={() => handleSaleTypeChange("PARTNER")}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                />
                                <span className="text-sm font-medium text-gray-700">Partner Quote</span>
                            </label>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                                className="w-full border-gray-200 rounded-lg shadow-sm px-4 py-2.5 border focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-gray-900"
                                value={validUntil}
                                onChange={(e) => setValidUntil(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Quotation Number</label>
                            <input
                                type="text"
                                className="w-full border-gray-200 rounded-lg shadow-sm px-4 py-2.5 border focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-gray-900 font-mono font-bold"
                                value={quoteNumber}
                                onChange={(e) => setQuoteNumber(e.target.value)}
                                placeholder="e.g. QT-2305-123"
                                required
                            />
                            {!initialData && <p className="text-[10px] text-blue-600 mt-1 uppercase tracking-wider font-extrabold flex items-center gap-1"><span className="w-1 h-1 bg-blue-600 rounded-full animate-pulse"></span> Autogenerated preview</p>}
                        </div>
                    </div>

                    <div className="mt-6">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Quotation Comments / Notes</label>
                        <textarea
                            className="w-full border-gray-200 rounded-xl text-sm p-4 border focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-gray-900 bg-gray-50/30"
                            rows={3}
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Add internal notes or customer-facing comments for this quote..."
                        />
                    </div>
                </div>

                {/* Add Items Section */}
                <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-xl shadow-blue-500/5 transition-all hover:shadow-2xl hover:shadow-blue-500/10 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
                    <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <Plus className="w-5 h-5 text-blue-500" />
                        Add Line Items
                    </h3>
                    <div className="space-y-4">
                        <label className="block text-sm font-medium text-gray-700">Quick Select Product</label>
                        <div className="flex flex-col md:flex-row gap-4 items-start">
                            <div className="flex-1 w-full">
                                <ProductSelector
                                    onProductSelect={handleProductSelect}
                                    excludeProductIds={[]}
                                    type="all"
                                    placeholder="Search by brand, model, or SKU..."
                                />
                                <p className="text-[11px] text-gray-400 mt-2 italic px-1">Select from products to auto-populate fields</p>
                            </div>
                            <div className="flex gap-3 shrink-0">
                                <button
                                    onClick={addCustomItem}
                                    className="text-sm text-blue-600 hover:text-blue-700 font-bold flex items-center bg-blue-50/50 px-5 py-2.5 rounded-xl border border-blue-100 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Custom Item
                                </button>
                                <button
                                    onClick={addChargeItem}
                                    className="text-sm text-orange-600 hover:text-orange-700 font-bold flex items-center bg-orange-50/50 px-5 py-2.5 rounded-xl border border-orange-100 hover:bg-orange-600 hover:text-white transition-all shadow-sm"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Charge
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Line Items Table */}
                <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-xl shadow-blue-500/5 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
                    <h3 className="text-xl font-bold text-gray-900 mb-6">Quotation Items</h3>
                    {items.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
                            No items added. Select products above.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-b">
                                        <th className="pb-2 pl-2 w-5/12">Description</th>
                                        <th className="pb-2 w-20 text-center">Qty</th>
                                        <th className="pb-2 w-32 text-right">Unit Price</th>
                                        <th className="pb-2 w-20 text-center">Disc %</th>
                                        <th className="pb-2 w-32 text-right">Total</th>
                                        <th className="pb-2 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {items.map((item) => (
                                        <tr key={item.id} className="group">
                                            <td className="py-3 px-2 align-top">
                                                <textarea
                                                    className="w-full border-gray-300 rounded-md text-sm p-2 border focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                                                    rows={2}
                                                    value={item.description}
                                                    onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                                    placeholder="Item description..."
                                                />
                                                {item.productId && item.availableStock !== undefined && (
                                                    <div className="flex items-center gap-2 mt-1 px-1">
                                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${item.availableStock > 0 ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                                                            In Stock: {item.availableStock}
                                                        </span>
                                                        {item.locations && (
                                                            <span className="text-[10px] text-gray-500 flex items-center gap-1">
                                                                <Box className="h-2.5 w-2.5" />
                                                                {item.locations}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                                {mode === 'SERVICE' && (
                                                    <div className="col-span-2 space-y-3 mt-2">
                                                        <div className="flex items-center justify-between">
                                                            <p className="text-[10px] uppercase font-extrabold text-blue-600 tracking-tight">Covered Equipment Details</p>
                                                            <button
                                                                type="button"
                                                                onClick={() => addEquipment(item.id)}
                                                                className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100 font-bold hover:bg-blue-600 hover:text-white transition-all shadow-sm flex items-center gap-1"
                                                            >
                                                                <Plus className="w-2 h-2" /> Add Module
                                                            </button>
                                                        </div>
                                                        {item.details && item.details.length > 0 ? (
                                                            <div className="space-y-2">
                                                                {item.details.map((detail, dIdx) => (
                                                                    <div key={dIdx} className="bg-blue-50/30 p-2 rounded border border-blue-100 relative group/detail">
                                                                        {item.details!.length > 1 && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => removeEquipment(item.id, dIdx)}
                                                                                className="absolute -top-1.5 -right-1.5 bg-white text-red-500 rounded-full border border-red-100 p-0.5 opacity-0 group-hover/detail:opacity-100 transition-opacity shadow-sm"
                                                                            >
                                                                                <X className="w-3 h-3" />
                                                                            </button>
                                                                        )}
                                                                        <div className="grid grid-cols-2 gap-2">
                                                                            <input
                                                                                type="text"
                                                                                className="w-full border-gray-200 rounded text-[11px] p-1 border focus:ring-blue-500 focus:border-blue-500 bg-white"
                                                                                value={detail.modelName}
                                                                                onChange={(e) => updateEquipment(item.id, dIdx, 'modelName', e.target.value)}
                                                                                placeholder="Product/Model Name"
                                                                            />
                                                                            <input
                                                                                type="text"
                                                                                className="w-full border-gray-200 rounded text-[11px] p-1 border focus:ring-blue-500 focus:border-blue-500 bg-white"
                                                                                value={detail.serialNumbers}
                                                                                onChange={(e) => updateEquipment(item.id, dIdx, 'serialNumbers', e.target.value)}
                                                                                placeholder="Serial Number(s)"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <p className="text-[10px] text-gray-400 italic">No equipment modules specified</p>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-3 px-2 align-top">
                                                <input
                                                    type="number"
                                                    className="w-full border-gray-300 rounded-md text-sm p-2 border text-center focus:ring-blue-500 focus:border-blue-500 text-gray-900"
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
                                                    <FormattedNumberInput
                                                        value={item.unitPrice}
                                                        onChange={(val) => updateItem(item.id, 'unitPrice', val)}
                                                        className="w-full border-gray-300 rounded-md text-sm p-2 pl-10 border text-right focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                                                    />
                                                </div>
                                            </td>
                                            <td className="py-3 px-2 align-top">
                                                <input
                                                    type="number"
                                                    className="w-full border-gray-300 rounded-md text-sm p-2 border text-center focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                                                    min="0"
                                                    max="100"
                                                    value={item.discount || 0}
                                                    onChange={(e) => updateItem(item.id, 'discount', Number(e.target.value))}
                                                />
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
                                <div className="w-72 space-y-2">
                                    <div className="flex justify-between text-sm text-gray-600">
                                        <span className="font-medium">Subtotal</span>
                                        <span>{formatCurrency(subtotal)}</span>
                                    </div>

                                    {/* Tax Selection */}
                                    <div className="border-t border-b border-gray-100 py-3 my-2 space-y-2">
                                        <div className="flex justify-between items-center mb-2">
                                            <p className="text-xs font-semibold text-gray-500 uppercase">Applicable Taxes</p>
                                        </div>

                                        {availableTaxes.length === 0 && <p className="text-xs text-gray-400 italic">No taxes configured</p>}

                                        {availableTaxes.map(tax => (
                                            <div key={tax.id} className="flex items-center justify-between py-1 group hover:bg-gray-50 rounded px-1 -mx-1">
                                                <label className="flex items-center text-sm text-gray-600 cursor-pointer select-none flex-1">
                                                    <input
                                                        type="checkbox"
                                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                                                        checked={selectedTaxIds.includes(tax.id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedTaxIds([...selectedTaxIds, tax.id])
                                                            } else {
                                                                setSelectedTaxIds(selectedTaxIds.filter(id => id !== tax.id))
                                                            }
                                                        }}
                                                    />
                                                    {tax.name} <span className="text-gray-400 ml-1">({tax.rate}%)</span>
                                                </label>
                                                <span className="text-sm font-medium text-gray-700">
                                                    {selectedTaxIds.includes(tax.id)
                                                        ? formatCurrency(subtotal * (tax.rate / 100))
                                                        : '-'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex justify-between text-lg font-bold text-gray-900 border-t border-gray-200 pt-3">
                                        <span>Total</span>
                                        <span className="text-blue-600">{formatCurrency(total)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Terms */}
                <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-xl shadow-blue-500/5 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-500">
                    <label className="block text-xl font-bold text-gray-900 mb-4">Terms & Conditions</label>
                    <textarea
                        className="w-full border-gray-200 rounded-xl text-sm font-mono bg-gray-50/50 p-4 border text-gray-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                        rows={8}
                        value={terms}
                        onChange={(e) => setTerms(e.target.value)}
                    />
                    <p className="mt-2 text-xs text-gray-400">These terms will be displayed at the bottom of the printed PDF document.</p>
                </div>
            </div>
        </div>
    )
}
