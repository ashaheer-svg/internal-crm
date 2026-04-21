"use client"

import { useState, useMemo, useEffect } from "react"
import {
    Database, HardDrive, LayoutDashboard, Settings, Info,
    Calculator, Server, Cpu, Network, ShieldCheck,
    AlertTriangle, Check, ChevronRight, PieChart as PieIcon,
    ArrowRight, Box, Zap, DollarSign, Activity, PlusCircle
} from "lucide-react"
import { cn } from "@/lib/utils"
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip as RechartsTooltip, Cell, Legend } from "recharts"

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

const HDD_CAPACITIES = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24]
const RAID_LEVELS = ["RAID 0", "RAID 1", "RAID 5", "RAID 6", "RAID 10", "SHR", "SHR-2"]

// ── Utility: RAID Calculations ─────────────────────────────────────────────
function calculateRAID(level: string, count: number, capacity: number) {
    let usable = 0;
    let redundancy = 0;
    const totalRaw = count * capacity;

    switch (level) {
        case "RAID 0":
            usable = totalRaw;
            redundancy = 0;
            break;
        case "RAID 1":
            if (count >= 2) {
                usable = capacity;
                redundancy = totalRaw - capacity;
            }
            break;
        case "RAID 5":
            if (count >= 3) {
                usable = (count - 1) * capacity;
                redundancy = capacity;
            }
            break;
        case "RAID 6":
            if (count >= 4) {
                usable = (count - 2) * capacity;
                redundancy = 2 * capacity;
            }
            break;
        case "RAID 10":
            if (count >= 4 && count % 2 === 0) {
                usable = totalRaw / 2;
                redundancy = totalRaw / 2;
            }
            break;
        case "SHR":
            if (count === 1) usable = capacity;
            else if (count === 2) { usable = capacity; redundancy = capacity; }
            else { usable = (count - 1) * capacity; redundancy = capacity; }
            break;
        case "SHR-2":
            if (count >= 4) { usable = (count - 2) * capacity; redundancy = 2 * capacity; }
            break;
    }

    return { usable, redundancy, unallocated: totalRaw - (usable + redundancy) };
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function RAIDConfiguratorPage() {
    // Model Data State
    const [nasModels, setNasModels] = useState<NASModel[]>([])
    const [compatibilityMap, setCompatibilityMap] = useState<Record<string, any[]>>({})
    const [loading, setLoading] = useState(true)

    // Config State
    const [driveCount, setDriveCount] = useState(4)
    const [driveCapacity, setDriveCapacity] = useState(12)
    const [selectedRAID, setSelectedRAID] = useState("RAID 5")
    const [driveType, setDriveType] = useState<"SATA" | "SAS">("SATA")

    // Hardware Filters
    const [formFactor, setFormFactor] = useState<"Desktop" | "Rackmount" | "Any">("Any")
    const [powerType, setPowerType] = useState<"Standard" | "Redundant" | "Any">("Any")
    const [ethernetSpeed, setEthernetSpeed] = useState<"1GbE" | "10GbE" | "Any">("Any")

    useEffect(() => {
        fetch('/api/crm/nas-models')
            .then(res => res.json())
            .then(data => {
                // Add Array.isArray check as per instruction
                if (Array.isArray(data)) {
                    setNasModels(data)
                } else {
                    console.error("API response is not an array:", data);
                    alert("Failed to load hardware specifications: Invalid data format");
                }
                setLoading(false)
            })
            .catch(err => {
                alert("Failed to load hardware specifications")
                setLoading(false)
            })
    }, [])

    // Calculations
    const results = useMemo(() =>
        calculateRAID(selectedRAID, driveCount, driveCapacity),
        [selectedRAID, driveCount, driveCapacity])

    const chartData = [
        { name: "Usable", value: results.usable, color: "#2563eb" },
        { name: "Protection", value: results.redundancy, color: "#10b981" },
        { name: "Unused", value: results.unallocated, color: "#f1f5f9" }
    ].filter(d => d.value > 0)

    const stackedBarData = [{
        name: "Storage",
        Usable: results.usable,
        Protection: results.redundancy,
        Unused: results.unallocated
    }]

    // Recommendations Logic & Compatibility Fetching
    const suggestedModels = useMemo(() => {
        if (!Array.isArray(nasModels)) return [];
        const filtered = nasModels.filter(m => {
            const totalMaxBays = m.bays + (m.maxExpansionUnitsSupported * m.expansionBaysPerUnit);
            const matchesBays = totalMaxBays >= driveCount;
            const matchesForm = formFactor === "Any" || m.formFactor === formFactor;
            const matchesPower = powerType === "Any" || m.powerType === powerType;
            const matchesEth = ethernetSpeed === "Any" || (m.networkPorts?.includes(ethernetSpeed));
            const matchesDriveType = driveType === "SATA" ? m.supportsSATA : m.supportsSAS;

            return matchesBays && matchesForm && matchesPower && matchesEth && matchesDriveType;
        }).sort((a, b) => a.bays - b.bays).slice(0, 4);

        return filtered;
    }, [nasModels, driveCount, formFactor, powerType, ethernetSpeed, driveType])

    // Fetch compatibility for suggestions
    useEffect(() => {
        suggestedModels.forEach(m => {
            if (!compatibilityMap[m.id]) {
                fetch(`/api/crm/nas-models/${m.id}/compatibility`)
                    .then(res => res.json())
                    .then(data => {
                        setCompatibilityMap(prev => ({ ...prev, [m.id]: data }))
                    })
                    .catch(() => { })
            }
        })
    }, [suggestedModels])

    // RAM Logic
    const requiresHighRam = results.usable > 108;

    if (loading) return <div className="p-20 text-center text-gray-400 font-black uppercase tracking-widest animate-pulse">Initializing Engine...</div>

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20 px-4">

            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-600 rounded-lg shadow-sm"><Calculator className="w-8 h-8 text-white" /></div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Enterprise Solution Configurator</h1>
                        <p className="text-sm text-gray-500 font-medium tracking-tight">RAID & Hardware Engineering v2</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-lg border border-gray-100">
                    <div className="px-3 py-1 bg-white rounded-md shadow-sm border border-gray-100 text-center min-w-[80px]">
                        <span className="text-[9px] font-bold text-gray-400 uppercase block leading-tight">Total Cap</span>
                        <span className="text-xs font-bold text-gray-900">{driveCount * driveCapacity} TB</span>
                    </div>
                    <div className="px-3 py-1 bg-white rounded-md shadow-sm border border-gray-100 text-center min-w-[80px]">
                        <span className="text-[9px] font-bold text-gray-400 uppercase block leading-tight">Usable Cap</span>
                        <span className="text-xs font-bold text-blue-600">~{results.usable.toFixed(1)} TB</span>
                    </div>
                    <div className="px-3 py-1 bg-white rounded-md shadow-sm border border-gray-100 text-center min-w-[80px]">
                        <span className="text-[9px] font-bold text-gray-400 uppercase block leading-tight">Formatted</span>
                        <span className="text-xs font-bold text-emerald-600">~{(results.usable * 0.9).toFixed(1)} TB</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

                {/* ── Drive & RAID Config ── */}
                <div className="xl:col-span-2 space-y-6">
                    <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm space-y-8">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3"><HardDrive className="w-6 h-6 text-blue-600" /><h2 className="text-lg font-bold text-gray-900">Storage Parameters</h2></div>
                            <div className="flex bg-gray-100 p-1 rounded-lg gap-1.5">
                                <button onClick={() => setDriveType("SATA")} className={cn("px-5 py-1.5 rounded-md text-[10px] font-bold transition-all", driveType === "SATA" ? "bg-white text-blue-600 shadow-sm border border-gray-200" : "text-gray-400 border border-transparent")}>SATA HDD</button>
                                <button onClick={() => setDriveType("SAS")} className={cn("px-5 py-1.5 rounded-md text-[10px] font-bold transition-all", driveType === "SAS" ? "bg-white text-purple-600 shadow-sm border border-gray-200" : "text-gray-400 border border-transparent")}>SAS/DualPort</button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
                            {/* Drive Count */}
                            <div className="md:col-span-2 space-y-3">
                                <label className="flex justify-between items-end">
                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Quantity</span>
                                    <span className="text-lg font-bold text-blue-600">{driveCount} Drives</span>
                                </label>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="number"
                                        min="1"
                                        max="100"
                                        value={driveCount}
                                        onChange={(e) => setDriveCount(Math.max(1, parseInt(e.target.value) || 0))}
                                        className="w-full max-w-[80px] py-2 px-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-900 text-center focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"                                    />
                                    <div className="flex flex-wrap gap-1">
                                        {[2, 4, 8, 12, 16, 24].map(b => (
                                            <button key={b} onClick={() => setDriveCount(b)} className={cn("px-2 py-1.5 rounded text-[8px] font-bold transition-all border", driveCount === b ? "bg-blue-600 text-white border-blue-600" : "bg-gray-50 text-gray-500 border-gray-200")}>{b}</button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Drive Capacity */}
                            <div className="md:col-span-2 space-y-1">
                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Disk Size</label>
                                <div className="grid grid-cols-6 gap-1.5">
                                    {HDD_CAPACITIES.map(c => (
                                        <button key={c} onClick={() => setDriveCapacity(c)} className={cn("py-1 rounded-md text-[9px] font-bold border transition-all", driveCapacity === c ? "bg-gray-900 text-white border-gray-900 shadow-sm" : "bg-white text-gray-500 border-gray-200 hover:border-gray-400")}>{c}T</button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-4">
                            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest shrink-0">RAID Mode</label>
                            <div className="flex flex-wrap gap-1.5 justify-end">
                                {RAID_LEVELS.map(r => (
                                    <button key={r} onClick={() => setSelectedRAID(r)} className={cn("px-3 py-1 rounded-md text-[9px] font-bold transition-all border", selectedRAID === r ? "bg-blue-600 text-white border-blue-600 shadow-sm" : "bg-white border-gray-200 text-gray-500 hover:border-blue-400")}>
                                        {r}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* RAID Visualization */}
                    <div className="space-y-6">
                        <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center min-h-[300px]">
                            <h3 className="text-sm font-bold text-gray-900 mb-6 flex items-center gap-2 tracking-tight"><Activity className="w-4 h-4 text-emerald-500" /> Space Distribution</h3>
                            <div className="h-[180px] w-full flex flex-col justify-center">
                                <div className="h-12 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart layout="vertical" data={stackedBarData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                                            <XAxis type="number" hide />
                                            <YAxis type="category" dataKey="name" hide />
                                            <RechartsTooltip
                                                cursor={{ fill: 'transparent' }}
                                                content={({ active, payload }) => {
                                                    if (active && payload && payload.length) {
                                                        return (
                                                            <div className="bg-white p-3 border border-gray-100 shadow-xl rounded-lg">
                                                                {payload.map((entry: any, index: number) => (
                                                                    <div key={index} className="flex items-center gap-2 text-[10px] font-bold">
                                                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                                                        <span className="text-gray-500 uppercase">{entry.name}:</span>
                                                                        <span className="text-gray-900">{Number(entry.value).toFixed(1)} TB</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                }}
                                            />
                                            <Bar dataKey="Usable" stackId="a" fill="#2563eb" radius={[6, 0, 0, 6]} />
                                            <Bar dataKey="Protection" stackId="a" fill="#10b981" />
                                            <Bar dataKey="Unused" stackId="a" fill="#e2e8f0" radius={[0, 6, 6, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
                                    <div className="flex flex-col gap-1.5 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-gray-900" />
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-tight">Total Raw</span>
                                        </div>
                                        <span className="text-xl font-black text-gray-900 leading-none">{driveCount * driveCapacity} TB</span>
                                    </div>
                                    <div className="flex flex-col gap-1.5 p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-blue-600" />
                                            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest leading-tight">Net Usable</span>
                                        </div>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-xl font-black text-blue-600 leading-none">~{results.usable.toFixed(1)} TB</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1.5 p-4 bg-emerald-50/50 rounded-xl border border-emerald-100">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest leading-tight">Formatted</span>
                                        </div>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-xl font-black text-emerald-600 leading-none">~{(results.usable * 0.9).toFixed(1)} TB</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gray-900 text-white p-8 rounded-xl shadow-lg space-y-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-lg font-bold mb-0.5">Architecture Summary</h3>
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Efficiency & Protection</p>
                                </div>
                                <div className="flex gap-4">
                                    <div className="text-right">
                                        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">Protection</p>
                                        <span className="text-xs font-bold text-white bg-white/10 px-2 py-1 rounded">
                                            {selectedRAID === 'RAID 6' || selectedRAID === 'SHR-2' ? 'Dual Sink' : (selectedRAID === 'RAID 0' ? 'None' : 'Single Sink')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/10">
                                    <div className="flex items-center gap-2.5"><Zap className="w-4 h-4 text-amber-400" /> <span className="text-xs font-semibold text-gray-300">Failure Tolerance</span></div>
                                    <span className="text-xs font-bold text-white">
                                        {selectedRAID === 'RAID 6' || selectedRAID === 'SHR-2' ? '2 Disks' : (selectedRAID === 'RAID 0' ? 'None' : '1 Disk')}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/10">
                                    <div className="flex items-center gap-2.5"><ShieldCheck className="w-4 h-4 text-blue-400" /> <span className="text-xs font-semibold text-gray-300">Volume Capacity</span></div>
                                    <span className="text-xs font-bold text-white tracking-tight">{requiresHighRam ? 'Requires 32GB RAM' : 'Standard 2GB+'}</span>
                                </div>
                            </div>
                            {requiresHighRam && (
                                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex gap-2.5">
                                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                                    <p className="text-[10px] font-semibold text-amber-500 uppercase leading-tight">Volumes &gt; 108TB require 32GB RAM upgrade to manage metadata.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Hardware Configurator Sidebar ── */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
                        <div className="flex items-center gap-2.5"><Settings className="w-4 h-4 text-gray-400" /><h2 className="text-md font-bold text-gray-900 tracking-tight">Filtering Options</h2></div>

                        <div className="space-y-5">
                            {/* Form Factor */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block ml-0.5">Form Factor</label>
                                <div className="grid grid-cols-1 gap-1.5">
                                    {["Any", "Desktop", "Rackmount"].map(f => (
                                        <button key={f} onClick={() => setFormFactor(f as any)} className={cn("py-2 px-4 rounded-lg text-[10px] font-bold border transition-all flex items-center justify-between", formFactor === f ? "bg-gray-900 text-white border-gray-900" : "bg-gray-50 text-gray-500 border-transparent hover:border-gray-300")}>
                                            {f}
                                            {formFactor === f && <Check className="w-3 h-3" />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Power */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block ml-0.5">Power Supply</label>
                                <div className="grid grid-cols-1 gap-1.5">
                                    {["Any", "Standard", "Redundant"].map(p => (
                                        <button key={p} onClick={() => setPowerType(p as any)} className={cn("py-2 px-4 rounded-lg text-[10px] font-bold border transition-all flex items-center justify-between", powerType === p ? "bg-gray-900 text-white border-gray-900" : "bg-gray-50 text-gray-500 border-transparent hover:border-gray-300")}>
                                            {p}
                                            {powerType === p && <Check className="w-3 h-3" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Add-ons Advice */}
                    <div className="bg-gray-900 p-6 rounded-xl shadow-lg text-white space-y-4 border border-gray-800">
                        <div className="flex items-center gap-2.5"><ShieldCheck className="w-5 h-5 text-blue-400" /> <h4 className="text-md font-bold leading-tight">Recommended Drives</h4></div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Sync your {driveType} selection with:</p>
                        <ul className="space-y-2">
                            <li className="flex items-center gap-2 text-[10px] font-bold"><Check className="w-3.5 h-3.5 text-emerald-400" /> {driveType === 'SATA' ? 'Plus HAT3300' : 'Enterprise HAS5300'}</li>
                            <li className="flex items-center gap-2 text-[10px] font-bold"><Check className="w-3.5 h-3.5 text-emerald-400" /> {driveType === 'SATA' ? 'HAT5300 Enterprise' : 'High-Density SAS Spec'}</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* ── Hardware Suggestions (Full Width) ── */}
            <div className="space-y-4">
                <div className="flex items-center gap-3 px-2">
                    <Server className="w-5 h-5 text-blue-600" />
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-[.15em]">Hardware Solutions & Suggested Assemblies</h3>
                </div>

                {suggestedModels.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4">
                        {suggestedModels.map((m, idx) => {
                            const expansionsNeeded = Math.ceil(Math.max(0, driveCount - m.bays) / (m.expansionBaysPerUnit || 1));
                            const ramDeficit = requiresHighRam && m.maxRamGB < 32;

                            return (
                                <div key={m.id} className={cn("bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden transition-all group animate-in slide-in-from-bottom-4 duration-500", ramDeficit ? "opacity-60 grayscale pointer-events-none" : "hover:border-blue-400 hover:shadow-md")} style={{ animationDelay: `${idx * 100}ms` }}>
                                    <div className="flex flex-col lg:flex-row">
                                        {/* Model Info Header */}
                                        <div className="lg:w-1/3 p-6 bg-gray-50/50 border-b lg:border-b-0 lg:border-r border-gray-100 flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="px-2 py-0.5 bg-blue-600 text-[8px] font-black text-white rounded uppercase tracking-widest">{m.series} Series</span>
                                                    <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Base {m.bays} Drives</span>
                                                </div>
                                                <h4 className="text-xl font-black text-gray-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight leading-none mb-1">{m.modelName}</h4>
                                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{m.targetMarket} Tier Solution</p>
                                            </div>

                                            <div className="mt-6 flex flex-wrap gap-2">
                                                <span className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-[9px] font-bold text-gray-600 uppercase flex items-center gap-1.5 shadow-sm"><Box className="w-3 h-3 text-blue-500" /> {m.formFactor}</span>
                                                <span className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-[9px] font-bold text-gray-600 uppercase flex items-center gap-1.5 shadow-sm"><Cpu className="w-3 h-3 text-purple-500" /> {m.defaultRamGB}-{m.maxRamGB}G RAM</span>
                                            </div>
                                        </div>

                                        {/* Technical Assembly Detail */}
                                        <div className="flex-1 p-6 space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                <div className="space-y-4">
                                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-[.2em]">Technical Specification</p>
                                                    <div className="space-y-3">
                                                        <div className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl">
                                                            <div className="flex items-center gap-3">
                                                                <div className="p-2 bg-blue-50 rounded-lg"><HardDrive className="w-4 h-4 text-blue-500" /></div>
                                                                <div>
                                                                    <p className="text-[8px] font-bold text-gray-400 uppercase">Primary Storage</p>
                                                                    <span className="text-xs font-bold text-gray-900">{driveCount}× {driveCapacity}TB {driveType} Drives</span>
                                                                </div>
                                                            </div>
                                                            <span className="text-xs font-black text-gray-900">{(driveCount * driveCapacity)}TB Raw</span>
                                                        </div>

                                                        {expansionsNeeded > 0 && (
                                                            <div className="flex items-center justify-between p-3 bg-blue-50/30 border border-blue-100 rounded-xl">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="p-2 bg-blue-100/50 rounded-lg"><PlusCircle className="w-4 h-4 text-blue-600" /></div>
                                                                    <div>
                                                                        <p className="text-[8px] font-bold text-blue-400 uppercase">Expansion Kits</p>
                                                                        <span className="text-xs font-bold text-blue-700">{expansionsNeeded}× {m.expansionUnitModel} Units</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        <div className="flex items-center justify-between p-3 bg-emerald-50/30 border border-emerald-100 rounded-xl">
                                                            <div className="flex items-center gap-3">
                                                                <div className="p-2 bg-emerald-100/50 rounded-lg"><ShieldCheck className="w-4 h-4 text-emerald-500" /></div>
                                                                <div>
                                                                    <p className="text-[8px] font-bold text-emerald-400 uppercase">Architecture</p>
                                                                    <span className="text-xs font-bold text-emerald-700">{selectedRAID} Configuration</span>
                                                                </div>
                                                            </div>
                                                            <span className="text-xs font-black text-emerald-600">~{results.usable.toFixed(1)}TB Net</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-4">
                                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-[.2em]">Validated Add-ons</p>
                                                    {(() => {
                                                        const data = compatibilityMap[m.id] as any;
                                                        if (!data) {
                                                            return (
                                                                <div className="p-6 border border-dashed border-gray-200 rounded-xl text-center">
                                                                    <span className="text-[9px] font-bold text-gray-400 uppercase animate-pulse">Checking Compatibility...</span>
                                                                </div>
                                                            )
                                                        }
                                                        if (data.error) {
                                                            return (
                                                                <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-center">
                                                                    <span className="text-[9px] font-bold text-red-500 uppercase">Load Error</span>
                                                                </div>
                                                            )
                                                        }
                                                        if (Array.isArray(data) && data.length > 0) {
                                                            return (
                                                                <div className="grid grid-cols-1 gap-2">
                                                                    {data.slice(0, 3).map(compat => (
                                                                        <div key={compat.id} className="flex items-center justify-between p-2.5 bg-gray-50 border border-gray-100 rounded-lg">
                                                                            <div className="flex items-center gap-2">
                                                                                <Check className="w-3 h-3 text-blue-500" />
                                                                                <span className="text-[10px] font-bold text-gray-700 truncate max-w-[150px]">{compat.product.name}</span>
                                                                            </div>
                                                                            <span className="text-[8px] font-black text-blue-600 uppercase bg-white px-2 py-0.5 rounded border border-blue-100 shadow-sm">{compat.category}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )
                                                        }
                                                        return (
                                                            <div className="p-6 border border-dashed border-gray-200 rounded-xl text-center">
                                                                <span className="text-[9px] font-bold text-gray-400 uppercase">None Available</span>
                                                            </div>
                                                        )
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="bg-white border border-dashed border-gray-300 rounded-3xl p-16 text-center">
                        <AlertTriangle className="w-8 h-8 text-gray-300 mx-auto mb-4" />
                        <h4 className="text-lg font-bold text-gray-400 uppercase tracking-widest mb-2">System Mismatch</h4>
                        <p className="text-sm text-gray-300 max-w-md mx-auto leading-relaxed">The current drive quantity exceeds the technical limits of our database models. Adjust filters or lower drive count.</p>
                    </div>
                )}
            </div>

        </div>
    )
}
