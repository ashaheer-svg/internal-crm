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
    LogOut,
    ScanBarcode,
    Receipt,
    ArrowRightLeft,
    Users,
    FileText,
    Calendar,
    ChevronLeft,
    ChevronRight,
    BarChart3
} from "lucide-react"

const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Inventory", href: "/dashboard/inventory", icon: Package, permission: 'inventory:read' },
    { name: "CRM", href: "/dashboard/crm", icon: Users, permission: 'customers:read' },
    { name: "Services", href: "/dashboard/services", icon: Calendar, permission: 'services:read' },
    { name: "Transactions", href: "/dashboard/transactions", icon: Receipt, permission: 'invoices:read' },
    { name: "Backorders", href: "/dashboard/backorders", icon: Package, permission: 'inventory:read' },
    { name: "Warranty / RMA", href: "/dashboard/warranty", icon: ClipboardList, permission: 'services:read' },
    { name: "Reports", href: "/dashboard/reports", icon: BarChart3, permission: 'reports:read' },
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
    const router = useRouter()
    const [user, setUser] = useState<User | null>(null)
    const [loggingOut, setLoggingOut] = useState(false)
    const [collapsed, setCollapsed] = useState(false)

    useEffect(() => {
        fetchUser()
        const savedState = localStorage.getItem('sidebar-collapsed')
        if (savedState) {
            setCollapsed(JSON.parse(savedState))
        }
    }, [])

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

    async function handleLogout() {
        setLoggingOut(true)
        try {
            await fetch('/api/auth/logout', { method: 'POST' })
            router.push('/login')
        } catch (error) {
            console.error('Logout failed:', error)
        } finally {
            setLoggingOut(false)
        }
    }

    // Filter navigation based on user permissions
    const filteredNavigation = navigation.filter(item =>
        !user || !('permission' in item) || (user.permissions && (user.permissions.includes('all:manage') || user.permissions.includes((item as any).permission)))
    )

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
                        const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
                        return (
                            <Link
                                key={item.name}
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
                            </Link>
                        )
                    })}
                </nav>
            </div>

            {/* User Info & Logout */}
            <div className="border-t border-gray-800">
                {user && !collapsed && (
                    <div className="px-4 py-3 border-b border-gray-800">
                        <p className="text-sm font-medium text-white truncate">{user.name}</p>
                        <p className="text-xs text-gray-400 truncate">{user.email}</p>
                        <p className="text-xs text-blue-400 mt-1">{user.role}</p>
                    </div>
                )}
                <div className="p-4">
                    <button
                        onClick={handleLogout}
                        disabled={loggingOut}
                        className={cn(
                            "group flex w-full items-center px-3 py-2 text-sm font-medium text-gray-400 hover:text-white rounded-md hover:bg-gray-800 disabled:opacity-50",
                            collapsed && "justify-center"
                        )}
                        title={collapsed ? "Sign Out" : undefined}
                    >
                        <LogOut className={cn(
                            "h-5 w-5 text-gray-400 group-hover:text-white",
                            !collapsed && "mr-3"
                        )} />
                        {!collapsed && (loggingOut ? 'Signing Out...' : 'Sign Out')}
                    </button>
                </div>
            </div>
        </div>
    )
}
