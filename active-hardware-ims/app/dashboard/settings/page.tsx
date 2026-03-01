"use client"

import Link from "next/link"
import { Users, Building2, FileText, Shield, ScrollText, Database, Upload, Receipt, MessageSquare, Activity } from "lucide-react"

const settingsLinks = [
    {
        name: "Quote Configuration",
        href: "/dashboard/settings/quotes",
        icon: Receipt,
        description: "Configure tax tables and quote settings"
    },
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
    },
    {
        name: "Categories",
        href: "/dashboard/settings/categories",
        icon: FileText,
        description: "Manage product categories"
    },

    {
        name: "Cost Adjustment",
        href: "/dashboard/settings/cost-adjustment",
        icon: Upload, // Reusing Upload icon for now, or could use DollarSign if imported
        description: "Edit inventory costs by GRN and Model"
    },
    {
        name: "Product Management",
        href: "/dashboard/settings/products",
        icon: FileText,
        description: "Admin view for all products (Active & Inactive)",
        adminOnly: true
    },
    {
        name: "Document Sequences",
        href: "/dashboard/settings/sequences",
        icon: ScrollText,
        description: "Manage PO and GRN running numbers"
    },
    {
        name: "Historical Warranty Import",
        href: "/dashboard/settings/warranty-import",
        icon: Shield,
        description: "Import legacy warranty data from CSV",
        adminOnly: true
    },
    {
        name: "Integrations",
        href: "/dashboard/settings/integrations",
        icon: MessageSquare,
        description: "Manage WhatsApp & Third-Party Alerts",
        adminOnly: true
    },
    {
        name: "Maintenance & Health",
        href: "/dashboard/settings/maintenance",
        icon: Activity,
        description: "System health, updates, and maintenance mode",
        adminOnly: true
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
