"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState, useRef } from "react"
import { Bell, ChevronDown, LogOut, User, ChevronRight } from "lucide-react"

// ---------------------------------------------------------------------------
// Breadcrumb helpers
// ---------------------------------------------------------------------------

const SEGMENT_LABELS: Record<string, string> = {
    dashboard: "Dashboard",
    inventory: "Inventory",
    crm: "CRM",
    projects: "Projects",
    quotes: "Quotes",
    new: "New",
    edit: "Edit",
    transactions: "Transactions",
    "delivery-orders": "Delivery Orders",
    "purchase-orders": "Purchase Orders",
    invoices: "Invoices",
    services: "Services",
    build: "Build Queue",
    backorders: "Backorders",
    "stock-movements": "Stock Movements",
    locations: "Locations",
    warranty: "Warranty & RMA",
    reports: "Reports",
    "audit-logs": "Audit Logs",
    messaging: "Messaging",
    settings: "Settings",
    pipeline: "Pipeline",
    insights: "Insights",
    "sales-rep": "Sales Rep",
    print: "Print",
    lookup: "Lookup",
    "inventory-valuation": "Inventory Valuation",
    "stock-movement": "Stock Movement",
    sales: "Sales",
    purchase: "Purchase",
    profitability: "Profitability",
    backorder: "Backorder",
    location: "Location",
}

// IDs that are pure UUID-ish — show them abbreviated as a badge
const UUID_REGEX = /^[0-9a-f-]{20,}$/i

function buildBreadcrumbs(pathname: string): { label: string; href: string; isId: boolean }[] {
    const parts = pathname.split("/").filter(Boolean)
    const crumbs: { label: string; href: string; isId: boolean }[] = []

    let path = ""
    for (const part of parts) {
        path += `/${part}`
        const isId = UUID_REGEX.test(part)
        const label = isId
            ? part.substring(0, 8).toUpperCase()  // abbreviated ID
            : (SEGMENT_LABELS[part] ?? part.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()))
        crumbs.push({ label, href: path, isId })
    }

    return crumbs
}

// ---------------------------------------------------------------------------
// Role → color
// ---------------------------------------------------------------------------

const ROLE_COLOR: Record<string, string> = {
    admin: "bg-red-600",
    administrator: "bg-red-600",
    manager: "bg-violet-600",
    sales: "bg-blue-600",
    technician: "bg-amber-600",
    warehouse: "bg-teal-600",
}

function roleColor(role: string): string {
    const key = role?.toLowerCase()
    return ROLE_COLOR[key] ?? "bg-gray-700"
}

function initials(name: string): string {
    return name
        ?.split(" ")
        .map(n => n[0])
        .join("")
        .toUpperCase()
        .substring(0, 2) ?? "U"
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface TopBarUser {
    id: string
    name: string
    email: string
    role: string
}

export default function TopBar() {
    const pathname = usePathname()
    const router = useRouter()

    const [user, setUser] = useState<TopBarUser | null>(null)
    const [permissions, setPermissions] = useState<string[]>([])
    const [unread, setUnread] = useState(0)
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        fetchUser()
        fetchUnread()

        const interval = setInterval(fetchUnread, 15000) // Poll every 15s
        return () => clearInterval(interval)
    }, [])

    // Close dropdown on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false)
            }
        }
        if (dropdownOpen) document.addEventListener("mousedown", handleClick)
        return () => document.removeEventListener("mousedown", handleClick)
    }, [dropdownOpen])

    async function fetchUser() {
        try {
            const res = await fetch("/api/auth/me")
            if (res.ok) {
                const data = await res.json()
                setUser(data.user)
                setPermissions(data.permissions ?? [])
            }
        } catch { /* silent */ }
    }

    async function fetchUnread() {
        try {
            const res = await fetch("/api/messaging/count")
            if (res.ok) {
                const data = await res.json()
                setUnread(data.total ?? 0)
            }
        } catch { /* silent */ }
    }

    async function handleSignOut() {
        try {
            await fetch("/api/auth/logout", { method: "POST" })
        } finally {
            router.push("/login")
        }
    }

    const crumbs = buildBreadcrumbs(pathname ?? "")
    // Limit visible crumbs to avoid overflow — always keep first and last 2
    const visibleCrumbs = crumbs.length > 4
        ? [crumbs[0], { label: "…", href: "", isId: false }, ...crumbs.slice(-2)]
        : crumbs

    return (
        <header className="flex h-16 items-center justify-between px-6 bg-white border-b border-gray-200 shadow-sm print:hidden z-20 flex-shrink-0">

            {/* ── Left: Breadcrumb ── */}
            <nav className="flex items-center gap-1 min-w-0">
                {visibleCrumbs.map((crumb, idx) => (
                    <span key={idx} className="flex items-center gap-1 min-w-0">
                        {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />}
                        {crumb.href && crumb.label !== "…" ? (
                            <button
                                onClick={() => router.push(crumb.href)}
                                className={`text-sm font-medium truncate max-w-[180px] transition-colors ${idx === visibleCrumbs.length - 1
                                    ? "text-gray-900 cursor-default"
                                    : "text-gray-400 hover:text-gray-600"
                                    } ${crumb.isId ? "font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded" : ""}`}
                            >
                                {crumb.label}
                            </button>
                        ) : (
                            <span className="text-gray-400 text-sm">{crumb.label}</span>
                        )}
                    </span>
                ))}
            </nav>

            {/* ── Right: Bell + User ── */}
            <div className="flex items-center gap-3 flex-shrink-0">

                {/* Notification Bell */}
                <button
                    onClick={() => router.push("/dashboard/messaging")}
                    className="relative p-2 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
                    title="Messages"
                >
                    <Bell className="w-5 h-5" />
                    {unread > 0 && (
                        <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white leading-none">
                            {unread > 9 ? "9+" : unread}
                        </span>
                    )}
                </button>

                {/* Divider */}
                <div className="w-px h-6 bg-gray-200" />

                {/* User Avatar + Dropdown */}
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setDropdownOpen(prev => !prev)}
                        className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors group"
                    >
                        {/* Avatar circle */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${user ? roleColor(user.role) : "bg-gray-400"}`}>
                            {user ? initials(user.name) : "…"}
                        </div>

                        {/* Name + Role */}
                        <div className="hidden md:flex flex-col items-start">
                            <span className="text-sm font-semibold text-gray-800 leading-tight">
                                {user?.name ?? "Loading…"}
                            </span>
                            <span className="text-[10px] text-gray-400 leading-tight capitalize">
                                {user?.role?.toLowerCase() ?? ""}
                            </span>
                        </div>

                        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
                    </button>

                    {/* Dropdown menu */}
                    {dropdownOpen && (
                        <div className="absolute right-0 top-full mt-1 w-60 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                            {/* Profile Header */}
                            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                                <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
                                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                                <span className={`mt-1.5 inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full text-white ${user ? roleColor(user.role) : "bg-gray-400"}`}>
                                    {user?.role}
                                </span>
                            </div>

                            {/* Actions */}
                            <div className="py-1">
                                {/* Settings — only shown if user has settings:manage permission */}
                                {(permissions.includes('all:manage') || permissions.includes('settings:manage')) && (
                                    <button
                                        onClick={() => { setDropdownOpen(false); router.push("/dashboard/settings") }}
                                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                        <User className="w-4 h-4 text-gray-400" />
                                        Profile &amp; Settings
                                    </button>
                                )}
                                <div className="border-t border-gray-100 mt-1 pt-1">
                                    <button
                                        onClick={handleSignOut}
                                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        Sign Out
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    )
}
