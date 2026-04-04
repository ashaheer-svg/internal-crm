"use client"

import { useState } from "react"
import { Upload, Download, FileText, CheckCircle, AlertCircle, Info, ArrowLeft } from "lucide-react"
import Link from "next/link"
import ImportSummaryModal from "@/components/ImportSummaryModal"

export default function WarrantyImportPage() {
    const [uploading, setUploading] = useState(false)
    const [progress, setProgress] = useState<number | null>(null)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [result, setResult] = useState<any | null>(null)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const [previewData, setPreviewData] = useState<any[] | null>(null)
    const [isSummaryOpen, setIsSummaryOpen] = useState(false)

    function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (file) {
            if (!file.name.endsWith('.csv')) {
                setMessage({ type: 'error', text: 'Please select a CSV file' })
                return
            }
            setSelectedFile(file)
            setMessage(null)
            setResult(null)
            setPreviewData(null)
            setProgress(null)
        }
    }

    function chunkArray<T>(array: T[], size: number): T[][] {
        const chunks: T[][] = []
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size))
        }
        return chunks
    }

    function handleDownloadTemplate() {
        const csvContent = "serialNumber,sku,soldDate,customerName,invoiceNumber,notes,expiryDate\nSN12345,PROD-001,2023-01-15,Acme Corp,INV-2023-001,Bulk order for Q1,2024-01-15\nSN67890,PROD-002,2023-05-20,John Doe,,,";
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'warranty_import_template.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }


    async function handleUpload(preview: boolean = true) {
        if (!selectedFile) return

        setUploading(true)
        setMessage(null)
        if (preview) {
            setResult(null)
            setPreviewData(null)
        } else {
            setProgress(0)
        }

        try {
            if (preview) {
                const formData = new FormData()
                formData.append('file', selectedFile)

                const url = '/api/warranty/import?preview=true'

                const res = await fetch(url, {
                    method: 'POST',
                    body: formData
                })

                const data = await res.json()

                if (!res.ok) {
                    throw new Error(data.error || 'Failed to import data')
                }

                if (data.preview && Array.isArray(data.preview)) {
                    setPreviewData(data.preview)
                    if (data.errors && data.errors.length > 0) {
                        setResult({ errors: data.errors }) // Show parsing errors if any
                    }
                } else {
                    throw new Error("Invalid preview data received")
                }
            } else {
                // Chunked Import Logic
                if (!previewData) return

                const chunks = chunkArray(previewData, 50)
                let successCount = 0
                let errorCount = 0
                const allErrors: any[] = []
                let processedDocs = 0

                for (let i = 0; i < chunks.length; i++) {
                    const chunk = chunks[i]

                    const res = await fetch('/api/warranty/import', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ items: chunk })
                    })

                    const data = await res.json()

                    if (!res.ok) {
                        errorCount += chunk.length
                        allErrors.push(`Batch ${i + 1} failed: ${data.error || res.statusText}`)
                    } else {
                        successCount += data.successCount
                        errorCount += data.errorCount
                        if (data.errors) {
                            allErrors.push(...data.errors.map((e: any) => `${e.serial}: ${e.error}`))
                        }
                    }

                    processedDocs += chunk.length
                    setProgress(Math.round((processedDocs / previewData.length) * 100))
                }

                setPreviewData(null)
                setProgress(null)
                setResult({ 
                    totalRows: previewData.length,
                    successCount,
                    errorCount,
                    errors: allErrors 
                })
                setIsSummaryOpen(true) // Open summary modal

                if (errorCount === 0) {
                    setMessage({
                        type: 'success',
                        text: `Successfully imported ${successCount} historical records!`
                    })
                    setSelectedFile(null)
                } else {
                    setMessage({
                        type: 'error',
                        text: `Import completed. Check summary details.`
                    })
                }
            }

        } catch (error: any) {
            setMessage({ type: 'error', text: error.message })
            setProgress(null)
        } finally {
            setUploading(false)
        }
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/settings" className="p-2 rounded-full hover:bg-gray-100">
                    <ArrowLeft className="h-5 w-5 text-gray-500" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Import Historical Warranty Data</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Upload past sales data to track warranty for items sold before this system was used.
                    </p>
                </div>
            </div>

            {/* Message */}
            {message && (
                <div className={`border-l-4 p-4 ${message.type === 'success' ? 'bg-green-50 border-green-400' : 'bg-red-50 border-red-400'}`}>
                    <div className="flex">
                        <div className="flex-shrink-0">
                            {message.type === 'success' ? <CheckCircle className="h-5 w-5 text-green-400" /> : <AlertCircle className="h-5 w-5 text-red-400" />}
                        </div>
                        <div className="ml-3">
                            <p className={`text-sm ${message.type === 'success' ? 'text-green-700' : 'text-red-700'}`}>{message.text}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Progress Bar */}
            {progress !== null && (
                <div className="bg-white shadow rounded-lg p-6 mb-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Importing Warranty Data...</h3>
                    <div className="w-full bg-gray-200 rounded-full h-4">
                        <div
                            className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                    <p className="text-sm text-gray-500 mt-2 text-right">{progress}% Complete</p>
                </div>
            )}

            {!previewData ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Upload Section */}
                    <div className="bg-white shadow rounded-lg p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <Upload className="h-6 w-6 text-blue-600" />
                            <h2 className="text-lg font-semibold text-gray-900">Upload CSV</h2>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Select File</label>
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={handleFileSelect}
                                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                />
                                {selectedFile && (
                                    <p className="mt-2 text-sm text-gray-600">
                                        Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                                    </p>
                                )}
                            </div>

                            <button
                                onClick={() => handleUpload(true)}
                                disabled={!selectedFile || uploading}
                                className="w-full flex justify-center items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                            >
                                {uploading ? 'Processing...' : 'Preview Import'}
                            </button>
                        </div>
                    </div>

                    {/* Instructions */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <Info className="h-6 w-6 text-blue-600" />
                            <h2 className="text-lg font-semibold text-gray-900">Instructions</h2>
                        </div>
                        <ul className="space-y-2 text-sm text-gray-700 list-disc list-inside">
                            <li>File must be in <strong>.CSV</strong> format.</li>
                            <li><strong>SKU</strong> must match an existing product in the system.</li>
                            <li><strong>Items are marked as SOLD</strong> and will not affect current inventory counts.</li>
                            <li>Use this tool only for items <strong>sold previously</strong>.</li>
                            <li>Optional fields: <strong>invoiceNumber</strong> and <strong>notes</strong> can be added for better tracking.</li>
                        </ul>

                        <button
                            onClick={handleDownloadTemplate}
                            className="mt-6 w-full flex justify-center items-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50"
                        >
                            <Download className="h-4 w-4" />
                            Download Template
                        </button>
                    </div>
                </div>
            ) : (
                /* Preview Section */
                <div className="bg-white shadow rounded-lg overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 bg-amber-50 flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-medium text-amber-900 flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                Review Historical Data
                            </h3>
                            <p className="text-sm text-amber-700 mt-1">
                                Found {previewData.length} valid records. Please verify before importing.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setPreviewData(null)
                                    setResult(null)
                                }}
                                className="px-4 py-2 bg-white border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleUpload(false)}
                                disabled={uploading}
                                className="px-4 py-2 bg-green-600 text-white shadow-sm text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50"
                            >
                                {uploading ? 'Importing...' : 'Confirm Import'}
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                        <table className="min-w-full divide-y divide-gray-200 sticky top-0">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Serial Number</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product SKU</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sold Date</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Warranty Expiry</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {previewData.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.serialNumber}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.sku}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.customer}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.soldDate}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.warrantyExpiry}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.invoiceNumber || '-'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate" title={item.notes}>{item.notes || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            {/* Import Summary Modal */}
            {result && !previewData && (
                <ImportSummaryModal 
                    isOpen={isSummaryOpen}
                    onClose={() => setIsSummaryOpen(false)}
                    totalRows={result.totalRows || 0}
                    successCount={result.successCount || 0}
                    errorCount={result.errorCount || 0}
                    errors={result.errors || []}
                />
            )}

            {/* Parsing Errors Detail (Preview Mode only) */}
            {result && previewData && result.errors && result.errors.length > 0 && (
                <div className="bg-white shadow rounded-lg p-6">
                    <h3 className="text-md font-semibold text-red-600 mb-3">
                        Parsing Errors (Will be skipped)
                    </h3>
                    <div className="bg-red-50 p-4 rounded-md text-sm text-red-700 font-mono space-y-1 max-h-40 overflow-y-auto">
                        {result.errors.map((err: string, i: number) => (
                            <div key={i}>{err}</div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
