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
    FileText
} from "lucide-react"

const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ['ADMIN', 'MANAGER', 'SALES', 'WAREHOUSE', 'VIEWER'] },
    { name: "Inventory", href: "/dashboard/inventory", icon: Package, roles: ['ADMIN', 'MANAGER', 'SALES', 'WAREHOUSE', 'VIEWER'] },
    { name: "Stock Movements", href: "/dashboard/stock-movements", icon: ArrowRightLeft, roles: ['ADMIN', 'MANAGER', 'WAREHOUSE', 'VIEWER'] },
    { name: "Delivery Orders", href: "/dashboard/transactions", icon: Receipt, roles: ['ADMIN', 'MANAGER', 'SALES', 'VIEWER'] },
    { name: "Backorders", href: "/dashboard/backorders", icon: Package, roles: ['ADMIN', 'MANAGER', 'SALES', 'WAREHOUSE', 'VIEWER'] },
    { name: "Warranty / RMA", href: "/dashboard/warranty", icon: ClipboardList, roles: ['ADMIN', 'MANAGER', 'SALES', 'VIEWER'] },
    { name: "Reports", href: "/dashboard/reports", icon: Receipt, roles: ['ADMIN', 'MANAGER', 'SALES', 'WAREHOUSE', 'VIEWER'] },
    { name: "Settings", href: "/dashboard/settings", icon: Settings, roles: ['ADMIN', 'MANAGER', 'SALES', 'WAREHOUSE', 'VIEWER'] },
]

type User = {
    id: string
    name: string
    email: string
    role: string
}

export function Sidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const [user, setUser] = useState<User | null>(null)
    const [loggingOut, setLoggingOut] = useState(false)

    useEffect(() => {
        fetchUser()
    }, [])

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

    // Filter navigation based on user role
    const filteredNavigation = navigation.filter(item =>
        !user || item.roles.includes(user.role)
    )

    return (
        <div className="flex h-full flex-col bg-gray-900 text-white w-64">
            <div className="flex h-16 items-center px-6 font-bold text-xl tracking-tight border-b border-gray-800">
                <ScanBarcode className="mr-2 h-6 w-6 text-blue-500" />
                ActiveIMS
            </div>
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
                                        : "text-gray-400 hover:bg-gray-800 hover:text-white"
                                )}
                            >
                                <item.icon
                                    className={cn(
                                        "mr-3 h-5 w-5 flex-shrink-0",
                                        isActive ? "text-blue-500" : "text-gray-400 group-hover:text-white"
                                    )}
                                />
                                {item.name}
                            </Link>
                        )
                    })}
                </nav>
            </div>

            {/* User Info & Logout */}
            <div className="border-t border-gray-800">
                {user && (
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
                        className="group flex w-full items-center px-3 py-2 text-sm font-medium text-gray-400 hover:text-white rounded-md hover:bg-gray-800 disabled:opacity-50"
                    >
                        <LogOut className="mr-3 h-5 w-5 text-gray-400 group-hover:text-white" />
                        {loggingOut ? 'Signing Out...' : 'Sign Out'}
                    </button>
                </div>
            </div>
        </div>
    )
}
