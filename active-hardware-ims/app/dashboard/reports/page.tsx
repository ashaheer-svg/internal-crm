"use client"

import { useState, useEffect } from "react"
import { FileText, Download, Printer, Calendar } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { formatCurrency } from "@/lib/format"
import DocumentFooter from "@/components/DocumentFooter"

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
        { id: 'inventory-valuation', name: 'Inventory Valuation', description: 'Current stock value by product', permission: 'inventory:read' },
        { id: 'stock-movement', name: 'Stock Movement', description: 'Inward and outward movements', permission: 'inventory:read' },
        { id: 'sales', name: 'Sales Report', description: 'Invoice summary and revenue', permission: 'reports:read' },
        { id: 'purchase', name: 'Purchase Report', description: 'Purchase order summary', permission: 'reports:read' },
        { id: 'warranty', name: 'Warranty Claims', description: 'RMA claims by status', permission: 'services:read' },
        { id: 'location', name: 'Location Report', description: 'Stock distribution by location', permission: 'inventory:read' },
        { id: 'profitability', name: 'Profitability Report', description: 'GP Analysis per Order', permission: 'reports:manage' }
    ]

    const availableReports = reportTypes.filter(r => !r.permission || (user?.permissions && (user.permissions.includes('all:manage') || user.permissions.includes(r.permission))))

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
        <>
            {/* Print Styles */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    /* Hide everything except the report results */
                    nav, 
                    aside, 
                    header,
                    footer,
                    [role="navigation"],
                    [role="complementary"],
                    .no-print,
                    .print\\:hidden,
                    /* Target common sidebar/header containers from DashboardLayout */
                    div.md\\:w-64,
                    div.h-16.items-center,
                    div.border-b.bg-white.px-6.shadow-sm {
                        display: none !important;
                    }

                    /* Reset main layout for print - essential for h-screen layouts */
                    html, body {
                        height: auto !important;
                        min-height: auto !important;
                        overflow: visible !important;
                        background: white !important;
                        color: black !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }

                    /* Important: Reset the h-screen flex container from DashboardLayout */
                    div.flex.h-screen {
                        display: block !important;
                        height: auto !important;
                        overflow: visible !important;
                        background: white !important;
                    }

                    /* Reset the main content area */
                    div.flex-1.flex-col.overflow-hidden {
                        display: block !important;
                        overflow: visible !important;
                        height: auto !important;
                        width: 100% !important;
                    }

                    main {
                        display: block !important;
                        overflow: visible !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        height: auto !important;
                        width: 100% !important;
                    }

                    .space-y-6 {
                        margin: 0 !important;
                        padding: 0 !important;
                        display: block !important;
                    }

                    /* Make report results full width and remove shadows */
                    .bg-white.shadow.sm\\:rounded-lg.overflow-hidden {
                        box-shadow: none !important;
                        border: none !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        overflow: visible !important;
                    }

                    @page {
                        size: A4;
                        margin: 1cm;
                    }

                    table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                        page-break-inside: auto;
                        margin-bottom: 10px;
                    }

                    tr {
                        page-break-inside: avoid;
                        page-break-after: auto;
                    }

                    thead {
                        display: table-header-group;
                    }

                    th, td {
                        border: 1px solid #ccc !important;
                        padding: 4px !important;
                        font-size: 7.5pt !important;
                        white-space: normal !important;
                    }

                    /* Ensure text is black for readability and contrast */
                    h1, h2, h3, h4, p, span, dt, dd, th, td {
                        color: black !important;
                    }
                }
            `}} />

            <div className="space-y-6">
                <div className="flex items-center justify-between no-print">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Reports</h1>
                        <p className="mt-1 text-sm text-gray-500">Generate and export business reports</p>
                    </div>
                </div>

                {/* Report Selection */}
                <div className="bg-white shadow sm:rounded-lg p-6 no-print">
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
                    <div className="bg-white shadow sm:rounded-lg p-6 no-print">
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
                <div className="flex justify-center no-print">
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
                    <div className="bg-white shadow sm:rounded-lg overflow-hidden print:shadow-none print:border-none">
                        <div className="px-6 py-3 border-b border-gray-200 flex items-center justify-between print:flex-row print:items-start print:justify-between print:px-0 print:py-1 print:border-b-2 print:border-black">
                            <div>
                                <div className="hidden print:block">
                                    <h1 className="text-lg font-black text-blue-600 uppercase tracking-tighter leading-none">Active Solutions</h1>
                                    <p className="text-[9px] text-gray-500 font-bold leading-tight">32/2-2/1 Nandimithra Place, Colombo 6, Sri Lanka.</p>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 uppercase tracking-tight print:text-base print:mt-1">
                                    {reportTypes.find(r => r.id === selectedReport)?.name}
                                </h3>
                                <p className="text-sm text-gray-600 font-medium print:text-[10px] print:mt-0">
                                    Period: <span className="text-gray-900">{(startDate || endDate) ? `${startDate || 'Start'} to ${endDate || 'Present'}` : 'Full History'}</span>
                                </p>
                            </div>
                            <div className="flex flex-col items-end print:pt-1">
                                <p className="text-xs text-gray-400 no-print">
                                    Report Type: {selectedReport}
                                </p>
                                <p className="text-xs text-gray-400 no-print">
                                    Generated on {formatDate(new Date())}
                                </p>
                                <p className="hidden print:block text-[9px] text-gray-400 font-medium">
                                    Generated: {formatDate(new Date())}
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
                        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 print:bg-white print:px-0 print:py-2 print:border-b">
                            <h4 className="text-sm font-medium text-gray-900 mb-2 print:text-xs print:mb-1">Summary</h4>
                            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4 print:grid-cols-4 print:gap-2">
                                {Object.entries(reportData.summary).map(([key, value]) => (
                                    <div key={key}>
                                        <dt className="text-xs text-gray-500 uppercase tracking-wider print:text-[10px]">
                                            {key.replace(/([A-Z])/g, ' $1').trim()}
                                        </dt>
                                        <dd className="text-sm font-semibold text-gray-900 mt-1 print:text-xs print:mt-0">
                                            {typeof value === 'object'
                                                ? JSON.stringify(value)
                                                : typeof value === 'number' && key.toLowerCase().includes('total') && !key.toLowerCase().includes('count')
                                                    ? formatCurrency(value)
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

                        {reportData.data.length === 0 && (
                            <div className="px-6 py-10 text-center text-gray-500">
                                No data available for this report
                            </div>
                        )}
                        <DocumentFooter />
                    </div>
                )}
            </div>
        </>
    )
}
