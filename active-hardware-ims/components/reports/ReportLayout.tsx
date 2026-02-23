"use client"

import { useState } from "react"
import { Download, Printer, Calendar, FileText, ArrowLeft, Loader2 } from "lucide-react"
import { formatDate } from "@/lib/utils"
import DocumentFooter from "@/components/DocumentFooter"
import DocumentHeader from "@/components/DocumentHeader"
import Link from "next/link"

interface ReportLayoutProps {
    title: string
    description?: string
    children: React.ReactNode
    onGenerate: (startDate: string, endDate: string) => void
    onExport: () => void
    loading: boolean
    summary?: React.ReactNode
    dataPresent: boolean
    showDateFilter?: boolean
}

export default function ReportLayout({
    title,
    description,
    children,
    onGenerate,
    onExport,
    loading,
    summary,
    dataPresent,
    showDateFilter = true
}: ReportLayoutProps) {
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")

    return (
        <>
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    nav, aside, header, footer, [role="navigation"], [role="complementary"], .no-print, .print\\:hidden {
                        display: none !important;
                    }
                    html, body {
                        height: auto !important;
                        min-height: auto !important;
                        overflow: visible !important;
                        background: white !important;
                        color: black !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    div.flex.h-screen {
                        display: block !important;
                        height: auto !important;
                        overflow: visible !important;
                        background: white !important;
                    }
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
                    .bg-white.shadow {
                        box-shadow: none !important;
                        border: none !important;
                    }
                    @page {
                        size: A4 landscape;
                        margin: 1cm;
                    }
                    table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                        table-layout: auto !important;
                    }
                    th, td {
                        border: 0.5pt solid #000 !important;
                        padding: 2pt 4pt !important;
                        font-size: 8pt !important;
                        color: black !important;
                    }
                    th {
                        background-color: #f9f9f9 !important;
                        -webkit-print-color-adjust: exact;
                        font-weight: bold !important;
                    }
                    /* Remove all background colors for items to save toner if requested, 
                       but keep light gray for headers for scannability */
                }
            `}} />

            <div className="space-y-6">
                <div className="flex items-center justify-between no-print">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard/reports" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <ArrowLeft className="w-5 h-5 text-gray-500" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-gray-900">{title}</h1>
                            {description && <p className="text-sm text-gray-500">{description}</p>}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => window.print()}
                            disabled={!dataPresent}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                        >
                            <Printer className="w-4 h-4 mr-2" />
                            Print
                        </button>
                        <button
                            onClick={onExport}
                            disabled={!dataPresent}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Export
                        </button>
                    </div>
                </div>

                {showDateFilter && (
                    <div className="bg-white shadow sm:rounded-lg p-6 no-print">
                        <div className="flex flex-col sm:flex-row items-end gap-4">
                            <div className="flex-1 w-full">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                />
                            </div>
                            <div className="flex-1 w-full">
                                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                />
                            </div>
                            <button
                                onClick={() => onGenerate(startDate, endDate)}
                                disabled={loading}
                                className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center min-w-[140px]"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileText className="w-4 h-4 mr-2" />}
                                Generate
                            </button>
                        </div>
                    </div>
                )}

                {!showDateFilter && !dataPresent && (
                    <div className="flex justify-center no-print">
                        <button
                            onClick={() => onGenerate("", "")}
                            disabled={loading}
                            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <FileText className="w-5 h-5 mr-2" />}
                            Generate Report
                        </button>
                    </div>
                )}

                {dataPresent && (
                    <div className="bg-white shadow sm:rounded-lg overflow-hidden print:shadow-none print:border-none">
                        {/* Print Header */}
                        <div className="hidden print:block mb-4">
                            <DocumentHeader title={title} subtitle={description} />
                            {(startDate || endDate) && (
                                <p className="text-[10px] font-semibold text-gray-600 -mt-4 mb-4">
                                    Period: {startDate || 'Start'} to {endDate || 'Present'}
                                </p>
                            )}
                        </div>

                        {/* Summary Section */}
                        {summary && (
                            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 print:bg-white print:px-0 print:py-2">
                                <h4 className="text-sm font-medium text-gray-900 mb-3 print:text-xs print:mb-1 uppercase tracking-wider">Summary</h4>
                                {summary}
                            </div>
                        )}

                        {/* Content */}
                        <div className="print:px-0">
                            {children}
                        </div>

                        <DocumentFooter />
                    </div>
                )}

                {!dataPresent && !loading && (
                    <div className="bg-white shadow sm:rounded-lg p-12 text-center text-gray-500">
                        <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p>No report data generated yet. Click the generate button to begin.</p>
                    </div>
                )}
            </div>
        </>
    )
}
