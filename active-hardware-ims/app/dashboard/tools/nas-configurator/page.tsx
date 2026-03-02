"use client"

import { useState, useMemo, useEffect } from "react"
import {
    Database, HardDrive, LayoutDashboard, Settings, Info,
    Calculator, Server, Cpu, Network, ShieldCheck,
    AlertTriangle, Check, ChevronRight, PieChart as PieIcon,
    ArrowRight, Box, Zap, DollarSign, Activity, PlusCircle
} from "lucide-react"
import { cn } from "@/lib/utils"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from "recharts"

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
                        <span className="text-[9px] font-bold text-gray-400 uppercase block leading-tight">Total Raw</span>
                        <span className="text-xs font-bold text-gray-900">{driveCount * driveCapacity} TB</span>
                    </div>
                    <div className="px-3 py-1 bg-white rounded-md shadow-sm border border-gray-100 text-center min-w-[80px]">
                        <span className="text-[9px] font-bold text-gray-400 uppercase block leading-tight">Net Usable</span>
                        <span className="text-xs font-bold text-blue-600">~{results.usable.toFixed(1)} TB</span>
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
                                <button onClick={() => setDriveType("SATA")} className={cn("px-5 py-1.5 rounded-md text-[10px] font-bold transition-all", driveType === "SATA" ? "bg-white text-blue-600 shadow-sm border border-gray-200" : "text-gray-400 border border-transparent")}>SATA</button>
                                <button onClick={() => setDriveType("SAS")} className={cn("px-5 py-1.5 rounded-md text-[10px] font-bold transition-all", driveType === "SAS" ? "bg-white text-purple-600 shadow-sm border border-gray-200" : "text-gray-400 border border-transparent")}>SAS/DualPort</button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
                            {/* Drive Count */}
                            <div className="md:col-span-2 space-y-3">
                                <label className="flex justify-between items-end">
                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Quantity</span>
                                    <span className="text-lg font-bold text-blue-600">{driveCount} Bays</span>
                                </label>
                                <div className="flex items-center gap-4">
                                    <input type="range" min="1" max="100" step="1" value={driveCount} onChange={(e) => setDriveCount(parseInt(e.target.value))} className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                                    <div className="flex gap-1">
                                        {[2, 4, 8, 12, 16, 24].map(b => (
                                            <button key={b} onClick={() => setDriveCount(b)} className={cn("px-2 py-0.5 rounded text-[8px] font-bold transition-all border", driveCount === b ? "bg-blue-600 text-white border-blue-600" : "bg-gray-50 text-gray-500 border-gray-200")}>{b}</button>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center min-h-[350px]">
                            <h3 className="text-sm font-bold text-gray-900 mb-6 flex items-center gap-2 tracking-tight"><PieIcon className="w-4 h-4 text-emerald-500" /> Space Distribution</h3>
                            <div className="h-[220px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={chartData} innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                                            {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />)}
                                        </Pie>
                                        <RechartsTooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-gray-900 text-white p-8 rounded-xl shadow-lg space-y-6 flex flex-col justify-between">
                            <div>
                                <h3 className="text-lg font-bold mb-0.5">Architecture Summary</h3>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Efficiency & Protection</p>
                            </div>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center bg-white/5 p-3.5 rounded-xl border border-white/10">
                                    <div className="flex items-center gap-2.5"><Zap className="w-4 h-4 text-amber-400" /> <span className="text-xs font-semibold text-gray-300">Failure Tolerance</span></div>
                                    <span className="text-xs font-bold text-white">
                                        {selectedRAID === 'RAID 6' || selectedRAID === 'SHR-2' ? '2 Disks' : (selectedRAID === 'RAID 0' ? 'None' : '1 Disk')}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center bg-white/5 p-3.5 rounded-xl border border-white/10">
                                    <div className="flex items-center gap-2.5"><ShieldCheck className="w-4 h-4 text-blue-400" /> <span className="text-xs font-semibold text-gray-300">Volume Memory</span></div>
                                    <span className="text-xs font-bold text-white tracking-tight">{requiresHighRam ? 'Requires 32GB RAM' : 'Standard 2GB+'}</span>
                                </div>
                                <div className="flex justify-between items-center bg-white/5 p-3.5 rounded-xl border border-white/10">
                                    <div className="flex items-center gap-2.5"><ArrowRight className="w-4 h-4 text-emerald-400" /> <span className="text-xs font-semibold text-gray-300">Usable Space</span></div>
                                    <span className="text-xl font-bold text-emerald-400">{results.usable.toFixed(1)} TB</span>
                                </div>
                            </div>
                            {requiresHighRam && (
                                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex gap-2.5">
                                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                                    <p className="text-[10px] font-semibold text-amber-500 uppercase leading-tight">Volumes &gt; 108TB require 32GB RAM upgrade.</p>
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
                                <div className="grid grid-cols-3 gap-1.5">
                                    {["Any", "Desktop", "Rackmount"].map(f => (
                                        <button key={f} onClick={() => setFormFactor(f as any)} className={cn("py-1.5 rounded-lg text-[10px] font-bold border transition-all", formFactor === f ? "bg-gray-900 text-white border-gray-900" : "bg-gray-50 text-gray-500 border-transparent hover:border-gray-300")}>{f}</button>
                                    ))}
                                </div>
                            </div>

                            {/* Power */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block ml-0.5">Power Supply</label>
                                <div className="grid grid-cols-3 gap-1.5">
                                    {["Any", "Standard", "Redundant"].map(p => (
                                        <button key={p} onClick={() => setPowerType(p as any)} className={cn("py-1.5 rounded-lg text-[10px] font-bold border transition-all", powerType === p ? "bg-gray-900 text-white border-gray-900" : "bg-gray-50 text-gray-500 border-transparent hover:border-gray-300")}>{p}</button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Recommendations */}
                    <div className="space-y-3">
                        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[.25em] px-2">Hardware Suggestions</h3>
                        {suggestedModels.length > 0 ? suggestedModels.map((m, idx) => {
                            const expansionsNeeded = Math.ceil(Math.max(0, driveCount - m.bays) / (m.expansionBaysPerUnit || 1));
                            const ramDeficit = requiresHighRam && m.maxRamGB < 32;

                            return (
                                <div key={m.id} className={cn("bg-white p-5 rounded-xl border border-gray-200 shadow-sm transition-all group animate-in slide-in-from-right-4 duration-300", ramDeficit ? "opacity-50 grayscale pointer-events-none" : "hover:border-blue-400")} style={{ animationDelay: `${idx * 100}ms` }}>
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h4 className="text-md font-bold text-gray-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{m.modelName}</h4>
                                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{m.series} Series • Base {m.bays} Bays</p>
                                        </div>
                                        <div className="p-1.5 bg-gray-50 text-gray-400 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-all border border-gray-100"><ChevronRight className="w-4 h-4" /></div>
                                    </div>

                                    {expansionsNeeded > 0 && (
                                        <div className="mb-3 p-2 bg-blue-50/50 rounded-lg border border-blue-100 flex items-center gap-1.5">
                                            <PlusCircle className="w-3.5 h-3.5 text-blue-600" />
                                            <span className="text-[9px] font-bold text-blue-700 uppercase">Requires {expansionsNeeded}× {m.expansionUnitModel} Units</span>
                                        </div>
                                    )}

                                    <div className="flex flex-wrap gap-1.5">
                                        <span className="px-2 py-0.5 bg-gray-50 border border-gray-100 rounded-md text-[8px] font-bold text-gray-500 uppercase flex items-center gap-1"><Box className="w-2.5 h-2.5" /> {m.formFactor}</span>
                                        <span className="px-2 py-0.5 bg-gray-50 border border-gray-100 rounded-md text-[8px] font-bold text-gray-500 uppercase flex items-center gap-1"><Cpu className="w-2.5 h-2.5" /> {m.defaultRamGB}-{m.maxRamGB}G RAM</span>
                                        <span className="px-2 py-0.5 bg-gray-50 border border-gray-100 rounded-md text-[8px] font-bold text-gray-500 uppercase flex items-center gap-1 font-black"><Network className="w-2.5 h-2.5" /> {m.networkPorts?.split(',')[0]}</span>
                                    </div>

                                    {ramDeficit && (
                                        <div className="mt-2 flex items-center gap-1.5 text-red-500">
                                            <AlertTriangle className="w-3 h-3" />
                                            <span className="text-[8px] font-bold uppercase">RAM Limit Reached (32GB Required)</span>
                                        </div>
                                    )}

                                    <div className="mt-3 pt-3 border-t border-gray-50 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5">
                                                <Activity className="w-3 h-3 text-emerald-500" />
                                                <span className="text-[8px] font-bold text-emerald-600 uppercase">Tier: {m.targetMarket}</span>
                                            </div>
                                            {m.supportsSAS && <span className="text-[8px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100 uppercase">SAS</span>}
                                        </div>

                                        {/* Compatible Hardware */}
                                        {compatibilityMap[m.id] && compatibilityMap[m.id].length > 0 && (
                                            <div className="space-y-1.5 bg-gray-50 p-2 rounded-lg border border-gray-100">
                                                <p className="text-[7px] font-black text-gray-400 uppercase tracking-widest">Certified Hardware</p>
                                                <div className="flex flex-col gap-1">
                                                    {compatibilityMap[m.id].slice(0, 3).map(compat => (
                                                        <div key={compat.id} className="flex justify-between items-center text-[8px]">
                                                            <span className="font-bold text-gray-700 truncate mr-2">{compat.product.name}</span>
                                                            <span className="text-[7px] text-blue-600 font-bold uppercase shrink-0">{compat.category}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        }) : (
                            <div className="bg-white/50 border border-dashed border-gray-300 rounded-2xl p-8 text-center">
                                <AlertTriangle className="w-5 h-5 text-gray-300 mx-auto mb-2" />
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-relaxed">No matching hardware scenarios found for this configuration.</p>
                            </div>
                        )}
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

        </div>
    )
}
