"use client"

import { CheckCircle2, AlertCircle, AlertTriangle, X } from "lucide-react"

type ErrorDetail = {
    row?: number | string
    identifier?: string
    error: string
}

type Props = {
    isOpen: boolean
    onClose: () => void
    title?: string
    totalRows: number
    successCount: number
    errorCount: number
    errors: (string | ErrorDetail)[]
}

export default function ImportSummaryModal({
    isOpen,
    onClose,
    title = "Import Summary",
    totalRows,
    successCount,
    errorCount,
    errors
}: Props) {
    if (!isOpen) return null

    const hasErrors = errorCount > 0
    const isFullSuccess = successCount > 0 && errorCount === 0
    const isFullFailure = successCount === 0 && errorCount > 0

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className={`px-6 py-5 border-b flex items-center justify-between ${
                    isFullSuccess ? "bg-emerald-50 border-emerald-100" :
                    isFullFailure ? "bg-red-50 border-red-100" :
                    "bg-amber-50 border-amber-100"
                }`}>
                    <div className="flex items-center gap-3">
                        {isFullSuccess ? (
                            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                            </div>
                        ) : isFullFailure ? (
                            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                                <AlertCircle className="w-6 h-6 text-red-600" />
                            </div>
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                                <AlertTriangle className="w-6 h-6 text-amber-600" />
                            </div>
                        )}
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
                            <p className={`text-sm font-medium ${
                                isFullSuccess ? "text-emerald-700" :
                                isFullFailure ? "text-red-700" :
                                "text-amber-700"
                            }`}>
                                {isFullSuccess ? "All records imported successfully!" :
                                 isFullFailure ? "Failed to import all records." :
                                 "Import completed with some errors."}
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100/50 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1 bg-gray-50/50">
                    
                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="bg-white border rounded-xl p-4 shadow-sm text-center">
                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Total Rows</p>
                            <p className="text-3xl font-bold text-gray-800">{totalRows}</p>
                        </div>
                        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 shadow-sm text-center">
                            <p className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-1">Successful</p>
                            <p className="text-3xl font-bold text-emerald-700">{successCount}</p>
                        </div>
                        <div className={`border rounded-xl p-4 shadow-sm text-center ${
                            errorCount > 0 ? "bg-red-50 border-red-100" : "bg-white"
                        }`}>
                            <p className={`text-xs font-black uppercase tracking-widest mb-1 ${
                                errorCount > 0 ? "text-red-600" : "text-gray-400"
                            }`}>Failed</p>
                            <p className={`text-3xl font-bold ${
                                errorCount > 0 ? "text-red-700" : "text-gray-800"
                            }`}>{errorCount}</p>
                        </div>
                    </div>

                    {/* Specific Errors List */}
                    {hasErrors && errors.length > 0 && (
                        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                                <h3 className="font-bold text-gray-800 text-sm">Error Details</h3>
                                <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-md">
                                    {errors.length} {errors.length === 1 ? 'issue' : 'issues'} found
                                </span>
                            </div>
                            <div className="divide-y divide-gray-50 max-h-60 overflow-y-auto">
                                {errors.map((err, idx) => {
                                    if (typeof err === 'string') {
                                        return (
                                            <div key={idx} className="px-5 py-3 text-sm text-red-700 font-medium">
                                                {err}
                                            </div>
                                        )
                                    }
                                    return (
                                        <div key={idx} className="px-5 py-3 flex items-start gap-4">
                                            {err.row && (
                                                <div className="flex-shrink-0 mt-0.5 text-xs font-black text-gray-400 uppercase tracking-widest w-12">
                                                    Row {err.row}
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                {err.identifier && (
                                                    <p className="text-xs font-bold text-gray-900 mb-0.5">{err.identifier}</p>
                                                )}
                                                <p className="text-sm text-red-600">{err.error}</p>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t bg-white flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl text-sm font-bold bg-gray-900 text-white hover:bg-gray-800 transition-colors shadow-sm"
                    >
                        {isFullSuccess ? "Done" : "Close & Review Mappings"}
                    </button>
                </div>

            </div>
        </div>
    )
}
