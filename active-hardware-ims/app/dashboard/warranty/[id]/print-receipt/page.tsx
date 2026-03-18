import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import { formatDate, formatDateTime } from "@/lib/utils"
import DocumentHeader from "@/components/DocumentHeader"
import DocumentFooter from "@/components/DocumentFooter"
import PrintButton from "@/components/PrintButton"
import PrintLayout from "@/components/print/PrintLayout"
import { Metadata } from "next"

interface PageProps {
    params: Promise<{ id: string }>
}

async function getWarrantyClaim(id: string) {
    const claim = await (prisma.warrantyClaim as any).findUnique({
        where: { id },
        include: {
            inventoryItem: {
                include: {
                    product: true,
                    location: true
                }
            }
        }
    })
    return claim
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { id } = await params
    const claim = await getWarrantyClaim(id)
    return { title: claim ? `RMA Receipt - ${claim.id.slice(0,8).toUpperCase()}` : 'RMA Receipt' }
}

export default async function PrintRmaReceiptPage({ params }: PageProps) {
    let claim
    try {
        const { id } = await params
        claim = await getWarrantyClaim(id)
    } catch (error: any) {
        return (
            <div className="p-8 text-center text-red-600">
                <h1 className="text-xl font-bold mb-4">Error Loading Claim</h1>
                <pre className="text-left bg-gray-100 p-4 rounded overflow-auto max-w-2xl mx-auto">
                    {error.message}
                </pre>
            </div>
        )
    }

    if (!claim) notFound()

    return (
        <PrintLayout>
            <PrintButton autoPrint={true} label="Print RMA Receipt" />

            <DocumentHeader title="RMA GOODS RECEIPT" titleNextToLogo={true} />

            <div className="print-info-grid">
                <div className="print-info-section">
                    <h3>Customer Information</h3>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '5px' }}>
                        {claim.customerName}
                    </div>
                </div>

                <div className="print-info-section">
                    <h3>Claim Details</h3>
                    <div className="print-info-row">
                        <span className="label">Claim ID:</span>
                        <span className="value font-mono">{claim.id.toUpperCase()}</span>
                    </div>
                    <div className="print-info-row">
                        <span className="label">Date Received:</span>
                        <span className="value">{formatDate(claim.createdAt)}</span>
                    </div>
                    <div className="print-info-row">
                        <span className="label">Status:</span>
                        <span className="value">{claim.status}</span>
                    </div>
                </div>
            </div>

            {claim.description && (
                <div className="print-notes">
                    <div className="print-notes-label">Reported Issue / Notes</div>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{claim.description}</div>
                </div>
            )}

            <table className="print-table">
                <thead>
                    <tr>
                        <th style={{ width: '40%' }}>Product / Description</th>
                        <th style={{ width: '25%' }}>Model</th>
                        <th style={{ width: '35%' }}>Serial Number</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>
                            <div style={{ fontWeight: 'bold' }}>
                                {claim.inventoryItem.product.brand} {claim.inventoryItem.product.name}
                            </div>
                        </td>
                        <td>{claim.inventoryItem.product.model}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: '13px' }}>
                            {claim.inventoryItem.serialNumber}
                        </td>
                    </tr>
                </tbody>
            </table>

            <div className="print-signatures">
                <div className="print-signature-box">
                    <p>Received By (Warehouse)</p>
                </div>
                <div className="print-signature-box">
                    <p>Deposited By (Customer / Representative)</p>
                </div>
            </div>

            <div className="no-print print-footer">
                Generated on {formatDateTime(new Date())}
            </div>

            <DocumentFooter />
        </PrintLayout>
    )
}
