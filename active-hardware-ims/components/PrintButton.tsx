"use client"

import { Printer } from "lucide-react"

export default function PrintButton() {
    return (
        <button
            className="print-button no-print flex items-center gap-2 mb-4"
            onClick={() => window.print()}
        >
            <Printer className="w-4 h-4" />
            Print Packing Slip
        </button>
    )
}
