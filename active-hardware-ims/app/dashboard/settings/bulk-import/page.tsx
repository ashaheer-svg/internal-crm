"use client"

import { useState } from "react"
import { Upload, Download, FileText, CheckCircle, AlertCircle, Info } from "lucide-react"
import BackButton from "@/components/BackButton"

type ImportResult = {
    success: boolean
    totalRows: number
    successCount: number
    errorCount: number
    skippedCount: number
    errors: Array<{ row: number; sku: string; error: string }>
    createdProducts: Array<{ sku: string; name: string }>
    updatedProducts: Array<{ sku: string; name: string }>
}

export default function BulkImportPage() {
    const [uploading, setUploading] = useState(false)
    const [progress, setProgress] = useState<number | null>(null)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [result, setResult] = useState<ImportResult | null>(null)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const [previewData, setPreviewData] = useState<any[] | null>(null)

    function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]

        if (!file) return

        if (!file.name.toLowerCase().endsWith('.csv')) {
            setMessage({ type: 'error', text: 'Please select a CSV file' })
            return
        }

        setSelectedFile(file)
        setMessage(null)
        setResult(null)
        setPreviewData(null)
        setProgress(null)
    }

    function chunkArray<T>(array: T[], size: number): T[][] {
        const chunks: T[][] = []
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size))
        }
        return chunks
    }

    async function handleDownloadTemplate() {
        try {
            const res = await fetch('/api/products/bulk-import')

            if (!res.ok) throw new Error('Failed to download template')

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
            setMessage({ type: 'error', text: error.message || 'Download failed' })
        }
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
                // ... Existing Preview Logic ...
                const formData = new FormData()
                formData.append('file', selectedFile)

                const res = await fetch('/api/products/bulk-import?preview=true', {
                    method: 'POST',
                    body: formData
                })

                const data = await res.json()

                if (!res.ok) {
                    throw new Error(data?.error || 'Failed to parse file')
                }

                if (Array.isArray(data?.preview)) {
                    setPreviewData(data.preview)

                    if (data.errors?.length > 0) {
                        setResult({
                            success: false,
                            totalRows: data.totalRows || 0,
                            successCount: data.successCount || 0,
                            errorCount: data.errorCount || 0,
                            skippedCount: data.skippedCount || 0,
                            errors: data.errors,
                            createdProducts: [],
                            updatedProducts: []
                        })
                    }
                } else {
                    throw new Error("Invalid preview data received")
                }

            } else {
                if (!previewData || previewData.length === 0) return

                const chunks = chunkArray(previewData, 50)

                let successCount = 0
                let errorCount = 0
                let skippedCount = 0
                const allErrors: any[] = []

                let processedDocs = 0

                for (let i = 0; i < chunks.length; i++) {
                    const chunk = chunks[i]

                    try {
                        const res = await fetch('/api/products/bulk-import', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ products: chunk })
                        })

                        const data = await res.json()

                        if (!res.ok) {
                            errorCount += chunk.length
                            allErrors.push({
                                row: i,
                                sku: 'BATCH',
                                error: `Batch ${i + 1} failed: ${data?.error || res.statusText}`
                            })
                        } else {
                            successCount += data?.successCount || 0
                            errorCount += data?.errorCount || 0
                            skippedCount += data?.skippedCount || 0

                            if (Array.isArray(data?.errors)) {
                                allErrors.push(...data.errors)
                            }
                        }

                    } catch (err: any) {
                        errorCount += chunk.length
                        allErrors.push({
                            row: i,
                            sku: 'BATCH',
                            error: `Batch ${i + 1} crashed: ${err.message}`
                        })
                    }

                    processedDocs += chunk.length
                    setProgress(Math.round((processedDocs / previewData.length) * 100))
                }

                setPreviewData(null)
                setProgress(null)

                const finalResult: ImportResult = {
                    success: errorCount === 0,
                    totalRows: previewData.length,
                    successCount,
                    errorCount,
                    skippedCount,
                    errors: allErrors,
                    createdProducts: [],
                    updatedProducts: []
                }

                setResult(finalResult)

                if (errorCount === 0) {
                    setMessage({
                        type: 'success',
                        text: `Successfully imported ${successCount} products!`
                    })
                    setSelectedFile(null)
                } else {
                    setMessage({
                        type: 'error',
                        text: `Import finished with ${errorCount} errors. See details below.`
                    })
                }
            }

        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'Upload failed' })
            setProgress(null)
        } finally {
            setUploading(false)
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <BackButton className="mb-4" />
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

            {/* Progress Bar */}
            {progress !== null && (
                <div className="bg-white shadow rounded-lg p-6 mb-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Importing Products...</h3>
                    <div className="w-full bg-gray-200 rounded-full h-4">
                        <div
                            className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <p className="text-sm text-gray-500 mt-2 text-right">{progress}% Complete</p>
                </div>
            )}

            {!previewData ? (
                <>
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
                                onClick={() => handleUpload(true)}
                                disabled={!selectedFile || uploading}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Upload className="h-4 w-4" />
                                {uploading ? 'Processing...' : 'Preview Import'}
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
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm"
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
                </>
            ) : (
                /* Preview Section */
                <div className="bg-white shadow rounded-lg overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 bg-amber-50 flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-medium text-amber-900 flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                Review Product Data
                            </h3>
                            <p className="text-sm text-amber-700 mt-1">
                                Found {previewData.length} valid products. Please verify before importing.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setPreviewData(null)
                                    setResult(null)
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleUpload(false)}
                                disabled={uploading}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-600 text-sm font-medium text-white hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {uploading ? 'Importing...' : 'Confirm Import'}
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                        <table className="min-w-full divide-y divide-gray-200 sticky top-0">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand / Category</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Desc</th>
                                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Warranty</th>
                                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Low ($)</th>
                                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Reseller ($)</th>
                                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {previewData.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.sku}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <div>{item.brand}</div>
                                            <div className="text-xs text-gray-400">{item.category}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.model}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate" title={item.description}>{item.description || '-'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{item.minStock}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{item.warrantyMonths}m</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{item.lowResellerPrice}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{item.resellerPrice}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                                            {item.serviceDefinition ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                                    YES ({item.serviceDefinition.create?.type || 'LICENSE'})
                                                </span>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Results */}
            {result && (
                <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Import Results</h2>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <p className="text-sm text-gray-600">Total Rows</p>
                            <p className="text-2xl font-bold text-gray-900">{result.totalRows}</p>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg">
                            <p className="text-sm text-green-600">New Products</p>
                            <p className="text-2xl font-bold text-green-900">{result.createdProducts.length || (result.successCount - (result.updatedProducts?.length || 0))}</p>
                        </div>
                        <div className="bg-blue-50 p-4 rounded-lg">
                            <p className="text-sm text-blue-600">Updated (Price Changed)</p>
                            <p className="text-2xl font-bold text-blue-900">{result.updatedProducts?.length || 0}</p>
                        </div>
                        {(result.skippedCount > 0) && (
                            <div className="bg-yellow-50 p-4 rounded-lg">
                                <p className="text-sm text-yellow-600">Skipped (No Change)</p>
                                <p className="text-2xl font-bold text-yellow-900">{result.skippedCount}</p>
                            </div>
                        )}
                        {result.errorCount > 0 && (
                            <div className="bg-red-50 p-4 rounded-lg">
                                <p className="text-sm text-red-600">Failed</p>
                                <p className="text-2xl font-bold text-red-900">{result.errorCount}</p>
                            </div>
                        )}
                    </div>

                    {result.errors.length > 0 && (
                        <div>
                            <h3 className="text-md font-semibold text-red-700 mb-3">Error Details</h3>
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
                            <li><code className="bg-gray-100 px-1 rounded">isService</code> - Mark as service (true/false)</li>
                            <li><code className="bg-gray-100 px-1 rounded">serviceType</code> - LICENSE, AMC, RENTAL, or LABOR (default: LICENSE)</li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="font-semibold text-gray-900 mb-2">Important Notes</h3>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                            <li>If a SKU already exists and the prices are different, the prices will be updated</li>
                            <li>If a SKU already exists and the prices are the same, it will be skipped</li>
                            <li>If a SKU does not exist, a new product will be created</li>
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
                            {`sku,name,brand,category,model,description,minStock,warrantyMonths,lowResellerPrice,resellerPrice,isService,serviceType
SKU001,Product A,Brand X,Electronics,Model 1,High quality,10,12,45.00,50.00,false,
SKU002,AMC 1 Year,Brand Y,Services,Model 2,Durable,0,0,90.00,100.00,true,AMC`}
                        </pre>
                    </div>
                </div>
            </div>
        </div>
    )
}
