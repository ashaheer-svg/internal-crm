"use client"

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface PaginationControlsProps {
    currentPage: number
    totalPages: number
    onPageChange: (page: number) => void
    totalResults?: number
    limit?: number
    className?: string
}

export default function PaginationControls({
    currentPage,
    totalPages,
    onPageChange,
    totalResults,
    limit,
    className
}: PaginationControlsProps) {
    if (totalPages <= 1 && !totalResults) return null

    const renderPageNumbers = () => {
        const pages = []
        const maxPagesToShow = 5

        let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2))
        let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1)

        if (endPage - startPage + 1 < maxPagesToShow) {
            startPage = Math.max(1, endPage - maxPagesToShow + 1)
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(
                <button
                    key={i}
                    onClick={() => onPageChange(i)}
                    className={cn(
                        "relative inline-flex items-center px-4 py-2 text-sm font-bold transition-all duration-200",
                        currentPage === i
                            ? "z-10 bg-blue-600 text-white shadow-lg shadow-blue-200 rounded-xl"
                            : "text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl"
                    )}
                >
                    {i}
                </button>
            )
        }
        return pages
    }

    const startIndex = limit ? (currentPage - 1) * limit + 1 : null
    const endIndex = limit ? Math.min(currentPage * limit, totalResults || 0) : null

    return (
        <div className={cn("flex flex-col sm:flex-row items-center justify-between px-4 py-4 bg-white border-t border-gray-100 gap-4", className)}>
            <div className="flex-1 flex justify-between sm:hidden w-full">
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                >
                    Previous
                </button>
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-4 py-2 text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                >
                    Next
                </button>
            </div>

            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                    {totalResults !== undefined && limit !== undefined ? (
                        <p className="text-sm text-gray-500 font-medium">
                            Showing <span className="font-bold text-gray-900">{startIndex}</span> to{" "}
                            <span className="font-bold text-gray-900">{endIndex}</span> of{" "}
                            <span className="font-bold text-gray-900">{totalResults}</span> results
                        </p>
                    ) : (
                        <p className="text-sm text-gray-500 font-medium">
                            Page <span className="font-bold text-gray-900">{currentPage}</span> of{" "}
                            <span className="font-bold text-gray-900">{totalPages}</span>
                        </p>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <nav className="relative z-0 inline-flex rounded-xl space-x-1" aria-label="Pagination">
                        <button
                            onClick={() => onPageChange(1)}
                            disabled={currentPage === 1}
                            className="relative inline-flex items-center p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            title="First Page"
                        >
                            <ChevronsLeft className="h-4 w-4" />
                        </button>

                        <button
                            onClick={() => onPageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="relative inline-flex items-center p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            title="Previous Page"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>

                        <div className="flex items-center space-x-1 mx-2">
                            {renderPageNumbers()}
                        </div>

                        <button
                            onClick={() => onPageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="relative inline-flex items-center p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            title="Next Page"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>

                        <button
                            onClick={() => onPageChange(totalPages)}
                            disabled={currentPage === totalPages}
                            className="relative inline-flex items-center p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            title="Last Page"
                        >
                            <ChevronsRight className="h-4 w-4" />
                        </button>
                    </nav>
                </div>
            </div>
        </div>
    )
}
