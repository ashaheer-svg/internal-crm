"use client"

import { useState } from "react"
import { Upload, Download, FileText, CheckCircle, AlertCircle, Info } from "lucide-react"

type ImportResult = {
    success: boolean
    totalRows: number
    successCount: number
    errorCount: number
    errors: Array<{ row: number; sku: string; error: string }>
    createdProducts: Array<{ sku: string; name: string }>
}

export default function BulkImportPage() {
    const [uploading, setUploading] = useState(false)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [result, setResult] = useState<ImportResult | null>(null)
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

    async function handleDownloadTemplate() {
        try {
            const res = await fetch('/api/products/bulk-import')

            if (!res.ok) {
                throw new Error('Failed to download template')
            }

            const blob = await res.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = 'product_import_template.csv'
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message })
        }
    }

    async function handleUpload() {
        if (!selectedFile) return

        setUploading(true)
        setMessage(null)
        setResult(null)

        try {
            const formData = new FormData()
            formData.append('file', selectedFile)

            const res = await fetch('/api/products/bulk-import', {
                method: 'POST',
                body: formData
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Failed to import products')
            }

            setResult(data)

            if (data.errorCount === 0) {
                setMessage({
                    type: 'success',
                    text: `Successfully imported ${data.successCount} products!`
                })
            } else {
                setMessage({
                    type: 'error',
                    text: `Imported ${data.successCount} products with ${data.errorCount} errors. See details below.`
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
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">Bulk Import Products</h1>
                <p className="mt-1 text-sm text-gray-500">
                    Import multiple products at once using a CSV file
                </p>
            </div>

            {/* Message */}
            {message && (
                <div className={`border-l-4 p-4 ${message.type === 'success'
                    ? 'bg-green-50 border-green-400'
                    : 'bg-red-50 border-red-400'
                    }`}>
                    <div className="flex">
                        <div className="flex-shrink-0">
                            {message.type === 'success' ? (
                                <CheckCircle className="h-5 w-5 text-green-400" />
                            ) : (
                                <AlertCircle className="h-5 w-5 text-red-400" />
                            )}
                        </div>
                        <div className="ml-3">
                            <p className={`text-sm ${message.type === 'success' ? 'text-green-700' : 'text-red-700'
                                }`}>
                                {message.text}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Upload Section */}
            <div className="bg-white shadow rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Upload className="h-6 w-6 text-blue-600" />
                    <h2 className="text-lg font-semibold text-gray-900">Upload CSV File</h2>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select CSV File
                        </label>
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
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Upload className="h-4 w-4" />
                        {uploading ? 'Importing...' : 'Import Products'}
                    </button>
                </div>
            </div>

            {/* Template Download */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Download className="h-6 w-6 text-blue-600" />
                    <h2 className="text-lg font-semibold text-gray-900">Download CSV Template</h2>
                </div>

                <p className="text-sm text-gray-600 mb-4">
                    Download a CSV template with sample data. The template opens perfectly in Excel and can be edited there.
                </p>

                <button
                    onClick={handleDownloadTemplate}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                    <Download className="h-4 w-4" />
                    Download CSV Template
                </button>
            </div>

            {/* Excel Users Info */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-3">
                    <FileText className="h-6 w-6 text-yellow-600" />
                    <h2 className="text-lg font-semibold text-gray-900">Using Excel?</h2>
                </div>

                <p className="text-sm text-gray-700 mb-3">
                    You can create and edit your product list in Excel, then save it as CSV:
                </p>

                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700 ml-2">
                    <li>Download the CSV template above</li>
                    <li>Open it in Excel (it will open automatically)</li>
                    <li>Edit your product data in Excel</li>
                    <li>Click <strong>File → Save As</strong></li>
                    <li>Choose <strong>CSV (Comma delimited) (*.csv)</strong> as the file type</li>
                    <li>Save and upload the CSV file here</li>
                </ol>

                <p className="text-sm text-gray-600 mt-3 italic">
                    💡 Tip: Excel will warn you about losing features when saving as CSV - this is normal, just click "Yes" to continue.
                </p>
            </div>

            {/* Results */}
            {result && (
                <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Import Results</h2>

                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <p className="text-sm text-gray-600">Total Rows</p>
                            <p className="text-2xl font-bold text-gray-900">{result.totalRows}</p>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg">
                            <p className="text-sm text-green-600">Successful</p>
                            <p className="text-2xl font-bold text-green-900">{result.successCount}</p>
                        </div>
                        <div className="bg-red-50 p-4 rounded-lg">
                            <p className="text-sm text-red-600">Failed</p>
                            <p className="text-2xl font-bold text-red-900">{result.errorCount}</p>
                        </div>
                    </div>

                    {result.errors.length > 0 && (
                        <div>
                            <h3 className="text-md font-semibold text-gray-900 mb-3">Errors</h3>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Row</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Error</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {result.errors.map((error, idx) => (
                                            <tr key={idx}>
                                                <td className="px-4 py-2 text-sm text-gray-900">{error.row}</td>
                                                <td className="px-4 py-2 text-sm text-gray-900">{error.sku}</td>
                                                <td className="px-4 py-2 text-sm text-red-600">{error.error}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Instructions */}
            <div className="bg-white shadow rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Info className="h-6 w-6 text-blue-600" />
                    <h2 className="text-lg font-semibold text-gray-900">CSV Format Instructions</h2>
                </div>

                <div className="space-y-4 text-sm text-gray-600">
                    <div>
                        <h3 className="font-semibold text-gray-900 mb-2">Required Columns</h3>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                            <li><code className="bg-gray-100 px-1 rounded">sku</code> - Unique product identifier</li>
                            <li><code className="bg-gray-100 px-1 rounded">name</code> - Product name</li>
                            <li><code className="bg-gray-100 px-1 rounded">brand</code> - Brand name</li>
                            <li><code className="bg-gray-100 px-1 rounded">category</code> - Product category</li>
                            <li><code className="bg-gray-100 px-1 rounded">model</code> - Model number/name</li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="font-semibold text-gray-900 mb-2">Optional Columns</h3>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                            <li><code className="bg-gray-100 px-1 rounded">description</code> - Product description</li>
                            <li><code className="bg-gray-100 px-1 rounded">minStock</code> - Minimum stock level (number, default: 0)</li>
                            <li><code className="bg-gray-100 px-1 rounded">warrantyMonths</code> - Warranty period in months (number, default: 0)</li>
                            <li><code className="bg-gray-100 px-1 rounded">lowResellerPrice</code> - Low reseller price (number, default: 0)</li>
                            <li><code className="bg-gray-100 px-1 rounded">resellerPrice</code> - Standard reseller price (number, default: 0)</li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="font-semibold text-gray-900 mb-2">Important Notes</h3>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                            <li>SKU must be unique - duplicates will be rejected</li>
                            <li>All price and numeric fields must be non-negative numbers</li>
                            <li>Use decimal point (.) for prices, not comma</li>
                            <li>Maximum file size: 5MB</li>
                            <li>Empty rows will be skipped</li>
                            <li>Column names are case-insensitive</li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="font-semibold text-gray-900 mb-2">Example CSV Format</h3>
                        <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
                            {`sku,name,brand,category,model,description,minStock,warrantyMonths,lowResellerPrice,resellerPrice
SKU001,Product A,Brand X,Electronics,Model 1,High quality,10,12,45.00,50.00
SKU002,Product B,Brand Y,Model 2,Durable,5,24,90.00,100.00`}
                        </pre>
                    </div>
                </div>
            </div>
        </div>
    )
}
