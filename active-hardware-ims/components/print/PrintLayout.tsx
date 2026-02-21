import '@/styles/print.css'

interface PrintLayoutProps {
    children: React.ReactNode
}

/**
 * PrintLayout — wraps all print pages.
 * Imports the shared print.css so brand tokens and layout classes
 * are available without repeating an inline <style> block.
 *
 * Usage:
 *   <PrintLayout>
 *     <DocumentHeader title="INVOICE" />
 *     ... content using .print-table, .print-info-grid, etc. ...
 *     <DocumentFooter />
 *   </PrintLayout>
 */
export default function PrintLayout({ children }: PrintLayoutProps) {
    return (
        <div className="fixed inset-0 z-50 bg-white overflow-auto">
            <div className="print-container">
                {children}
            </div>
        </div>
    )
}
