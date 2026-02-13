"use client"

import { useState } from "react"
import { Upload, Download, FileText, CheckCircle, AlertCircle, Info, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function WarrantyImportPage() {
    const [uploading, setUploading] = useState(false)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [result, setResult] = useState<any | null>(null)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

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
        }
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


    async function handleUpload() {
        if (!selectedFile) return

        setUploading(true)
        setMessage(null)
        setResult(null)

        try {
            const formData = new FormData()
            formData.append('file', selectedFile)

            const res = await fetch('/api/warranty/import', {
                method: 'POST',
                body: formData
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Failed to import data')
            }

            setResult(data)

            if (data.failed === 0) {
                setMessage({
                    type: 'success',
                    text: `Successfully imported ${data.success} local records!`
                })
            } else {
                setMessage({
                    type: 'error',
                    text: `Import completed with issues. Success: ${data.success}, Failed: ${data.failed}`
                })
            }

            setSelectedFile(null)
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message })
        } finally {
            setUploading(false)
        }
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
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
                            onClick={handleUpload}
                            disabled={!selectedFile || uploading}
                            className="w-full flex justify-center items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                            {uploading ? 'Importing...' : 'Start Import'}
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

            {/* Results Detail */}
            {result && result.errors && result.errors.length > 0 && (
                <div className="bg-white shadow rounded-lg p-6">
                    <h3 className="text-md font-semibold text-red-600 mb-3">Import Errors</h3>
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
