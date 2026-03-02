"use client"

import { useState, useEffect } from "react"
import {
    Database, Plus, Edit2, Trash2, Save, X,
    HardDrive, Cpu, Box, Zap, Network, ShieldCheck,
    Search, LayoutGrid, List, AlertCircle, Link, PlusCircle
} from "lucide-react"
import { cn } from "@/lib/utils"

interface NASModel {
    id: string
    modelName: string
    bays: number
    expansionUnitModel: string | null
    expansionBaysPerUnit: number
    maxExpansionUnitsSupported: number
    defaultRamGB: number
    maxRamGB: number
    supportsSATA: boolean
    supportsSAS: boolean
    formFactor: string
    powerType: string
    networkPorts: string | null
    series: string | null
    targetMarket: string | null
    productId?: string | null // Linked product ID
}

interface Product {
    id: string
    model: string
    name: string
    sku: string
    brand: string
    category: string
}

export default function NASFeaturesPage() {
    const [models, setModels] = useState<NASModel[]>([])
    const [inventory, setInventory] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [isEditing, setIsEditing] = useState<string | null>(null)
    const [managingCompatibility, setManagingCompatibility] = useState<NASModel | null>(null)
    const [compatItems, setCompatItems] = useState<any[]>([])
    const [formData, setFormData] = useState<Partial<NASModel>>({})
    const [allProducts, setAllProducts] = useState<Product[]>([])
    const [showProductSearch, setShowProductSearch] = useState(false)
    const [productSearchTerm, setProductSearchTerm] = useState("")

    useEffect(() => {
        fetchModels()
        fetchInventory()
        fetchAllProducts()
    }, [])

    async function fetchInventory() {
        try {
            const res = await fetch('/api/crm/nas-models/inventory')
            if (res.ok) {
                const data = await res.json()
                setInventory(data)
            }
        } catch (error) {
            console.error("Failed to fetch inventory")
        }
    }

    async function fetchAllProducts() {
        try {
            const res = await fetch('/api/products?limit=1000') // Fetch all for selection
            if (res.ok) {
                const data = await res.json()
                setAllProducts(data.items || [])
            }
        } catch (error) {
            console.error("Failed to fetch all products")
        }
    }

    async function fetchModels() {
        try {
            const res = await fetch('/api/crm/nas-models')
            if (res.ok) {
                const data = await res.json()
                setModels(data)
            }
        } catch (error) {
            alert("Failed to fetch models")
        } finally {
            setLoading(false)
        }
    }

    async function handleSave() {
        try {
            const res = await fetch('/api/crm/nas-models', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })
            if (res.ok) {
                alert(formData.id ? "Model updated" : "Model created")
                setIsEditing(null)
                fetchModels()
            } else {
                const err = await res.json()
                alert(err.error || "Save failed")
            }
        } catch (error) {
            alert("An error occurred")
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Are you sure you want to delete this model?")) return
        try {
            const res = await fetch(`/api/crm/nas-models?id=${id}`, { method: 'DELETE' })
            if (res.ok) {
                alert("Model deleted")
                fetchModels()
            }
        } catch (error) {
            alert("Delete failed")
        }
    }

    async function fetchCompatibility(modelId: string) {
        try {
            const res = await fetch(`/api/crm/nas-models/${modelId}/compatibility`)
            if (res.ok) {
                const data = await res.json()
                setCompatItems(data)
            }
        } catch (error) {
            console.error("Failed to fetch compatibility")
        }
    }

    async function handleAddCompatibility(productId: string, category: string) {
        if (!managingCompatibility) return
        try {
            const res = await fetch(`/api/crm/nas-models/${managingCompatibility.id}/compatibility`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId, category })
            })
            if (res.ok) {
                fetchCompatibility(managingCompatibility.id)
                setShowProductSearch(false)
            }
        } catch (error) {
            alert("Failed to add compatibility")
        }
    }

    async function handleRemoveCompatibility(productId: string) {
        if (!managingCompatibility) return
        if (!confirm("Remove this compatibility mapping?")) return
        try {
            const res = await fetch(`/api/crm/nas-models/${managingCompatibility.id}/compatibility?productId=${productId}`, {
                method: 'DELETE'
            })
            if (res.ok) {
                fetchCompatibility(managingCompatibility.id)
            }
        } catch (error) {
            alert("Failed to remove compatibility")
        }
    }

    const filteredModels = Array.isArray(models) ? models.filter(m =>
        m.modelName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.series?.toLowerCase().includes(searchTerm.toLowerCase())
    ) : []

    if (loading) return <div className="p-10 text-center animate-pulse text-gray-400">Loading configurations...</div>

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20 px-4">

            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-600 rounded-lg shadow-sm"><Database className="w-8 h-8 text-white" /></div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">NAS Feature Management</h1>
                        <p className="text-sm text-gray-500 font-medium">Configure Hardware Specifications for Solutions</p>
                    </div>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <button
                        onClick={() => {
                            setFormData({
                                modelName: "", bays: 2, expansionBaysPerUnit: 0, maxExpansionUnitsSupported: 0,
                                defaultRamGB: 2, maxRamGB: 32, supportsSATA: true, supportsSAS: false,
                                formFactor: "Desktop", powerType: "Standard"
                            })
                            setIsEditing('NEW')
                        }}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all shadow-sm"
                    >
                        <Plus className="w-4 h-4" /> Add Model
                    </button>
                </div>
            </div>

            {/* ── Search & Filter ── */}
            <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                <input
                    type="text"
                    placeholder="Search Synology models (e.g. DS1821+, RS2423...)"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-white rounded-xl border border-gray-200 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-medium transition-all"
                />
            </div>

            {/* ── Model List (Table View) ── */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-200">
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Model & Series</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Bays (Inc. Exp.)</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">RAM Capacity</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Form & Power</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Compatibility</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredModels.map(model => (
                                <tr key={model.id} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-gray-900 leading-none uppercase">{model.modelName}</span>
                                            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-1">{model.series || 'Standard'} Series</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 rounded-lg border border-gray-100">
                                            <Box className="w-3.5 h-3.5 text-blue-500" />
                                            <span className="text-sm font-semibold text-gray-900">{model.bays}</span>
                                            {model.maxExpansionUnitsSupported > 0 && (
                                                <span className="text-[10px] text-gray-400 font-medium">
                                                    + {model.maxExpansionUnitsSupported * model.expansionBaysPerUnit}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 rounded-lg border border-gray-100">
                                            <Cpu className="w-3.5 h-3.5 text-amber-500" />
                                            <span className="text-sm font-semibold text-gray-900">{model.defaultRamGB}G</span>
                                            <span className="text-[10px] text-gray-400 font-medium ml-1">Max {model.maxRamGB}G</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded text-[9px] font-bold uppercase",
                                                    model.formFactor === 'Rackmount' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                                )}>
                                                    {model.formFactor}
                                                </span>
                                                <span className="text-[10px] font-medium text-gray-500">{model.powerType}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex gap-2">
                                            <span className={cn("px-2 py-0.5 border rounded text-[9px] font-bold uppercase tracking-tight", model.supportsSATA ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-gray-50 text-gray-300 border-gray-200")}>SATA</span>
                                            <span className={cn("px-2 py-0.5 border rounded text-[9px] font-bold uppercase tracking-tight font-black", model.supportsSAS ? "bg-purple-50 text-purple-600 border-purple-100 shadow-sm" : "bg-gray-50 text-gray-300 border-gray-200 opacity-50")}>SAS</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => {
                                                    setManagingCompatibility(model);
                                                    fetchCompatibility(model.id);
                                                }}
                                                className="p-2 text-gray-400 hover:bg-emerald-50 hover:text-emerald-600 rounded-lg transition-all"
                                                title="Manage Compatibility"
                                            >
                                                <Link className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => { setFormData(model); setIsEditing(model.id); }}
                                                className="p-2 text-gray-400 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-all"
                                                title="Edit Model"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(model.id)}
                                                className="p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all"
                                                title="Delete Model"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredModels.length === 0 && (
                    <div className="p-12 text-center">
                        <div className="inline-flex p-4 bg-gray-50 rounded-full mb-4">
                            <AlertCircle className="w-8 h-8 text-gray-300" />
                        </div>
                        <h3 className="text-gray-900 font-bold">No models found</h3>
                        <p className="text-gray-500 text-sm mt-1">Try adjusting your search or add a new configuration.</p>
                    </div>
                )}
            </div>

            {/* ── Edit Modal ── */}
            {isEditing && (
                <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl relative animate-in zoom-in-95 duration-200 p-8 max-h-[90vh] overflow-y-auto">
                        <button onClick={() => setIsEditing(null)} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 transition-colors"><X className="w-5 h-5" /></button>

                        <div className="mb-8">
                            <h2 className="text-xl font-bold text-gray-900">{formData.id ? 'Edit NAS Model' : 'New NAS Model'}</h2>
                            <p className="text-sm text-gray-500 mt-1">Specify detailed hardware capabilities for engineering solutions.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Basic Info */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b pb-2">Identification</h3>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-700">Link to Inventory (Optional)</label>
                                    <select
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        onChange={(e) => {
                                            const p = inventory.find(i => i.id === e.target.value);
                                            if (p) setFormData({ ...formData, modelName: p.model || p.name });
                                        }}
                                    >
                                        <option value="">-- Select Synology Product --</option>
                                        {inventory.map(prod => (
                                            <option key={prod.id} value={prod.id}>{prod.model || prod.name} ({prod.sku})</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-700">Model Name</label>
                                    <input value={formData.modelName} onChange={e => setFormData({ ...formData, modelName: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500 transition-all uppercase" placeholder="DS1821+" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-gray-700">Form Factor</label>
                                        <select value={formData.formFactor} onChange={e => setFormData({ ...formData, formFactor: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium">
                                            <option value="Desktop">Desktop</option>
                                            <option value="Rackmount">Rackmount</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-gray-700">Power Supply</label>
                                        <select value={formData.powerType} onChange={e => setFormData({ ...formData, powerType: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium">
                                            <option value="Standard">Standard</option>
                                            <option value="Redundant">Redundant</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-700">Series Line</label>
                                    <input value={formData.series || ''} onChange={e => setFormData({ ...formData, series: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium uppercase" placeholder="Plus, XS+, SA..." />
                                </div>
                            </div>

                            {/* Storage & Expansion */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b pb-2">Storage & Expansion</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-gray-700">Internal Bays</label>
                                        <input type="number" value={formData.bays} onChange={e => setFormData({ ...formData, bays: parseInt(e.target.value) })} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-gray-700">Exp. Unit Model</label>
                                        <input value={formData.expansionUnitModel || ''} onChange={e => setFormData({ ...formData, expansionUnitModel: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium uppercase" placeholder="DX517, RX1223..." />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-gray-700">Bays Per Unit</label>
                                        <input type="number" value={formData.expansionBaysPerUnit} onChange={e => setFormData({ ...formData, expansionBaysPerUnit: parseInt(e.target.value) })} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-gray-700">Max Units</label>
                                        <input type="number" value={formData.maxExpansionUnitsSupported} onChange={e => setFormData({ ...formData, maxExpansionUnitsSupported: parseInt(e.target.value) })} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-gray-700">Default RAM</label>
                                        <input type="number" value={formData.defaultRamGB} onChange={e => setFormData({ ...formData, defaultRamGB: parseFloat(e.target.value) })} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-gray-700">Max RAM</label>
                                        <input type="number" value={formData.maxRamGB} onChange={e => setFormData({ ...formData, maxRamGB: parseFloat(e.target.value) })} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 flex flex-wrap gap-4 items-center justify-between border-t pt-6">
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <input type="checkbox" checked={formData.supportsSATA} onChange={e => setFormData({ ...formData, supportsSATA: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                    <span className="text-xs font-medium text-gray-600 group-hover:text-gray-900">SATA Support</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <input type="checkbox" checked={formData.supportsSAS} onChange={e => setFormData({ ...formData, supportsSAS: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                    <span className="text-xs font-medium text-gray-600 group-hover:text-gray-900">SAS Support</span>
                                </label>
                            </div>

                            <div className="flex gap-3">
                                <button onClick={() => setIsEditing(null)} className="px-6 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800 transition-colors">
                                    Cancel
                                </button>
                                <button onClick={handleSave} className="px-8 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all shadow-sm flex items-center gap-2">
                                    <Save className="w-4 h-4" /> Save Model
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* ── Compatibility Modal ── */}
            {managingCompatibility && (
                <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl relative animate-in zoom-in-95 duration-200 p-8 flex flex-col max-h-[90vh]">
                        <button onClick={() => setManagingCompatibility(null)} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 transition-colors"><X className="w-5 h-5" /></button>

                        <div className="mb-6">
                            <h2 className="text-xl font-bold text-gray-900 uppercase tracking-tight">{managingCompatibility.modelName} Compatibility</h2>
                            <p className="text-sm text-gray-500 mt-1 font-medium">Link compatible drives, RAM, and modules from your inventory.</p>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                            {['DRIVE', 'RAM', 'NETWORK', 'EXPANSION'].map(cat => {
                                const items = compatItems.filter(i => i.category === cat);
                                return (
                                    <div key={cat} className="space-y-3">
                                        <div className="flex justify-between items-center border-b pb-2">
                                            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{cat}S</h3>
                                            <button
                                                onClick={() => { setShowProductSearch(true); setProductSearchTerm(""); }}
                                                className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 uppercase"
                                            >
                                                <PlusCircle className="w-3 h-3" /> Add {cat}
                                            </button>
                                        </div>
                                        {items.length > 0 ? (
                                            <div className="space-y-2">
                                                {items.map(item => (
                                                    <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100 group/item">
                                                        <div>
                                                            <p className="text-sm font-bold text-gray-900">{item.product.name}</p>
                                                            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-tight">{item.product.sku} • {item.product.brand}</p>
                                                        </div>
                                                        <button onClick={() => handleRemoveCompatibility(item.productId)} className="p-2 text-gray-300 hover:text-red-600 transition-colors opacity-0 group-hover/item:opacity-100"><Trash2 className="w-3.5 h-3.5" /></button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-gray-400 italic py-2">No {cat.toLowerCase()}s mapped.</p>
                                        )}
                                    </div>
                                )
                            })}
                        </div>

                        {showProductSearch && (
                            <div className="absolute inset-0 bg-white rounded-2xl p-8 flex flex-col z-10 animate-in fade-in duration-200">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="font-bold text-gray-900">Select Compatible Product</h3>
                                    <button onClick={() => setShowProductSearch(false)} className="p-2 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                                </div>
                                <div className="relative mb-4">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        autoFocus
                                        type="text"
                                        placeholder="Search inventory by Name or SKU..."
                                        value={productSearchTerm}
                                        onChange={e => setProductSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="flex-1 overflow-y-auto space-y-2">
                                    {allProducts
                                        .filter(p => p.name.toLowerCase().includes(productSearchTerm.toLowerCase()) || p.sku.toLowerCase().includes(productSearchTerm.toLowerCase()))
                                        .slice(0, 50)
                                        .map(prod => (
                                            <div key={prod.id} className="p-4 hover:bg-gray-50 rounded-xl border border-gray-100 cursor-pointer transition-all flex justify-between items-center group">
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900 uppercase tracking-tight">{prod.name}</p>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{prod.sku} • {prod.brand} • {prod.category}</p>
                                                </div>
                                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {['DRIVE', 'RAM', 'NETWORK', 'EXPANSION'].map(cat => (
                                                        <button
                                                            key={cat}
                                                            onClick={() => handleAddCompatibility(prod.id, cat)}
                                                            className="px-2 py-1 bg-white border border-gray-200 text-[8px] font-bold text-gray-600 rounded hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all uppercase"
                                                        >
                                                            As {cat}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ))
                                    }
                                    {allProducts.length === 0 && <p className="text-center text-gray-400 py-10 italic">No products found in inventory.</p>}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
