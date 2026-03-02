"use client"

import { useState, useEffect } from "react"
import {
    Database, Plus, Edit2, Trash2, Save, X,
    HardDrive, Cpu, Box, Zap, Network, ShieldCheck,
    Search, LayoutGrid, List, AlertCircle
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
}

export default function NASFeaturesPage() {
    const [models, setModels] = useState<NASModel[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [isEditing, setIsEditing] = useState<string | null>(null) // ID or 'NEW'
    const [formData, setFormData] = useState<Partial<NASModel>>({})

    useEffect(() => {
        fetchModels()
    }, [])

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

    const filteredModels = Array.isArray(models) ? models.filter(m =>
        m.modelName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.series?.toLowerCase().includes(searchTerm.toLowerCase())
    ) : []

    if (loading) return <div className="p-10 text-center animate-pulse text-gray-400">Loading configurations...</div>

    return (
        <div className="max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-500 pb-20 px-6">

            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm">
                <div className="flex items-center gap-6">
                    <div className="p-4 bg-gray-900 rounded-3xl shadow-xl"><Database className="w-10 h-10 text-white" /></div>
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">NAS Feature Management</h1>
                        <p className="text-xs text-blue-600 font-black uppercase tracking-[.3em] mt-1">Configure Hardware Specifications</p>
                    </div>
                </div>
                <button
                    onClick={() => {
                        setFormData({
                            modelName: "", bays: 2, expansionBaysPerUnit: 0, maxExpansionUnitsSupported: 0,
                            defaultRamGB: 2, maxRamGB: 32, supportsSATA: true, supportsSAS: false,
                            formFactor: "Desktop", powerType: "Standard"
                        })
                        setIsEditing('NEW')
                    }}
                    className="flex items-center gap-3 px-8 py-4 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100"
                >
                    <Plus className="w-5 h-5" /> Add New Model
                </button>
            </div>

            {/* ── Search & Filter ── */}
            <div className="relative">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search Synology models (e.g. DS1821+, RS2423...)"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-16 pr-6 py-6 bg-white rounded-[2rem] border border-gray-100 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                />
            </div>

            {/* ── Model List ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredModels.map(model => (
                    <div key={model.id} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:border-blue-200 transition-all group">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">{model.modelName}</h3>
                                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">{model.series || 'Standard'} Series</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => { setFormData(model); setIsEditing(model.id); }} className="p-3 bg-gray-50 text-gray-400 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all"><Edit2 className="w-4 h-4" /></button>
                                <button onClick={() => handleDelete(model.id)} className="p-3 bg-gray-50 text-gray-400 rounded-xl hover:bg-red-50 hover:text-red-600 transition-all"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-gray-50 rounded-2xl space-y-1">
                                <span className="text-[9px] font-black text-gray-400 uppercase block tracking-tighter">Bays (Int + Exp)</span>
                                <div className="text-sm font-black text-gray-900 flex items-center gap-2">
                                    <Box className="w-4 h-4 text-blue-500" />
                                    {model.bays} + ({model.maxExpansionUnitsSupported} × {model.expansionBaysPerUnit})
                                </div>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-2xl space-y-1">
                                <span className="text-[9px] font-black text-gray-400 uppercase block tracking-tighter">RAM (Def / Max)</span>
                                <div className="text-sm font-black text-gray-900 flex items-center gap-2">
                                    <Cpu className="w-4 h-4 text-amber-500" />
                                    {model.defaultRamGB}G / {model.maxRamGB}G
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 flex flex-wrap gap-2">
                            <span className={cn("px-3 py-1.5 rounded-lg text-[10px] font-black uppercase", model.formFactor === 'Rackmount' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600')}>{model.formFactor}</span>
                            <span className="px-3 py-1.5 bg-gray-100 text-gray-500 rounded-lg text-[10px] font-black uppercase">{model.powerType} Power</span>
                            {model.supportsSAS && <span className="px-3 py-1.5 bg-purple-50 text-purple-600 rounded-lg text-[10px] font-black uppercase">SAS Support</span>}
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Edit Modal ── */}
            {isEditing && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-6 sm:p-10 overflow-y-auto">
                    <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl relative animate-in zoom-in-95 duration-200 p-10 max-h-[90vh] overflow-y-auto">
                        <button onClick={() => setIsEditing(null)} className="absolute top-8 right-8 p-3 bg-gray-100 text-gray-400 rounded-2xl hover:bg-gray-200 transition-all"><X className="w-6 h-6" /></button>

                        <div className="mb-10 flex items-center gap-4">
                            <div className="p-3 bg-blue-600 rounded-2xl"><Plus className="w-6 h-6 text-white" /></div>
                            <div>
                                <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">{formData.id ? 'Edit Model' : 'New NAS Model'}</h2>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Specify detailed hardware capabilities</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            {/* Basic Info */}
                            <div className="space-y-6">
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-[.3em] mb-4">Identification</h3>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase ml-1">Model Name</label>
                                    <input value={formData.modelName} onChange={e => setFormData({ ...formData, modelName: e.target.value })} className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold outline-none ring-2 ring-transparent focus:ring-blue-500 transition-all uppercase" placeholder="DS1821+" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase ml-1">Form Factor</label>
                                        <select value={formData.formFactor} onChange={e => setFormData({ ...formData, formFactor: e.target.value })} className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold">
                                            <option value="Desktop">Desktop</option>
                                            <option value="Rackmount">Rackmount</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase ml-1">Power Supply</label>
                                        <select value={formData.powerType} onChange={e => setFormData({ ...formData, powerType: e.target.value })} className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold">
                                            <option value="Standard">Standard</option>
                                            <option value="Redundant">Redundant</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase ml-1">Series Line</label>
                                    <input value={formData.series || ''} onChange={e => setFormData({ ...formData, series: e.target.value })} className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold" placeholder="Plus, XS+, SA..." />
                                </div>
                            </div>

                            {/* Storage & Expansion */}
                            <div className="space-y-6">
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-[.3em] mb-4">Storage & Expansion</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase ml-1">Internal Bays</label>
                                        <input type="number" value={formData.bays} onChange={e => setFormData({ ...formData, bays: parseInt(e.target.value) })} className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase ml-1">Exp. Unit Model</label>
                                        <input value={formData.expansionUnitModel || ''} onChange={e => setFormData({ ...formData, expansionUnitModel: e.target.value })} className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold" placeholder="DX517, RX1223..." />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase ml-1">Bays Per Unit</label>
                                        <input type="number" value={formData.expansionBaysPerUnit} onChange={e => setFormData({ ...formData, expansionBaysPerUnit: parseInt(e.target.value) })} className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase ml-1">Max Expansion Units</label>
                                        <input type="number" value={formData.maxExpansionUnitsSupported} onChange={e => setFormData({ ...formData, maxExpansionUnitsSupported: parseInt(e.target.value) })} className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold" />
                                    </div>
                                </div>
                            </div>

                            {/* Performance */}
                            <div className="space-y-6">
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-[.3em] mb-4">Performance & Memory</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase ml-1">Default RAM (GB)</label>
                                        <input type="number" value={formData.defaultRamGB} onChange={e => setFormData({ ...formData, defaultRamGB: parseFloat(e.target.value) })} className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase ml-1">Max RAM (GB)</label>
                                        <input type="number" value={formData.maxRamGB} onChange={e => setFormData({ ...formData, maxRamGB: parseFloat(e.target.value) })} className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold" />
                                    </div>
                                </div>
                                <div className="flex gap-6 mt-4">
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <input type="checkbox" checked={formData.supportsSATA} onChange={e => setFormData({ ...formData, supportsSATA: e.target.checked })} className="w-5 h-5 rounded-md border-gray-300 text-blue-600 focus:ring-blue-500" />
                                        <span className="text-[11px] font-black text-gray-600 uppercase group-hover:text-gray-900 transition-colors">SATA Support</span>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <input type="checkbox" checked={formData.supportsSAS} onChange={e => setFormData({ ...formData, supportsSAS: e.target.checked })} className="w-5 h-5 rounded-md border-gray-300 text-blue-600 focus:ring-blue-500" />
                                        <span className="text-[11px] font-black text-gray-600 uppercase group-hover:text-gray-900 transition-colors">SAS Support</span>
                                    </label>
                                </div>
                            </div>

                            {/* Connectivity */}
                            <div className="space-y-6">
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-[.3em] mb-4">Connectivity</h3>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase ml-1">Network Port Layout</label>
                                    <input value={formData.networkPorts || ''} onChange={e => setFormData({ ...formData, networkPorts: e.target.value })} className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold" placeholder="e.g. 1GbE x4, 10GbE SFP+ x2" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase ml-1">Target Market / Use Case</label>
                                    <input value={formData.targetMarket || ''} onChange={e => setFormData({ ...formData, targetMarket: e.target.value })} className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold" placeholder="e.g. Enterprise Storage, 4K Video Editing..." />
                                </div>
                            </div>
                        </div>

                        <div className="mt-12 flex gap-4">
                            <button onClick={handleSave} className="flex-1 py-5 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-2">
                                <Save className="w-5 h-5" /> Save Configuration
                            </button>
                            <button onClick={() => setIsEditing(null)} className="px-10 py-5 bg-gray-100 text-gray-500 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-gray-200 transition-all">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
