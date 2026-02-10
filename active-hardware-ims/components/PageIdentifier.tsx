"use client"

import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

export default function PageIdentifier() {
    const pathname = usePathname()
    const [pageCode, setPageCode] = useState("")

    useEffect(() => {
        // Generate a code based on the path
        if (!pathname) return

        let code = "HOME"

        if (pathname.startsWith("/dashboard")) {
            const parts = pathname.split('/').filter(Boolean)
            // parts[0] is 'dashboard'

            if (parts.length === 1) code = "DASH-MAIN"
            else if (parts[1] === "inventory") code = "INV-LIST"
            else if (parts[1] === "products") code = "PROD-LIST"
            else if (parts[1] === "transactions") {
                if (parts.length === 2) code = "TRANS-LIST"
                else if (parts[2] === "purchase-orders") {
                    if (parts.length === 3) code = "PO-LIST"
                    else if (parts[3] === "new") code = "PO-NEW"
                    else if (parts.length === 4) code = "PO-DET"
                    else if (parts[4] === "edit") code = "PO-EDIT"
                }
                else if (parts[2] === "invoices") {
                    if (parts.length === 3) code = "INV-LIST"
                    else if (parts[3] === "new") code = "INV-NEW"
                    else if (parts.length === 4) code = "INV-DET"
                    else if (parts[4] === "edit") code = "INV-EDIT"
                }
                else if (parts[2] === "delivery-orders") {
                    if (parts.length === 3) code = "DO-LIST"
                    else if (parts[3] === "new") code = "DO-NEW"
                    else if (parts.length === 4) code = "DO-DET"
                    else if (parts[4] === "edit") code = "DO-EDIT"
                }
            }
            else if (parts[1] === "stock-movements") code = "STK-MOV"
            else if (parts[1] === "reports") code = "RPT-MAIN"
            else if (parts[1] === "settings") code = "SETTINGS"
            else if (parts[1] === "customers") code = "CUST-LIST"
        }
        else if (pathname.startsWith("/print")) {
            const parts = pathname.split('/').filter(Boolean)
            if (parts[1] === "delivery-orders") code = "PRT-DO"
        }

        setPageCode(code)

    }, [pathname])

    if (!pageCode) return null

    return (
        <div className="fixed left-0 bottom-4 z-50 bg-gray-900 text-white text-[10px] px-1 py-0.5 opacity-50 hover:opacity-100 transition-opacity font-mono pointer-events-none select-none rounded-r-sm shadow-sm writing-mode-vertical-lr" title={`Page ID: ${pageCode}`}>
            {pageCode}
        </div>
    )
}
