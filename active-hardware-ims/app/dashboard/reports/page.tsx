"use client"

import { useState, useEffect } from "react"
import { FileText, ChevronRight, AlertCircle, Loader2 } from "lucide-react"
import Link from "next/link"
import BackButton from "@/components/BackButton"

const REPORT_TYPES = [
    {
        id: 'inventory-valuation',
        name: 'Inventory Valuation',
        description: 'Current stock value by product, brand, and category.',
        permission: 'reports:inventory-valuation'
    },
    {
        id: 'stock-movement',
        name: 'Stock Movement',
        description: 'Detailed log of inward (GRN) and outward (Invoice) movements.',
        permission: 'reports:stock-movement'
    },
    {
        id: 'sales',
        name: 'Sales Report',
        description: 'Invoice summary, revenue analysis, and regional sales.',
        permission: 'reports:sales'
    },
    {
        id: 'purchase',
        name: 'Purchase Report',
        description: 'Purchase order history and supplier expenditure tracker.',
        permission: 'reports:purchase'
    },
    {
        id: 'warranty',
        name: 'Warranty Claims',
        description: 'RMA tracking, replacement status, and claim history.',
        permission: 'reports:warranty'
    },
    {
        id: 'location',
        name: 'Location Report',
        description: 'Stock distribution and value breakdown across all warehouses.',
        permission: 'reports:location'
    },
    {
        id: 'backorder',
        name: 'Backorder Report',
        description: 'Monitoring pending customer orders and partial shipments.',
        permission: 'reports:backorder'
    },
    {
        id: 'profitability',
        name: 'Profitability Report',
        description: 'Strict GP analysis per order including true landing costs.',
        permission: 'reports:profitability',
        adminOnly: true
    }
]

export default function ReportsMenuPage() {
    const [userPermissions, setUserPermissions] = useState<string[]>([])
    const [isAdmin, setIsAdmin] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch('/api/auth/me')
            .then(res => res.json())
            .then(data => {
                const perms = data.user?.permissions || []
                setUserPermissions(perms)
                setIsAdmin(perms.includes('all:manage'))
                setLoading(false)
            })
            .catch(err => {
                console.error('Failed to fetch user', err)
                setLoading(false)
            })
    }, [])

    const availableReports = REPORT_TYPES.filter(report =>
        isAdmin || userPermissions.includes(report.permission)
    )

    if (loading) {
        return (
            <div className="h-[60vh] flex flex-col items-center justify-center text-gray-500">
                <Loader2 className="w-8 h-8 animate-spin mb-4" />
                <p>Loading your reports...</p>
            </div>
        )
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <BackButton />
            <div className="border-b pb-5">
                <h1 className="text-3xl font-bold tracking-tight text-background">Business Intelligence</h1>
                <p className="mt-2 text-base text-gray-400">Access individualized reports and financial analysis based on your role.</p>
            </div>

            {availableReports.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {availableReports.map((report) => (
                        <Link
                            key={report.id}
                            href={`/dashboard/reports/${report.id}`}
                            className="group relative flex items-start gap-4 p-6 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-blue-400 transition-all"
                        >
                            <div className="p-3 bg-blue-50 rounded-lg text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                <FileText className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">
                                        {report.name}
                                    </h3>
                                    {report.adminOnly && (
                                        <span className="text-[10px] font-black uppercase px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded">
                                            Restricted
                                        </span>
                                    )}
                                </div>
                                <p className="mt-1 text-sm text-gray-500 leading-relaxed">
                                    {report.description}
                                </p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all self-center" />
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 text-center max-w-2xl mx-auto">
                    <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-amber-900">No Reports Accessible</h3>
                    <p className="mt-2 text-amber-700">
                        You do not currently have permission to view any standard reports.
                        Please contact your administrator to assign granular report permissions to your role.
                    </p>
                </div>
            )}

            <div className="pt-8 border-t">
                <div className="bg-gray-50 rounded-lg p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-center sm:text-left">
                        <h4 className="font-semibold text-gray-900">Need a custom report?</h4>
                        <p className="text-sm text-gray-500 mt-1">Export individual transactions to CSV for advanced analysis in Excel or PowerBI.</p>
                    </div>
                    <Link
                        href="/dashboard/transactions"
                        className="px-4 py-2 text-sm font-medium text-blue-600 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                        Go to Transactions
                    </Link>
                </div>
            </div>
        </div>
    )
}
