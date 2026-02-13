"use client"

import { useState } from "react"
import { Upload, Download, FileText, CheckCircle, AlertCircle, Info, ArrowLeft, Users } from "lucide-react"
import Link from "next/link"

export default function PartnerImportPage() {
    const [uploading, setUploading] = useState(false)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [result, setResult] = useState<any | null>(null)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const [previewData, setPreviewData] = useState<any[] | null>(null)

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
        }
    }

    function handleDownloadTemplate() {
        const headers = "name,type,email,phone,address,taxid,locationlabel,locationaddress,locationcontact,employeename,employeeemail,employeerole";
        const row1 = "Acme Corp,Partner,info@acme.com,555-0100,123 Main St,TAX-12345,HQ,123 Main St,Reception,John Doe,john@acme.com,Manager";
        const row2 = "Acme Corp,Partner,info@acme.com,555-0100,123 Main St,TAX-12345,Warehouse,456 Ind Park,Logistics,Jane Smith,jane@acme.com,Logistics Lead";
        const row3 = "Tech Solutions,Customer,support@tech.com,555-9999,789 Tech Blvd,,Head Office,789 Tech Blvd,Admin,,,";

        const csvContent = `${headers}\n${row1}\n${row2}\n${row3}`;
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'partner_import_template.csv';
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
        }

        try {
            const formData = new FormData()
            formData.append('file', selectedFile)

            const url = preview ? '/api/customers/import?preview=true' : '/api/customers/import'

            const res = await fetch(url, {
                method: 'POST',
                body: formData
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Failed to import data')
            }

            if (preview) {
                if (data.preview && Array.isArray(data.preview)) {
                    setPreviewData(data.preview)
                    if (data.errors && data.errors.length > 0) {
                        setResult({ errors: data.errors }) // Show parsing errors if any
                    }
                } else {
                    throw new Error("Invalid preview data received")
                }
            } else {
                // Final Import Result
                setResult(data)
                setPreviewData(null)
                if (data.errors.length === 0) {
                    setMessage({
                        type: 'success',
                        text: `Import complete! Created: ${data.created}, Updated: ${data.updated}`
                    })
                    setSelectedFile(null) // Clear file on success
                } else {
                    setMessage({
                        type: 'error',
                        text: `Import finished with some errors. Created: ${data.created}, Updated: ${data.updated}`
                    })
                }
            }

        } catch (error: any) {
            setMessage({ type: 'error', text: error.message })
        } finally {
            setUploading(false)
        }
    }

    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 10

    const totalPages = previewData ? Math.ceil(previewData.length / itemsPerPage) : 0
    const currentData = previewData ? previewData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage) : []

    function handlePageChange(newPage: number) {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage)
        }
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/settings/customers" className="p-2 rounded-full hover:bg-gray-100">
                    <ArrowLeft className="h-5 w-5 text-gray-500" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Bulk Import Partners</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Import customers, suppliers, and partners with their locations and employees.
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
                                <label className="block text-sm font-medium text-gray-700 mb-2">Select CSV File</label>
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
                            <h2 className="text-lg font-semibold text-gray-900">How Importing Works</h2>
                        </div>

                        <div className="text-sm text-gray-700 space-y-3">
                            <p>
                                The system uses the <strong>Name</strong> column to group data.
                            </p>
                            <p>
                                <strong>To add multiple locations or employees:</strong><br />
                                Simply repeat the partner's name on multiple rows.
                            </p>

                            <div className="bg-white p-3 rounded border border-blue-200 text-xs font-mono overflow-x-auto">
                                Name,Type,LocationLabel,EmployeeName<br />
                                Acme,Partner,HQ,John Doe<br />
                                Acme,Partner,Warehouse,Jane Smith
                            </div>

                            <p className="italic text-gray-600">
                                result: One partner "Acme" with 2 locations and 2 employees.
                            </p>
                        </div>

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
                <div className="bg-white shadow rounded-lg overflow-hidden flex flex-col h-[calc(100vh-200px)] max-h-[800px]">
                    <div className="px-6 py-4 border-b border-gray-200 bg-amber-50 flex justify-between items-center flex-shrink-0">
                        <div>
                            <h3 className="text-lg font-medium text-amber-900 flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                Review Import Data
                            </h3>
                            <p className="text-sm text-amber-700 mt-1">
                                Found {previewData.length} unique partners/customers. Please verify before importing.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setPreviewData(null)
                                    setResult(null)
                                    setCurrentPage(1)
                                    // Keep selected file
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

                    <div className="overflow-auto flex-grow">
                        <table className="min-w-full divide-y divide-gray-200 relative">
                            <thead className="bg-gray-50 sticky top-0 z-10">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 filter drop-shadow-sm">Partner Name</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 filter drop-shadow-sm">Roles</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 filter drop-shadow-sm">Contact</th>
                                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 filter drop-shadow-sm">Locations</th>
                                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 filter drop-shadow-sm">Employees</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {currentData.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{item.name}</div>
                                            <div className="text-xs text-gray-500">{item.taxId}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-wrap gap-1">
                                                {item.roles.isPartner && <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">Partner</span>}
                                                {item.roles.isCustomer && <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Customer</span>}
                                                {item.roles.isSupplier && <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">Supplier</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{item.email}</div>
                                            <div className="text-sm text-gray-500">{item.phone}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                                            <span className="font-bold text-gray-900">{item.locations.length}</span>
                                            {item.locations.length > 0 && (
                                                <div className="text-xs text-gray-400 mt-1 max-w-[150px] truncate mx-auto">
                                                    {item.locations.map((l: any) => l.label).join(', ')}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                                            <span className="font-bold text-gray-900">{item.employees.length}</span>
                                            {item.employees.length > 0 && (
                                                <div className="text-xs text-gray-400 mt-1 max-w-[150px] truncate mx-auto">
                                                    {item.employees.map((e: any) => e.name).join(', ')}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between flex-shrink-0">
                            <div className="flex-1 flex justify-between sm:hidden">
                                <button
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Next
                                </button>
                            </div>
                            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-sm text-gray-700">
                                        Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, previewData.length)}</span> of <span className="font-medium">{previewData.length}</span> results
                                    </p>
                                </div>
                                <div>
                                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                        <button
                                            onClick={() => handlePageChange(currentPage - 1)}
                                            disabled={currentPage === 1}
                                            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                        >
                                            <span className="sr-only">Previous</span>
                                            {/* ChevronLeft icon */}
                                            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        </button>

                                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                            // Simple logic for page numbers, improving could be complex but this suffices for basic nav
                                            // Let's just show current page and neighbors if many
                                            let pageNum = i + 1;
                                            if (totalPages > 5) {
                                                if (currentPage > 3) {
                                                    pageNum = currentPage - 2 + i;
                                                }
                                                if (pageNum > totalPages) return null;
                                            }

                                            return (
                                                <button
                                                    key={pageNum}
                                                    onClick={() => handlePageChange(pageNum)}
                                                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${currentPage === pageNum
                                                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                                        }`}
                                                >
                                                    {pageNum}
                                                </button>
                                            )
                                        })}

                                        <button
                                            onClick={() => handlePageChange(currentPage + 1)}
                                            disabled={currentPage === totalPages}
                                            className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                        >
                                            <span className="sr-only">Next</span>
                                            {/* ChevronRight icon */}
                                            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    </nav>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Results Detail (Errors) */}
            {result && result.errors && result.errors.length > 0 && (
                <div className="bg-white shadow rounded-lg p-6">
                    <h3 className="text-md font-semibold text-red-600 mb-3">
                        {previewData ? "Parsing Errors (Will be skipped)" : "Import Errors"}
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
