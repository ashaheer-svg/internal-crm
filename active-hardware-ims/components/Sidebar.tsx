"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
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
    ArrowRightLeft
} from "lucide-react"

const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Inventory", href: "/dashboard/inventory", icon: Package },
    { name: "Stock Movements", href: "/dashboard/stock-movements", icon: ArrowRightLeft },
    { name: "Locations", href: "/dashboard/locations", icon: MapPin },
    { name: "Transactions", href: "/dashboard/transactions", icon: Receipt },
    { name: "Warranty / RMA", href: "/dashboard/warranty", icon: ClipboardList },
    { name: "Reports", href: "/dashboard/reports", icon: Receipt },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
]

export function Sidebar() {
    const pathname = usePathname()

    return (
        <div className="flex h-full flex-col bg-gray-900 text-white w-64">
            <div className="flex h-16 items-center px-6 font-bold text-xl tracking-tight border-b border-gray-800">
                <ScanBarcode className="mr-2 h-6 w-6 text-blue-500" />
                ActiveIMS
            </div>
            <div className="flex-1 overflow-y-auto py-4">
                <nav className="space-y-1 px-3">
                    {navigation.map((item) => {
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
            <div className="border-t border-gray-800 p-4">
                <button className="group flex w-full items-center px-3 py-2 text-sm font-medium text-gray-400 hover:text-white rounded-md hover:bg-gray-800">
                    <LogOut className="mr-3 h-5 w-5 text-gray-400 group-hover:text-white" />
                    Sign Out
                </button>
            </div>
        </div>
    )
}
