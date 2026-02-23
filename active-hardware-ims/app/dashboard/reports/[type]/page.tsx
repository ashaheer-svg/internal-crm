"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import ReportLayout from "@/components/reports/ReportLayout"
import { formatCurrency } from "@/lib/format"
import { formatDate } from "@/lib/utils"

interface PageProps {
    params: Promise<{ type: string }>
}

const REPORT_CONFIGS: Record<string, { title: string, description: string, permission: string }> = {
    'inventory-valuation': {
        title: 'Inventory Valuation',
        description: 'Current stock value by product',
        permission: 'reports:inventory-valuation'
    },
    'stock-movement': {
        title: 'Stock Movement',
        description: 'Inward and outward movements',
        permission: 'reports:stock-movement'
    },
    'sales': {
        title: 'Sales Report',
        description: 'Invoice summary and revenue',
        permission: 'reports:sales'
    },
    'purchase': {
        title: 'Purchase Report',
        description: 'Purchase order summary',
        permission: 'reports:purchase'
    },
    'warranty': {
        title: 'Warranty Claims',
        description: 'RMA claims by status',
        permission: 'reports:warranty'
    },
    'location': {
        title: 'Location Report',
        description: 'Stock distribution by location',
        permission: 'reports:location'
    },
    'backorder': {
        title: 'Backorder Report',
        description: 'Pending and partial backorders',
        permission: 'reports:backorder'
    },
    'profitability': {
        title: 'Profitability Report',
        description: 'GP Analysis per Order (Admin only)',
        permission: 'reports:profitability'
    }
}

export default function IndividualReportPage({ params }: PageProps) {
    const { type } = use(params)
    const router = useRouter()
    const config = REPORT_CONFIGS[type]

    const [reportData, setReportData] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    useEffect(() => {
        if (!config) {
            router.push('/dashboard/reports')
        }
    }, [config, router])

    const generateReport = async (startDate: string, endDate: string) => {
        setLoading(true)
        setError("")
        try {
            const params = new URLSearchParams({
                type,
                ...(startDate && { startDate }),
                ...(endDate && { endDate })
            })

            const res = await fetch(`/api/reports?${params}`)
            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Failed to generate report')
            }

            const data = await res.json()
            setReportData(data)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const exportToCSV = () => {
        if (!reportData || !reportData.data || reportData.data.length === 0) return

        const headers = Object.keys(reportData.data[0])
        const csvContent = [
            headers.join(','),
            ...reportData.data.map((row: any) =>
                headers.map(header => {
                    const value = row[header]
                    return typeof value === 'string' && value.includes(',')
                        ? `"${value}"`
                        : value
                }).join(',')
            )
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${type}-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
    }

    if (!config) return null

    // Specialized Logic for Profitability Font & Table
    const isProfitability = type === "profitability"

    return (
        <ReportLayout
            title={config.title}
            description={config.description}
            onGenerate={generateReport}
            onExport={exportToCSV}
            loading={loading}
            dataPresent={!!reportData}
            summary={reportData?.summary && (
                <dl className={`grid grid-cols-2 gap-4 ${isProfitability ? 'sm:grid-cols-4' : 'sm:grid-cols-4'} print:grid-cols-4 print:gap-2`}>
                    {Object.entries(reportData.summary).map(([key, value]) => (
                        <div key={key}>
                            <dt className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">
                                {key.replace(/([A-Z])/g, ' $1').trim()}
                            </dt>
                            <dd className={`text-sm font-bold text-gray-900 mt-1 ${isProfitability ? 'print:text-[10pt]' : 'print:text-xs'}`}>
                                {typeof value === 'object'
                                    ? JSON.stringify(value)
                                    : typeof value === 'number' && key.toLowerCase().includes('total') && !key.toLowerCase().includes('count')
                                        ? formatCurrency(value)
                                        : value != null ? value.toLocaleString() : 'N/A'}
                            </dd>
                        </div>
                    ))}
                </dl>
            )}
        >
            {error && (
                <div className="p-6 bg-red-50 border-l-4 border-red-400 text-red-700">
                    <p className="font-medium">Error</p>
                    <p className="text-sm">{error}</p>
                </div>
            )}

            {reportData?.data && (
                <div className="overflow-x-auto">
                    <table className={`min-w-full divide-y divide-gray-200 ${isProfitability ? 'table-fixed' : ''}`}>
                        <thead className="bg-gray-50 print:bg-white">
                            <tr>
                                {reportData.data.length > 0 && Object.keys(reportData.data[0]).map((key) => (
                                    <th
                                        key={key}
                                        className={`px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider print:text-[8pt] print:border print:border-gray-200`}
                                    >
                                        {key.replace(/([A-Z])/g, ' $1').trim()}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {reportData.data.map((row: any, idx: number) => (
                                <tr key={idx} className="hover:bg-gray-50 print:hover:bg-transparent">
                                    {Object.entries(row).map(([key, value], cellIdx) => (
                                        <td
                                            key={cellIdx}
                                            className={`px-3 py-2 whitespace-nowrap text-[11px] text-gray-900 print:text-[8pt] print:border print:border-gray-100 ${isProfitability ? 'leading-tight' : ''}`}
                                        >
                                            {typeof value === 'object'
                                                ? JSON.stringify(value)
                                                : key.toLowerCase().includes('date')
                                                    ? formatDate(value as string)
                                                    : (key.toLowerCase().includes('amount') || key.toLowerCase().includes('value') || key.toLowerCase().includes('cost') || key.toLowerCase().includes('price') || key.toLowerCase().includes('revenue') || key.toLowerCase().includes('profit'))
                                                        ? formatCurrency(Number(value))
                                                        : typeof value === 'number'
                                                            ? value.toLocaleString()
                                                            : String(value)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </ReportLayout>
    )
}
