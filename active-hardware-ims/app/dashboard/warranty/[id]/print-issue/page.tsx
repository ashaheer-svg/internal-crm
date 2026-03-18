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

    if (!claim) return null

    let replacementItemDetails = null
    if (claim.replacementItemId) {
        replacementItemDetails = await prisma.inventoryItem.findUnique({
            where: { id: claim.replacementItemId },
            include: { product: true }
        })
    }

    return { ...claim, replacementItemDetails }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { id } = await params
    const claim = await getWarrantyClaim(id)
    return { title: claim ? `RMA Issue - ${claim.id.substring(0,8).toUpperCase()}` : 'RMA Issue' }
}

export default async function PrintRmaIssuePage({ params }: PageProps) {
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
            <PrintButton autoPrint={true} label="Print RMA Issue Note" />

            <DocumentHeader title="RMA GOODS ISSUE" titleNextToLogo={true} />

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
                        <span className="label">Date:</span>
                        <span className="value">{formatDate(new Date())}</span>
                    </div>
                    <div className="print-info-row">
                        <span className="label">Replacement Type:</span>
                        <span className="value">{claim.replacementType || 'None'}</span>
                    </div>
                </div>
            </div>

            <table className="print-table">
                <thead>
                    <tr>
                        <th style={{ width: '15%' }}>Action</th>
                        <th style={{ width: '35%' }}>Product / Description</th>
                        <th style={{ width: '20%' }}>Model</th>
                        <th style={{ width: '30%' }}>Serial Number</th>
                    </tr>
                </thead>
                <tbody>
                    <tr style={{ backgroundColor: '#f9fafb' }}>
                        <td style={{ fontWeight: 'bold', color: '#b91c1c' }}>RETURNED (Defective)</td>
                        <td>
                            <div style={{ fontWeight: 'bold' }}>
                                {claim.inventoryItem.product.brand} {claim.inventoryItem.product.name}
                            </div>
                        </td>
                        <td>{claim.inventoryItem.product.model}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                            {claim.inventoryItem.serialNumber}
                        </td>
                    </tr>
                    {claim.replacementItemDetails && (
                        <tr>
                            <td style={{ fontWeight: 'bold', color: '#15803d' }}>ISSUED (Replacement)</td>
                            <td>
                                <div style={{ fontWeight: 'bold' }}>
                                    {claim.replacementItemDetails.product.brand} {claim.replacementItemDetails.product.name}
                                </div>
                            </td>
                            <td>{claim.replacementItemDetails.product.model}</td>
                            <td style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 'bold' }}>
                                {claim.replacementItemDetails.serialNumber}
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>

            {claim.replacementExternalInfo && (
                <div className="print-notes">
                    <div className="print-notes-label">Replacement Notes / Tracking</div>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{claim.replacementExternalInfo}</div>
                </div>
            )}

            <div className="print-signatures" style={{ marginTop: '80px' }}>
                <div className="print-signature-box">
                    <p>Issued By (Warehouse)</p>
                </div>
                <div className="print-signature-box">
                    <p>Received By (Customer / Representative)</p>
                </div>
            </div>

            <div className="no-print print-footer">
                Generated on {formatDateTime(new Date())}
            </div>

            <DocumentFooter />
        </PrintLayout>
    )
}
