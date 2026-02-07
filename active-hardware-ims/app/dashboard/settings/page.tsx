"use client"

import Link from "next/link"
import { Users, Building2, FileText, Shield, ScrollText, Database, Upload } from "lucide-react"

const settingsLinks = [
    {
        name: "User Management",
        href: "/dashboard/settings/users",
        icon: Shield,
        description: "Manage system users and permissions",
        adminOnly: true
    },
    {
        name: "Backup & Restore",
        href: "/dashboard/settings/backup",
        icon: Database,
        description: "Backup and restore your database",
        adminOnly: true
    },
    {
        name: "Bulk Import Products",
        href: "/dashboard/settings/bulk-import",
        icon: Upload,
        description: "Import multiple products via CSV file",
        adminOnly: true
    },
    {
        name: "Audit Logs",
        href: "/dashboard/audit-logs",
        icon: ScrollText,
        description: "View system activity and audit trail",
        adminOnly: false
    },
    {
        name: "Customers",
        href: "/dashboard/settings/customers",
        icon: Users,
        description: "Manage customer information and contacts"
    },
    {
        name: "Locations",
        href: "/dashboard/locations",
        icon: Building2,
        description: "Manage warehouse and storage locations"
    },
    {
        name: "Reports",
        href: "/dashboard/reports",
        icon: FileText,
        description: "Configure and generate reports"
    }
]

export default function SettingsPage() {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Settings</h1>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {settingsLinks.map((link) => (
                    <Link
                        key={link.name}
                        href={link.href}
                        className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm hover:border-gray-400 hover:shadow-md transition-all"
                    >
                        <div className="flex items-start">
                            <div className="flex-shrink-0">
                                <link.icon className="h-6 w-6 text-blue-600" />
                            </div>
                            <div className="ml-4">
                                <h3 className="text-base font-medium text-gray-900">{link.name}</h3>
                                <p className="mt-1 text-sm text-gray-500">{link.description}</p>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    )
}
