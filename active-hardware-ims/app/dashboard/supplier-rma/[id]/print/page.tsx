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

async function getSupplierRma(id: string) {
    const srma = await (prisma.supplierRMA as any).findUnique({
        where: { id },
        include: {
            defectiveItem: { include: { product: true } },
            supplier: true,
            receivedItem: { include: { product: true } }
        }
    })
    return srma
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { id } = await params
    const srma = await getSupplierRma(id)
    return { title: srma ? `Supplier RMA - ${srma.rmaNumber}` : 'Supplier RMA' }
}

export default async function PrintSupplierRmaPage({ params }: PageProps) {
    let srma
    try {
        const { id } = await params
        srma = await getSupplierRma(id)
    } catch (error: any) {
        return (
            <div className="p-8 text-center text-red-600">
                <h1 className="text-xl font-bold mb-4">Error Loading Supplier RMA</h1>
                <pre className="text-left bg-gray-100 p-4 rounded overflow-auto max-w-2xl mx-auto">
                    {error.message}
                </pre>
            </div>
        )
    }

    if (!srma) notFound()

    return (
        <PrintLayout>
            <PrintButton autoPrint={true} label="Print Packing Slip" />

            <DocumentHeader title="SUPPLIER RMA PACKING SLIP" titleNextToLogo={true} />

            <div className="print-info-grid">
                <div className="print-info-section">
                    <h3>Ship To (Supplier)</h3>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '5px' }}>
                        {srma.supplier.name}
                    </div>
                </div>

                <div className="print-info-section">
                    <h3>RMA Details</h3>
                    <div className="print-info-row">
                        <span className="label">RMA Number:</span>
                        <span className="value font-bold">{srma.rmaNumber}</span>
                    </div>
                    {srma.supplierRmaRef && (
                        <div className="print-info-row">
                            <span className="label">Supplier Ref:</span>
                            <span className="value">{srma.supplierRmaRef}</span>
                        </div>
                    )}
                    <div className="print-info-row">
                        <span className="label">Invoiced Date:</span>
                        <span className="value">{formatDate(srma.createdAt)}</span>
                    </div>
                    <div className="print-info-row">
                        <span className="label">Status:</span>
                        <span className="value">{srma.status}</span>
                    </div>
                </div>
            </div>

            {srma.notes && (
                <div className="print-notes">
                    <div className="print-notes-label">Notes / Instructions</div>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{srma.notes}</div>
                </div>
            )}

            <table className="print-table">
                <thead>
                    <tr>
                        <th style={{ width: '15%' }}>Status</th>
                        <th style={{ width: '40%' }}>Product / Description</th>
                        <th style={{ width: '20%' }}>Model</th>
                        <th style={{ width: '25%' }}>Serial Number</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style={{ fontWeight: 'bold', color: '#b91c1c' }}>DEFECTIVE</td>
                        <td>
                            <div style={{ fontWeight: 'bold' }}>
                                {srma.defectiveItem.product.brand} {srma.defectiveItem.product.name}
                            </div>
                        </td>
                        <td>{srma.defectiveItem.product.model}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: '13px' }}>
                            {srma.defectiveItem.serialNumber}
                        </td>
                    </tr>
                </tbody>
            </table>

            {srma.outcome && (
                <div className="print-notes" style={{ marginTop: '20px', border: '1px solid #e5e7eb' }}>
                    <div className="print-notes-label" style={{ backgroundColor: '#f3f4f6' }}>Resolution Outcome</div>
                    <div style={{ padding: '10px' }}>
                        <p style={{ fontWeight: 'bold' }}>Outcome: <span className="text-blue-600">{srma.outcome}</span></p>
                        {srma.outcomeNotes && <p style={{ marginTop: '5px' }}>{srma.outcomeNotes}</p>}
                    </div>
                </div>
            )}

            <div className="print-signatures" style={{ marginTop: '100px' }}>
                <div className="print-signature-box">
                    <p>Packed By (Warehouse)</p>
                </div>
                <div className="print-signature-box">
                    <p>Received By (Supplier / Courier)</p>
                </div>
            </div>

            <div className="no-print print-footer">
                Generated on {formatDateTime(new Date())}
            </div>

            <DocumentFooter />
        </PrintLayout>
    )
}
