"use client"

import { useEffect } from "react"
import { Printer } from "lucide-react"

interface PrintButtonProps {
    label?: string
    autoPrint?: boolean
}

export default function PrintButton({ label = "Print", autoPrint = false }: PrintButtonProps) {
    useEffect(() => {
        if (autoPrint) {
            window.print()
        }
    }, [autoPrint])

    return (
        <button
            onClick={() => window.print()}
            className="print-button no-print inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
            <Printer className="w-4 h-4" />
            {label}
        </button>
    )
}
