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

const HDD_CAPACITIES = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22]
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

    // Recommendations Logic
    const suggestedModels = useMemo(() => {
        if (!Array.isArray(nasModels)) return [];
        return nasModels.filter(m => {
            const totalMaxBays = m.bays + (m.maxExpansionUnitsSupported * m.expansionBaysPerUnit);
            const matchesBays = totalMaxBays >= driveCount;
            const matchesForm = formFactor === "Any" || m.formFactor === formFactor;
            const matchesPower = powerType === "Any" || m.powerType === powerType;
            const matchesEth = ethernetSpeed === "Any" || (m.networkPorts?.includes(ethernetSpeed));
            const matchesDriveType = driveType === "SATA" ? m.supportsSATA : m.supportsSAS;

            return matchesBays && matchesForm && matchesPower && matchesEth && matchesDriveType;
        }).sort((a, b) => a.bays - b.bays).slice(0, 4);
    }, [nasModels, driveCount, formFactor, powerType, ethernetSpeed, driveType])

    // RAM Logic
    const requiresHighRam = results.usable > 108;

    if (loading) return <div className="p-20 text-center text-gray-400 font-black uppercase tracking-widest animate-pulse">Initializing Engine...</div>

    return (
        <div className="max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-500 pb-20 px-6">

            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm">
                <div className="flex items-center gap-6">
                    <div className="p-4 bg-blue-600 rounded-3xl shadow-xl shadow-blue-100"><Calculator className="w-10 h-10 text-white" /></div>
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Enterprise Solution Configurator</h1>
                        <p className="text-xs text-blue-600 font-black uppercase tracking-[.3em] mt-1">RAID & Hardware Engineering v2</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-2xl border border-gray-100">
                    <div className="px-4 py-2 bg-white rounded-xl shadow-sm border border-gray-100 text-center min-w-[100px]">
                        <span className="text-[10px] font-black text-gray-400 uppercase block mb-0.5">Total Raw</span>
                        <span className="text-sm font-black text-gray-900">{driveCount * driveCapacity} TB</span>
                    </div>
                    <div className="px-4 py-2 bg-white rounded-xl shadow-sm border border-gray-100 text-center min-w-[100px]">
                        <span className="text-[10px] font-black text-gray-400 uppercase block mb-0.5">Net Usable</span>
                        <span className="text-sm font-black text-blue-600">~{results.usable.toFixed(1)} TB</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

                {/* ── Drive & RAID Config ── */}
                <div className="xl:col-span-2 space-y-8">
                    <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-10">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3"><HardDrive className="w-6 h-6 text-blue-600" /><h2 className="text-xl font-black text-gray-900">Storage Parameters</h2></div>
                            <div className="flex bg-gray-100 p-1.5 rounded-2xl gap-2">
                                <button onClick={() => setDriveType("SATA")} className={cn("px-6 py-2 rounded-xl text-[10px] font-black transition-all", driveType === "SATA" ? "bg-white text-blue-600 shadow-md" : "text-gray-400")}>SATA</button>
                                <button onClick={() => setDriveType("SAS")} className={cn("px-6 py-2 rounded-xl text-[10px] font-black transition-all", driveType === "SAS" ? "bg-white text-purple-600 shadow-md" : "text-gray-400")}>SAS/DualPort</button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            {/* Drive Count */}
                            <div className="space-y-6">
                                <label className="flex justify-between items-end mb-2">
                                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Number of Drives</span>
                                    <span className="text-2xl font-black text-blue-600">{driveCount} Disks</span>
                                </label>
                                <input type="range" min="1" max="100" step="1" value={driveCount} onChange={(e) => setDriveCount(parseInt(e.target.value))} className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                                <div className="flex flex-wrap gap-2">
                                    {[2, 4, 8, 12, 16, 24, 36, 60].map(b => (
                                        <button key={b} onClick={() => setDriveCount(b)} className={cn("px-4 py-1.5 rounded-full text-[10px] font-black transition-all", driveCount === b ? "bg-blue-600 text-white shadow-lg" : "bg-gray-50 text-gray-400 hover:bg-gray-100 transition-colors")}>{b}D</button>
                                    ))}
                                </div>
                            </div>

                            {/* Drive Capacity */}
                            <div className="space-y-6">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-4">Drive Capacity</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {HDD_CAPACITIES.map(c => (
                                        <button key={c} onClick={() => setDriveCapacity(c)} className={cn("py-2.5 rounded-xl text-[11px] font-black border transition-all", driveCapacity === c ? "bg-gray-900 text-white border-gray-900 shadow-lg" : "bg-white text-gray-500 border-gray-100 hover:border-gray-300")}>{c}TB</button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-gray-50">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-4">Select RAID Level</label>
                            <div className="flex flex-wrap gap-3">
                                {RAID_LEVELS.map(r => (
                                    <button key={r} onClick={() => setSelectedRAID(r)} className={cn("px-6 py-3 rounded-2xl text-[11px] font-black transition-all flex items-center gap-2", selectedRAID === r ? "bg-blue-600 text-white shadow-xl shadow-blue-100" : "bg-white border border-gray-100 text-gray-400 hover:border-blue-200")}>
                                        {selectedRAID === r && <Check className="w-3.5 h-3.5" />}
                                        {r}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* RAID Visualization */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col justify-center min-h-[400px]">
                            <h3 className="text-sm font-black text-gray-900 mb-6 flex items-center gap-2"><PieIcon className="w-4 h-4 text-emerald-500" /> Space Distribution</h3>
                            <div className="h-[250px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={chartData} innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                                            {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />)}
                                        </Pie>
                                        <RechartsTooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-gray-900 text-white p-10 rounded-[2.5rem] shadow-xl space-y-8 flex flex-col justify-between">
                            <div>
                                <h3 className="text-xl font-black mb-1">Architecture Summary</h3>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Storage Efficiency & Protection</p>
                            </div>
                            <div className="space-y-6">
                                <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/10">
                                    <div className="flex items-center gap-3"><Zap className="w-5 h-5 text-amber-400" /> <span className="text-xs font-bold text-gray-300">Failure Tolerance</span></div>
                                    <span className="text-xs font-black text-white">
                                        {selectedRAID === 'RAID 6' || selectedRAID === 'SHR-2' ? '2 Disks' : (selectedRAID === 'RAID 0' ? 'None' : '1 Disk')}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/10">
                                    <div className="flex items-center gap-3"><ShieldCheck className="w-5 h-5 text-blue-400" /> <span className="text-xs font-bold text-gray-300">Max Vol Capacity</span></div>
                                    <span className="text-xs font-black text-white">{requiresHighRam ? 'Requires 32GB RAM Upgrade' : 'Standard (2-4GB)'}</span>
                                </div>
                                <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/10">
                                    <div className="flex items-center gap-3"><ArrowRight className="w-5 h-5 text-emerald-400" /> <span className="text-xs font-bold text-gray-300">Usable Total</span></div>
                                    <span className="text-2xl font-black text-emerald-400">{results.usable.toFixed(1)} TB</span>
                                </div>
                            </div>
                            {requiresHighRam && (
                                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex gap-3">
                                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                                    <p className="text-[10px] font-bold text-amber-500 leading-tight uppercase">Volumes exceeding 108TB require at least 32GB of RAM for optimal performance.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Hardware Configurator Sidebar ── */}
                <div className="space-y-8">
                    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-8">
                        <div className="flex items-center gap-3"><Settings className="w-5 h-5 text-gray-400" /><h2 className="text-lg font-black text-gray-900">Hardware Filters</h2></div>

                        <div className="space-y-6">
                            {/* Form Factor */}
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">Form Factor</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {["Any", "Desktop", "Rackmount"].map(f => (
                                        <button key={f} onClick={() => setFormFactor(f as any)} className={cn("py-2 rounded-xl text-[10px] font-black border transition-all", formFactor === f ? "bg-gray-900 text-white border-gray-900" : "bg-gray-50 text-gray-500 border-transparent hover:border-gray-200 transition-colors")}>{f}</button>
                                    ))}
                                </div>
                            </div>

                            {/* Power */}
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">Power Supply</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {["Any", "Standard", "Redundant"].map(p => (
                                        <button key={p} onClick={() => setPowerType(p as any)} className={cn("py-2 rounded-xl text-[10px] font-black border transition-all", powerType === p ? "bg-gray-900 text-white border-gray-900" : "bg-gray-50 text-gray-500 border-transparent hover:border-gray-200 transition-colors")}>{p}</button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Recommendations */}
                    <div className="space-y-4">
                        <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[.3em] px-4">Suggested HW Scenarios</h3>
                        {suggestedModels.length > 0 ? suggestedModels.map((m, idx) => {
                            const expansionsNeeded = Math.ceil(Math.max(0, driveCount - m.bays) / (m.expansionBaysPerUnit || 1));
                            const ramDeficit = requiresHighRam && m.maxRamGB < 32;

                            return (
                                <div key={m.id} className={cn("bg-white p-6 rounded-3xl border border-gray-100 shadow-sm transition-all group animate-in slide-in-from-right-4 duration-300", ramDeficit ? "opacity-50 grayscale pointer-events-none" : "hover:border-blue-300")} style={{ animationDelay: `${idx * 100}ms` }}>
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h4 className="text-lg font-black text-gray-900 group-hover:text-blue-600 transition-colors uppercase">{m.modelName}</h4>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{m.series} Series • Base {m.bays} Bays</p>
                                        </div>
                                        <div className="p-2 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all"><ChevronRight className="w-5 h-5" /></div>
                                    </div>

                                    {expansionsNeeded > 0 && (
                                        <div className="mb-4 p-3 bg-blue-50/50 rounded-xl border border-blue-100 flex items-center gap-2">
                                            <PlusCircle className="w-4 h-4 text-blue-600" />
                                            <span className="text-[10px] font-black text-blue-700 uppercase tracking-tight">Requires {expansionsNeeded}× {m.expansionUnitModel} Units</span>
                                        </div>
                                    )}

                                    <div className="flex flex-wrap gap-2">
                                        <span className="px-2.5 py-1 bg-gray-50 rounded-lg text-[9px] font-black text-gray-500 uppercase flex items-center gap-1.5"><Box className="w-3 h-3" /> {m.formFactor}</span>
                                        <span className="px-2.5 py-1 bg-gray-50 rounded-lg text-[9px] font-black text-gray-500 uppercase flex items-center gap-1.5"><Cpu className="w-3 h-3" /> {m.defaultRamGB}-{m.maxRamGB}G RAM</span>
                                        <span className="px-2.5 py-1 bg-gray-50 rounded-lg text-[9px] font-black text-gray-500 uppercase flex items-center gap-1.5"><Network className="w-3 h-3" /> {m.networkPorts || 'Dual Lan'}</span>
                                    </div>

                                    {ramDeficit && (
                                        <div className="mt-3 flex items-center gap-2 text-red-500">
                                            <AlertTriangle className="w-3.5 h-3.5" />
                                            <span className="text-[9px] font-black uppercase tracking-tight">Does not support 32GB RAM (Required)</span>
                                        </div>
                                    )}

                                    <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Activity className="w-3 h-3 text-emerald-500" />
                                            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Target: {m.targetMarket}</span>
                                        </div>
                                        {m.supportsSAS && <span className="text-[9px] font-black text-purple-600 bg-purple-50 px-2 py-0.5 rounded uppercase">Dual-Port SAS</span>}
                                    </div>
                                </div>
                            )
                        }) : (
                            <div className="bg-white/50 border border-dashed border-gray-200 rounded-[2rem] p-10 text-center">
                                <AlertTriangle className="w-6 h-6 text-gray-300 mx-auto mb-3" />
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-relaxed">No matching hardware supports this specific disk/raid configuration.</p>
                            </div>
                        )}
                    </div>

                    {/* Add-ons Advice */}
                    <div className="bg-blue-600 p-8 rounded-[2rem] shadow-xl text-white space-y-4">
                        <div className="flex items-center gap-3"><ShieldCheck className="w-6 h-6" /> <h4 className="text-lg font-black leading-tight">Sync Recommended Drives</h4></div>
                        <p className="text-xs font-medium text-blue-100 leading-relaxed uppercase tracking-tight">Match your {driveType} selection with:</p>
                        <ul className="space-y-2">
                            <li className="flex items-center gap-2 text-[10px] font-black"><Check className="w-4 h-4 text-emerald-300" /> {driveType === 'SATA' ? 'NAS SPEC: Synology Plus HAT3300' : 'ENTERPRISE: Synology HAS5300 SAS'}</li>
                            <li className="flex items-center gap-2 text-[10px] font-black"><Check className="w-4 h-4 text-emerald-300" /> {driveType === 'SATA' ? 'ENT SPEC: Synology Enterprise HAT5300' : 'DUAL PORT: For SA/UC Series Compatibility'}</li>
                        </ul>
                    </div>
                </div>
            </div>

        </div>
    )
}
