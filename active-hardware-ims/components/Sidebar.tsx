"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
    LayoutDashboard,
    Package,
    MapPin,
    ClipboardList,
    Settings,
    ScanBarcode,
    Receipt,
    ArrowRightLeft,
    Users,
    FileText,
    Calendar,
    ChevronLeft,
    ChevronRight,
    BarChart3,
    Search,
    Mail,
    Hammer,
    ChevronDown
} from "lucide-react"

interface NavItem {
    name: string
    href: string
    icon: any
    permission?: string
    submenu?: NavItem[]
}

const navigation: NavItem[] = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "General Lookup", href: "/dashboard/warranty/lookup", icon: Search, permission: 'general_lookup:read' },
    { name: "Inventory", href: "/dashboard/inventory", icon: Package, permission: 'inventory:read' },
    { name: "CRM", href: "/dashboard/crm", icon: Users, permission: 'customers:read' },
    { name: "Services", href: "/dashboard/services", icon: Calendar, permission: 'services:read' },
    { name: "Transactions", href: "/dashboard/transactions", icon: Receipt, permission: 'invoices:read' },
    { name: "Technical Build Queue", href: "/dashboard/build", icon: Hammer, permission: 'build:read' },
    { name: "Backorders", href: "/dashboard/backorders", icon: Package, permission: 'backorders:read' },
    { name: "Stock Movements", href: "/dashboard/stock-movements", icon: ArrowRightLeft, permission: 'stock_movements:read' },
    { name: "Locations", href: "/dashboard/locations", icon: MapPin, permission: 'locations:read' },
    { name: "Warranty & RMA", href: "/dashboard/warranty", icon: ClipboardList, permission: 'warranty_rma:read' },
    {
        name: "Reports", href: "/dashboard/reports", icon: BarChart3, permission: 'reports:read',
        submenu: [
            { name: "Inventory Valuation", href: "/dashboard/reports/inventory-valuation", icon: FileText, permission: 'reports:inventory-valuation' },
            { name: "Stock Movement", href: "/dashboard/reports/stock-movement", icon: FileText, permission: 'reports:stock-movement' },
            { name: "Sales Report", href: "/dashboard/reports/sales", icon: FileText, permission: 'reports:sales' },
            { name: "Purchase Report", href: "/dashboard/reports/purchase", icon: FileText, permission: 'reports:purchase' },
            { name: "Warranty Claims", href: "/dashboard/reports/warranty", icon: FileText, permission: 'reports:warranty' },
            { name: "Location Report", href: "/dashboard/reports/location", icon: FileText, permission: 'reports:location' },
            { name: "Backorder Report", href: "/dashboard/reports/backorder", icon: FileText, permission: 'reports:backorder' },
            { name: "Profitability Report", href: "/dashboard/reports/profitability", icon: FileText, permission: 'reports:profitability' },
        ]
    },
    { name: "Audit Logs", href: "/dashboard/audit-logs", icon: ClipboardList, permission: 'audit_logs:read' },
    {
        name: "Solution Engineering", href: "#", icon: Hammer, permission: 'general_lookup:read',
        submenu: [
            { name: "NAS Configurator", href: "/dashboard/tools/nas-configurator", icon: FileText, permission: 'general_lookup:read' },
            { name: "NAS Hardware Specs", href: "/dashboard/settings/nas-features", icon: Settings, permission: 'settings:manage' },
        ]
    },
    { name: "Messaging", href: "/dashboard/messaging", icon: Mail },
    { name: "Settings", href: "/dashboard/settings", icon: Settings, permission: 'settings:manage' },
]

type User = {
    id: string
    name: string
    email: string
    role: string
    permissions?: string[]
}

