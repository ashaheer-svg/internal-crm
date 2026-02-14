"use client"

import { useState, useEffect } from "react"
import { FileText, Download, Printer, Calendar } from "lucide-react"
import { formatDate } from "@/lib/utils"

type ReportType = 'inventory-valuation' | 'stock-movement' | 'sales' | 'purchase' | 'warranty' | 'location' | 'profitability'

type ReportData = {
    type: string
    data: any[]
    summary: any
}

export default function ReportsPage() {
    const [selectedReport, setSelectedReport] = useState<ReportType>('inventory-valuation')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [reportData, setReportData] = useState<ReportData | null>(null)
    const [loading, setLoading] = useState(false)

    const [user, setUser] = useState<any>(null)

    useEffect(() => {
        // Fetch user role
        fetch('/api/auth/me')
            .then(res => res.json())
            .then(data => setUser(data.user || null))
            .catch(err => console.error('Failed to fetch user', err))
    }, [])

    const reportTypes = [
        { id: 'inventory-valuation', name: 'Inventory Valuation', description: 'Current stock value by product', roles: ['ADMIN', 'MANAGER'] },
        { id: 'stock-movement', name: 'Stock Movement', description: 'Inward and outward movements', roles: ['ADMIN', 'MANAGER', 'WAREHOUSE'] },
        { id: 'sales', name: 'Sales Report', description: 'Invoice summary and revenue', roles: ['ADMIN', 'MANAGER', 'SALES'] },
        { id: 'purchase', name: 'Purchase Report', description: 'Purchase order summary', roles: ['ADMIN', 'MANAGER'] },
        { id: 'warranty', name: 'Warranty Claims', description: 'RMA claims by status', roles: ['ADMIN', 'MANAGER', 'SALES'] },
        { id: 'location', name: 'Location Report', description: 'Stock distribution by location', roles: ['ADMIN', 'MANAGER', 'WAREHOUSE'] },
        { id: 'profitability', name: 'Profitability Report', description: 'GP Analysis per Order (Admin Only)', roles: ['ADMIN'] }
    ]

    const availableReports = reportTypes.filter(r => !r.roles || (user && r.roles.includes(user.role)))

    async function generateReport() {
        setLoading(true)
        try {
            const params = new URLSearchParams({
                type: selectedReport,
                ...(startDate && { startDate }),
                ...(endDate && { endDate })
            })

            const res = await fetch(`/api/reports?${params}`)

            if (!res.ok) throw new Error('Failed to generate report')

            const data = await res.json()
            if (data && data.data && data.summary) {
                setReportData(data)
            } else {
                console.error('Invalid report data:', data)
                alert('Received invalid data from server')
            }
        } catch (error) {
            console.error('Failed to generate report:', error)
            alert('Failed to generate report')
        } finally {
            setLoading(false)
        }
    }

    function exportToCSV() {
        if (!reportData || !reportData.data || reportData.data.length === 0) {
            alert('No data available to export')
            return
        }

        const headers = Object.keys(reportData.data[0] || {})
        const csvContent = [
            headers.join(','),
            ...reportData.data.map(row =>
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
        a.download = `${selectedReport}-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
    }

    function printReport() {
        window.print()
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Reports</h1>
                    <p className="mt-1 text-sm text-gray-500">Generate and export business reports</p>
                </div>
            </div>

            {/* Report Selection */}
            <div className="bg-white shadow sm:rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Select Report Type</h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {availableReports.map((report) => (
                        <button
                            key={report.id}
                            onClick={() => setSelectedReport(report.id as ReportType)}
                            className={`text-left p-4 border-2 rounded-lg transition-colors ${selectedReport === report.id
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                                }`}
                        >
                            <div className="flex items-start gap-3">
                                <FileText className={`w-5 h-5 mt-0.5 ${selectedReport === report.id ? 'text-blue-600' : 'text-gray-400'
                                    }`} />
                                <div>
                                    <p className="font-medium text-gray-900">{report.name}</p>
                                    <p className="text-sm text-gray-500 mt-1">{report.description}</p>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Date Range Filter */}
            {['stock-movement', 'sales', 'purchase', 'warranty', 'profitability'].includes(selectedReport) && (
                <div className="bg-white shadow sm:rounded-lg p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Calendar className="w-5 h-5 text-gray-400" />
                        <h3 className="text-lg font-medium text-gray-900">Date Range (Optional)</h3>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Start Date
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                End Date
                            </label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Generate Button */}
            <div className="flex justify-center">
                <button
                    onClick={generateReport}
                    disabled={loading}
                    className="px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Generating...' : 'Generate Report'}
                </button>
            </div>

            {/* Report Results */}
            {reportData && (
                <div className="bg-white shadow sm:rounded-lg overflow-hidden print:shadow-none">
                    <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between print:border-b-2 print:border-black">
                        <div>
                            <h3 className="text-lg font-medium text-gray-900">
                                {reportTypes.find(r => r.id === selectedReport)?.name}
                            </h3>
                            <p className="text-sm text-gray-500">
                                Generated on {formatDate(new Date())}
                            </p>
                        </div>
                        <div className="flex gap-2 print:hidden">
                            <button
                                onClick={exportToCSV}
                                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Export CSV
                            </button>
                            <button
                                onClick={printReport}
                                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                            >
                                <Printer className="w-4 h-4 mr-2" />
                                Print
                            </button>
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Summary</h4>
                        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                            {Object.entries(reportData.summary).map(([key, value]) => (
                                <div key={key}>
                                    <dt className="text-xs text-gray-500 uppercase tracking-wider">
                                        {key.replace(/([A-Z])/g, ' $1').trim()}
                                    </dt>
                                    <dd className="text-sm font-semibold text-gray-900 mt-1">
                                        {typeof value === 'object'
                                            ? JSON.stringify(value)
                                            : typeof value === 'number' && key.toLowerCase().includes('total') && !key.toLowerCase().includes('count')
                                                ? `Rs. ${value.toLocaleString()}`
                                                : value != null ? value.toLocaleString() : 'N/A'}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    </div>

                    {/* Data Table */}
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    {reportData.data.length > 0 && Object.keys(reportData.data[0]).map((key) => (
                                        <th
                                            key={key}
                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                        >
                                            {key.replace(/([A-Z])/g, ' $1').trim()}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {reportData.data.map((row, idx) => (
                                    <tr key={idx}>
                                        {Object.entries(row).map(([key, value], cellIdx) => (
                                            <td key={cellIdx} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {typeof value === 'object'
                                                    ? JSON.stringify(value)
                                                    : key.toLowerCase().includes('date')
                                                        ? formatDate(value as string)
                                                        : (key.toLowerCase().includes('amount') || key.toLowerCase().includes('value') || key.toLowerCase().includes('cost'))
                                                            ? `Rs. ${Number(value).toLocaleString()}`
                                                            : String(value)}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {reportData.data.length === 0 && (
                        <div className="px-6 py-10 text-center text-gray-500">
                            No data available for this report
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
