"use client"

import { useState, useMemo } from "react"
import {
    Database, HardDrive, LayoutDashboard, Settings, Info,
    Calculator, Server, Cpu, Network, ShieldCheck,
    AlertTriangle, Check, ChevronRight, PieChart as PieIcon,
    ArrowRight, Box, Zap, DollarSign, Activity
} from "lucide-react"
import { cn } from "@/lib/utils"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from "recharts"

// ── Synology Model Knowledge Base ──────────────────────────────────────────
const SYNOLOGY_MODELS = [
    { model: "DS223j", bays: 2, form: "Desktop", power: "Standard", series: "J", ethernet: ["1GbE"], target: "Home/Basic" },
    { model: "DS224+", bays: 2, form: "Desktop", power: "Standard", series: "Plus", ethernet: ["1GbE"], target: "Home/SOHO" },
    { model: "DS723+", bays: 2, form: "Desktop", power: "Standard", series: "Plus", ethernet: ["1GbE", "10GbE Opt"], target: "Advanced/SOHO" },
    { model: "DS423", bays: 4, form: "Desktop", power: "Standard", series: "Value", ethernet: ["1GbE"], target: "Small Office" },
    { model: "DS923+", bays: 4, form: "Desktop", power: "Standard", series: "Plus", ethernet: ["1GbE", "10GbE Opt"], target: "Business" },
    { model: "DS1522+", bays: 5, form: "Desktop", power: "Standard", series: "Plus", ethernet: ["1GbE", "10GbE Opt"], target: "Business/VMS" },
    { model: "DS1621+", bays: 6, form: "Desktop", power: "Standard", series: "Plus", ethernet: ["1GbE"], target: "Business/SQL" },
    { model: "DS1821+", bays: 8, form: "Desktop", power: "Standard", series: "Plus", ethernet: ["1GbE"], target: "Enterprise Edge" },
    { model: "RS1221+", bays: 8, form: "Rackmount", power: "Standard", series: "Plus", ethernet: ["1GbE"], target: "Rack/SOHO" },
    { model: "RS1221RP+", bays: 8, form: "Rackmount", power: "Redundant", series: "Plus", ethernet: ["1GbE"], target: "Rack/Mission Critical" },
    { model: "RS2423+", bays: 12, form: "Rackmount", power: "Standard", series: "Plus", ethernet: ["1GbE", "10GbE"], target: "Business/Storage" },
    { model: "RS2423RP+", bays: 12, form: "Rackmount", power: "Redundant", series: "Plus", ethernet: ["1GbE", "10GbE"], target: "Rack/Datacenter" },
    { model: "RS3621xs+", bays: 12, form: "Rackmount", power: "Redundant", series: "XS+", ethernet: ["10GbE"], target: "Enterprise Performance" },
    { model: "RS4021xs+", bays: 16, form: "Rackmount", power: "Redundant", series: "XS+", ethernet: ["10GbE"], target: "Enterprise Storage" },
]

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
    // Config State
    const [driveCount, setDriveCount] = useState(4)
    const [driveCapacity, setDriveCapacity] = useState(12)
    const [selectedRAID, setSelectedRAID] = useState("RAID 5")

    // Hardware Filters
    const [formFactor, setFormFactor] = useState<"Desktop" | "Rackmount" | "Any">("Any")
    const [powerType, setPowerType] = useState<"Standard" | "Redundant" | "Any">("Any")
    const [ethernetSpeed, setEthernetSpeed] = useState<"1GbE" | "10GbE" | "Any">("Any")

    // Calculations
    const results = useMemo(() =>
        calculateRAID(selectedRAID, driveCount, driveCapacity),
        [selectedRAID, driveCount, driveCapacity])

    const chartData = [
        { name: "Usable", value: results.usable, color: "#2563eb" },
        { name: "Protection", value: results.redundancy, color: "#10b981" },
        { name: "Unused", value: results.unallocated, color: "#f1f5f9" }
    ].filter(d => d.value > 0)

    // Recommendations
    const suggestedModels = useMemo(() => {
        return SYNOLOGY_MODELS.filter(m => {
            const matchesBays = m.bays >= driveCount;
            const matchesForm = formFactor === "Any" || m.form === formFactor;
            const matchesPower = powerType === "Any" || m.power === powerType;
            const matchesEth = ethernetSpeed === "Any" || m.ethernet.some(e => e.includes(ethernetSpeed));
            return matchesBays && matchesForm && matchesPower && matchesEth;
        }).sort((a, b) => a.bays - b.bays).slice(0, 3);
    }, [driveCount, formFactor, powerType, ethernetSpeed])

    return (
        <div className="max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-500 pb-20 px-6">

            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm">
                <div className="flex items-center gap-6">
                    <div className="p-4 bg-blue-600 rounded-3xl shadow-xl shadow-blue-100"><Calculator className="w-10 h-10 text-white" /></div>
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">NAS Solution Configurator</h1>
                        <p className="text-xs text-blue-600 font-black uppercase tracking-[.3em] mt-1">Enterprise Storage Design Tool</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-2xl border border-gray-100">
                    <div className="px-4 py-2 bg-white rounded-xl shadow-sm border border-gray-100">
                        <span className="text-[10px] font-black text-gray-400 uppercase block mb-0.5">Total Raw</span>
                        <span className="text-sm font-black text-gray-900">{driveCount * driveCapacity} TB</span>
                    </div>
                    <div className="px-4 py-2 bg-white rounded-xl shadow-sm border border-gray-100">
                        <span className="text-[10px] font-black text-gray-400 uppercase block mb-0.5">Net Usable</span>
                        <span className="text-sm font-black text-blue-600">~{results.usable.toFixed(1)} TB</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

                {/* ── Drive & RAID Config ── */}
                <div className="xl:col-span-2 space-y-8">
                    <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-10">
                        <div className="flex items-center gap-3"><HardDrive className="w-6 h-6 text-blue-600" /><h2 className="text-xl font-black text-gray-900">Storage Parameters</h2></div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            {/* Drive Count */}
                            <div className="space-y-6">
                                <label className="flex justify-between items-end mb-2">
                                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Number of Drives</span>
                                    <span className="text-2xl font-black text-blue-600">{driveCount} Bays</span>
                                </label>
                                <input type="range" min="1" max="16" step="1" value={driveCount} onChange={(e) => setDriveCount(parseInt(e.target.value))} className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                                <div className="flex flex-wrap gap-2">
                                    {[2, 4, 5, 8, 12, 16].map(b => (
                                        <button key={b} onClick={() => setDriveCount(b)} className={cn("px-4 py-1.5 rounded-full text-[10px] font-black transition-all", driveCount === b ? "bg-blue-600 text-white shadow-lg" : "bg-gray-50 text-gray-400 hover:bg-gray-100")}>{b}B</button>
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
                            <p className="mt-4 text-[10px] text-gray-400 font-bold leading-relaxed px-1">
                                {selectedRAID === 'SHR' && "SHR: Synology Hybrid RAID. Optimizes mixed drive sizes. Provides 1-disk redundancy."}
                                {selectedRAID === 'RAID 5' && "RAID 5: Balanced performance and protection. Uses 1 disk for parity. Min 3 drives."}
                                {selectedRAID === 'RAID 6' && "RAID 6: Enhanced protection. Uses 2 disks for parity. Can survive 2 drive failures. Min 4 drives."}
                            </p>
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
                            <div className="flex justify-center gap-6 mt-4">
                                {chartData.map(d => (
                                    <div key={d.name} className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                                        <span className="text-[10px] font-black text-gray-500 uppercase">{d.name}: {d.value}TB</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-gray-900 text-white p-10 rounded-[2.5rem] shadow-xl space-y-8 flex flex-col justify-between">
                            <div>
                                <h3 className="text-xl font-black mb-1">Configuration Overview</h3>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">System Architecture Summary</p>
                            </div>
                            <div className="space-y-6">
                                <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/10">
                                    <div className="flex items-center gap-3"><Database className="w-5 h-5 text-blue-400" /> <span className="text-xs font-bold text-gray-300">RAID Protocol</span></div>
                                    <span className="text-xs font-black text-white">{selectedRAID}</span>
                                </div>
                                <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/10">
                                    <div className="flex items-center gap-3"><Zap className="w-5 h-5 text-amber-400" /> <span className="text-xs font-bold text-gray-300">Failure Tolerance</span></div>
                                    <span className="text-xs font-black text-white">
                                        {selectedRAID === 'RAID 6' || selectedRAID === 'SHR-2' ? '2 Disks' : (selectedRAID === 'RAID 0' ? 'None' : '1 Disk')}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/10">
                                    <div className="flex items-center gap-3"><ArrowRight className="w-5 h-5 text-emerald-400" /> <span className="text-xs font-bold text-gray-300">Usable Storage</span></div>
                                    <span className="text-lg font-black text-emerald-400">{results.usable} TB</span>
                                </div>
                            </div>
                            <button className="w-full py-4 bg-blue-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all">Download Specs</button>
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
                                        <button key={f} onClick={() => setFormFactor(f as any)} className={cn("py-2 rounded-xl text-[10px] font-black border transition-all", formFactor === f ? "bg-gray-900 text-white border-gray-900" : "bg-gray-50 text-gray-500 border-transparent hover:border-gray-200")}>{f}</button>
                                    ))}
                                </div>
                            </div>

                            {/* Power */}
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">Power Supply</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {["Any", "Standard", "Redundant"].map(p => (
                                        <button key={p} onClick={() => setPowerType(p as any)} className={cn("py-2 rounded-xl text-[10px] font-black border transition-all", powerType === p ? "bg-gray-900 text-white border-gray-900" : "bg-gray-50 text-gray-500 border-transparent hover:border-gray-200")}>{p}</button>
                                    ))}
                                </div>
                            </div>

                            {/* Ethernet */}
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">Min Network Speed</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {["Any", "1GbE", "10GbE"].map(e => (
                                        <button key={e} onClick={() => setEthernetSpeed(e as any)} className={cn("py-2 rounded-xl text-[10px] font-black border transition-all", ethernetSpeed === e ? "bg-gray-900 text-white border-gray-900" : "bg-gray-50 text-gray-500 border-transparent hover:border-gray-200")}>{e}</button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Recommendations */}
                    <div className="space-y-4">
                        <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[.3em] px-4">Recommended NAS Models</h3>
                        {suggestedModels.length > 0 ? suggestedModels.map((m, idx) => (
                            <div key={m.model} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:border-blue-300 transition-all group animate-in slide-in-from-right-4 duration-300" style={{ animationDelay: `${idx * 100}ms` }}>
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h4 className="text-lg font-black text-gray-900 group-hover:text-blue-600 transition-colors uppercase">{m.model}</h4>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{m.series} Series • {m.bays} Bays</p>
                                    </div>
                                    <div className="p-2 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all"><ChevronRight className="w-5 h-5" /></div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <span className="px-2.5 py-1 bg-gray-50 rounded-lg text-[9px] font-black text-gray-500 uppercase flex items-center gap-1.5"><Box className="w-3 h-3" /> {m.form}</span>
                                    <span className="px-2.5 py-1 bg-gray-50 rounded-lg text-[9px] font-black text-gray-500 uppercase flex items-center gap-1.5"><Zap className="w-3 h-3" /> {m.power}</span>
                                    <span className="px-2.5 py-1 bg-gray-50 rounded-lg text-[9px] font-black text-gray-500 uppercase flex items-center gap-1.5"><Network className="w-3 h-3" /> {m.ethernet.join("/")}</span>
                                </div>
                                <div className="mt-4 pt-4 border-t border-gray-50 flex items-center gap-2">
                                    <Activity className="w-3 h-3 text-emerald-500" />
                                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Ideal for: {m.target}</span>
                                </div>
                            </div>
                        )) : (
                            <div className="bg-white/50 border border-dashed border-gray-200 rounded-[2rem] p-10 text-center">
                                <AlertTriangle className="w-6 h-6 text-gray-300 mx-auto mb-3" />
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No matching models for these exact specs</p>
                            </div>
                        )}
                    </div>

                    {/* Add-ons Advice */}
                    <div className="bg-blue-600 p-8 rounded-[2rem] shadow-xl text-white space-y-4">
                        <div className="flex items-center gap-3"><ShieldCheck className="w-6 h-6" /> <h4 className="text-lg font-black leading-tight">Sync Recommended Drives</h4></div>
                        <p className="text-xs font-medium text-blue-100 leading-relaxed uppercase tracking-tight">For 24/7 reliability, match these models with:</p>
                        <ul className="space-y-2">
                            <li className="flex items-center gap-2 text-[10px] font-black"><Check className="w-4 h-4 text-emerald-300" /> NAS GRADE: HAT3300 (IronWolf equivalent)</li>
                            <li className="flex items-center gap-2 text-[10px] font-black"><Check className="w-4 h-4 text-emerald-300" /> ENTERPRISE: HAT5300 (Exos equivalent)</li>
                        </ul>
                    </div>
                </div>
            </div>

        </div>
    )
}