export function Sidebar() {
    const pathname = usePathname()
    const [user, setUser] = useState<User | null>(null)
    const [collapsed, setCollapsed] = useState(false)
    const [unreadCount, setUnreadCount] = useState(0)
    const [expandedMenus, setExpandedMenus] = useState<string[]>([])

    useEffect(() => {
        // Auto-expand menu if pathname matches a submenu item
        navigation.forEach(item => {
            if (item.submenu) {
                const isSubActive = item.submenu.some(sub => pathname === sub.href || pathname?.startsWith(sub.href + '/'))
                if (isSubActive) {
                    setExpandedMenus(prev => [...new Set([...prev, item.name])])
                }
            }
        })

        fetchUser()
        fetchUnreadCount()
        const savedState = localStorage.getItem('sidebar-collapsed')
        if (savedState) {
            setCollapsed(JSON.parse(savedState))
        }
    }, [pathname])
    
    useEffect(() => {
        const interval = setInterval(fetchUnreadCount, 15000) // Poll every 15s
        return () => clearInterval(interval)
    }, [])

    const fetchUnreadCount = async () => {
        try {
            const res = await fetch('/api/messaging/count')
            if (res.ok) {
                const data = await res.json()
                setUnreadCount(data.total || 0)
            }
        } catch (error) {
            console.error('Failed to fetch unread count:', error)
        }
    }

    const toggleSidebar = () => {
        const newState = !collapsed
        setCollapsed(newState)
        localStorage.setItem('sidebar-collapsed', JSON.stringify(newState))
    }

    async function fetchUser() {
        try {
            const res = await fetch('/api/auth/me')
            if (res.ok) {
                const data = await res.json()
                setUser(data.user)
            }
        } catch (error) {
            console.error('Failed to fetch user:', error)
        }
    }

    const toggleMenu = (name: string) => {
        setExpandedMenus(prev =>
            prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
        )
    }

    const hasPermission = (permission?: string) => {
        if (!user) return false
        if (!permission) return true
        if (user.permissions?.includes('all:manage')) return true
        return user.permissions?.includes(permission)
    }

    // Filter navigation based on user permissions
    const filteredNavigation = navigation
        .filter(item => hasPermission(item.permission))
        .map(item => ({
            ...item,
            submenu: item.submenu?.filter(sub => hasPermission(sub.permission))
        }))

    return (
        <div className={cn(
            "flex h-full flex-col bg-gray-900 text-white transition-all duration-300",
            collapsed ? "w-20" : "w-64"
        )}>
            <div className={cn(
                "flex h-16 items-center px-6 font-bold text-xl tracking-tight border-b border-gray-800",
                collapsed ? "justify-center px-0" : "justify-between"
            )}>
                {!collapsed && (
                    <div className="flex items-center">
                        <ScanBarcode className="mr-2 h-6 w-6 text-blue-500" />
                        ActiveIMS
                    </div>
                )}
                {collapsed && <ScanBarcode className="h-8 w-8 text-blue-500" />}

                {!collapsed && (
                    <button onClick={toggleSidebar} className="text-gray-400 hover:text-white">
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                )}
            </div>

            {/* Collapse Toggle (Visible only when collapsed) */}
            {collapsed && (
                <div className="flex justify-center py-2 border-b border-gray-800">
                    <button onClick={toggleSidebar} className="text-gray-400 hover:text-white p-2">
                        <ChevronRight className="h-5 w-5" />
                    </button>
                </div>
            )}


            <div className="flex-1 overflow-y-auto py-4">
                <nav className="space-y-1 px-3">
                    {filteredNavigation.map((item) => {
                        // Logic for isActive: 
                        // 1. If href is exactly /dashboard, only highlight if pathname is exactly /dashboard
                        // 2. Otherwise, check if it's the most specific match (longest href)
                        const matchesPath = pathname === item.href || (item.submenu ? item.submenu.some(sub => pathname === sub.href || pathname?.startsWith(sub.href + '/')) : pathname?.startsWith(item.href + '/'))

                        let isActive = false
                        if (matchesPath) {
                            if (item.href === '/dashboard' || item.submenu) {
                                isActive = pathname === item.href
                            } else {
                                // For other items, ensure there isn't a more specific match among ALL items
                                const allItems = navigation.flatMap(n => n.submenu ? [n, ...n.submenu] : [n])
                                const hasMoreSpecificMatch = allItems.some(other =>
                                    other.href !== item.href &&
                                    other.href.length > item.href.length &&
                                    (pathname === other.href || pathname?.startsWith(other.href + '/'))
                                )
                                isActive = !hasMoreSpecificMatch
                            }
                        }

                        const hasSubmenu = item.submenu && item.submenu.length > 0
                        const isExpanded = expandedMenus.includes(item.name)

                        return (
                            <div key={item.name} className="space-y-1">
                                {hasSubmenu ? (
                                    <button
                                        onClick={() => toggleMenu(item.name)}
                                        className={cn(
                                            "group flex w-full items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                                            isActive
                                                ? "bg-gray-800 text-white"
                                                : "text-gray-400 hover:bg-gray-800 hover:text-white",
                                            collapsed && "justify-center px-2"
                                        )}
                                        title={collapsed ? item.name : undefined}
                                    >
                                        <item.icon
                                            className={cn(
                                                "h-5 w-5 flex-shrink-0",
                                                isActive ? "text-blue-500" : "text-gray-400 group-hover:text-white",
                                                !collapsed && "mr-3"
                                            )}
                                        />
                                        {!collapsed && (
                                            <>
                                                <span>{item.name}</span>
                                                <ChevronDown className={cn(
                                                    "ml-auto h-4 w-4 transition-transform",
                                                    isExpanded ? "rotate-0" : "-rotate-90"
                                                )} />
                                            </>
                                        )}
                                    </button>
                                ) : (
                                    <Link
                                        href={item.href}
                                        className={cn(
                                            "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                                            isActive
                                                ? "bg-gray-800 text-white"
                                                : "text-gray-400 hover:bg-gray-800 hover:text-white",
                                            collapsed && "justify-center px-2"
                                        )}
                                        title={collapsed ? item.name : undefined}
                                    >
                                        <item.icon
                                            className={cn(
                                                "h-5 w-5 flex-shrink-0",
                                                isActive ? "text-blue-500" : "text-gray-400 group-hover:text-white",
                                                !collapsed && "mr-3"
                                            )}
                                        />
                                        {!collapsed && item.name}
                                        {!collapsed && item.name === "Messaging" && unreadCount > 0 && (
                                            <span className="ml-auto inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                                                {unreadCount}
                                            </span>
                                        )}
                                    </Link>
                                )}

                                {hasSubmenu && isExpanded && !collapsed && (
                                    <div className="ml-8 space-y-1 mt-1">
                                        {item.submenu!.map((sub) => {
                                            const subActive = pathname === sub.href
                                            return (
                                                <Link
                                                    key={sub.name}
                                                    href={sub.href}
                                                    className={cn(
                                                        "group flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                                                        subActive
                                                            ? "text-blue-400"
                                                            : "text-gray-500 hover:text-white"
                                                    )}
                                                >
                                                    {sub.name}
                                                </Link>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </nav>
            </div>

        </div>
    )
}
