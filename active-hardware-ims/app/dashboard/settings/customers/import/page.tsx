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
                <div className="bg-white shadow rounded-lg overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 bg-amber-50 flex justify-between items-center">
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

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Partner Name</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roles</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Locations</th>
                                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Employees</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {previewData.map((item, idx) => (
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
