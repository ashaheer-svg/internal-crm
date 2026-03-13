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

interface DeliveryOrderWithRelations {
    id: string
    orderNumber: string
    invoiceNumber: string | null
    customerName: string
    deliveryAddress: string | null
    status: string
    notes: string | null
    createdAt: Date
    items: {
        id: string
        quantity: number
        product: { name: string; brand: string; model: string; sku: string }
        reservedItems: { serialNumber: string }[]
        details: { modelName: string; serialNumbers: string }[]
    }[]
}

async function getOrder(id: string): Promise<DeliveryOrderWithRelations | null> {
    const order = await prisma.deliveryOrder.findUnique({
        where: { id },
        include: { 
            items: { 
                include: { 
                    product: true, 
                    reservedItems: true,
                    details: true
                } 
            } 
        }
    })
    return order as unknown as DeliveryOrderWithRelations | null
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { id } = await params
    const order = await getOrder(id)
    return { title: order ? `Packing Slip - ${order.orderNumber}` : 'Packing Slip' }
}

export default async function PrintDeliveryOrderPage({ params }: PageProps) {
    let order
    try {
        const { id } = await params
        order = await getOrder(id)
    } catch (error: any) {
        return (
            <div className="p-8 text-center text-red-600">
                <h1 className="text-xl font-bold mb-4">Error Loading Order</h1>
                <pre className="text-left bg-gray-100 p-4 rounded overflow-auto max-w-2xl mx-auto">
                    {error.message}
                    {JSON.stringify(error, null, 2)}
                </pre>
            </div>
        )
    }

    if (!order) notFound()

    return (
        <PrintLayout>
            <PrintButton autoPrint={true} label="Print Packing Slip" />

            <DocumentHeader title="PACKING SLIP" titleNextToLogo={true} />

            <div className="print-info-grid">
                <div className="print-info-section">
                    <h3>Ship To</h3>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '5px' }}>
                        {order.customerName}
                    </div>
                    {order.deliveryAddress && (
                        <div style={{ fontSize: '14px', color: '#444', whiteSpace: 'pre-wrap' }}>
                            {order.deliveryAddress}
                        </div>
                    )}
                </div>

                <div className="print-info-section">
                    <h3>Order Details</h3>
                    <div className="print-info-row">
                        <span className="label">Order Number:</span>
                        <span className="value">{order.orderNumber}</span>
                    </div>
                    {order.invoiceNumber && (
                        <div className="print-info-row">
                            <span className="label">Invoice Number:</span>
                            <span className="value">{order.invoiceNumber}</span>
                        </div>
                    )}
                    <div className="print-info-row">
                        <span className="label">Date:</span>
                        <span className="value">{formatDate(order.createdAt)}</span>
                    </div>
                    <div className="print-info-row">
                        <span className="label">Status:</span>
                        <span className="value">{order.status}</span>
                    </div>
                </div>
            </div>

            {order.notes && (
                <div className="print-notes">
                    <div className="print-notes-label">Notes / Instructions</div>
                    <div>{order.notes}</div>
                </div>
            )}

            <table className="print-table">
                <thead>
                    <tr>
                        <th style={{ width: '40%' }}>Item / Description</th>
                        <th style={{ width: '15%', textAlign: 'center' }}>Qty Ord</th>
                        <th style={{ width: '15%', textAlign: 'center' }}>Qty Ship</th>
                        <th style={{ width: '30%' }}>Allocated Serials</th>
                    </tr>
                </thead>
                <tbody>
                    {order.items.map((item) => {
                        const reservedSerials = item.reservedItems.map(i => i.serialNumber)
                        const detailSerials = item.details.flatMap(d => d.serialNumbers.split(',').map(s => s.trim()))
                        const allSerials = Array.from(new Set([...reservedSerials, ...detailSerials])).filter(Boolean)
                        
                        const shippedQty = allSerials.length || item.reservedItems.length
                        
                        return (
                            <tr key={item.id}>
                                <td>
                                    <div style={{ fontWeight: 'bold' }}>{item.product.brand} {item.product.name}</div>
                                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                        Model: {item.product.model} | SKU: <span style={{ fontWeight: 600 }}>{item.product.sku}</span>
                                    </div>
                                </td>
                                <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                                <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{shippedQty}</td>
                                <td>
                                    {allSerials.length > 0 ? (
                                        <div style={{ fontFamily: 'monospace', fontSize: '12px', lineHeight: '1.4' }}>
                                            {allSerials.join(', ')}
                                        </div>
                                    ) : (
                                        <span style={{ color: '#9ca3af', fontSize: '12px', fontStyle: 'italic' }}>Pending Allocation</span>
                                    )}
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>

            <div className="print-signatures">
                <div className="print-signature-box">
                    <p>Checked By (Warehouse)</p>
                </div>
                <div className="print-signature-box">
                    <p>Received By (Customer)</p>
                </div>
            </div>

            <div className="no-print print-footer">
                Generated on {formatDateTime(new Date())}
            </div>

            <DocumentFooter />
        </PrintLayout>
    )
}
