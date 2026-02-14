import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import { Metadata } from "next"
import PrintButton from "@/components/PrintButton"

import DocumentHeader from "@/components/DocumentHeader"
import DocumentFooter from "@/components/DocumentFooter"

interface PageProps {
    params: Promise<{ id: string }>
}

async function getOrder(id: string) {
    return await prisma.deliveryOrder.findUnique({
        where: { id },
        include: {
            items: {
                include: {
                    product: true,
                    reservedItems: true
                }
            }
        }
    })
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { id } = await params
    const order = await getOrder(id)
    return {
        title: order ? `Packing Slip - ${order.orderNumber}` : 'Packing Slip',
    }
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

    if (!order) {
        notFound()
    }

    return (
        <div className="min-h-screen bg-white text-black p-8">
            <style>{`
          @page {
            size: A4;
            margin: 15mm;
          }
          @media print {
            body { margin: 0; padding: 0; background: white; -webkit-print-color-adjust: exact; }
            .no-print { display: none !important; }
            nav, header, footer, aside, .sidebar { display: none !important; }
          }
          /* Custom Print Styles */
          .print-container {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            color: #333;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-bottom: 40px;
          }
          .info-section h3 {
            font-size: 12px;
            color: #666;
            text-transform: uppercase;
            border-bottom: 1px solid #ddd;
            padding-bottom: 5px;
            margin-bottom: 10px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
            font-size: 14px;
          }
          .label {
            color: #666;
            font-weight: 500;
          }
          .value {
            font-weight: 600;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          th {
            background-color: #f3f4f6;
            padding: 10px;
            text-align: left;
            font-size: 12px;
            text-transform: uppercase;
            border-bottom: 2px solid #000;
          }
          td {
            padding: 12px 10px;
            border-bottom: 1px solid #eee;
            font-size: 14px;
            vertical-align: top;
          }
          .footer {
            margin-top: 80px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
          }
          .signature-box {
            border-top: 1px solid #333;
            padding-top: 10px;
            text-align: center;
            font-size: 12px;
            color: #666;
          }
          .print-button {
            padding: 10px 20px;
            background-color: #3b82f6;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .print-button:hover {
            background-color: #2563eb;
          }
        `}</style>

            <div className="print-container">
                <PrintButton />

                <DocumentHeader
                    title="PACKING SLIP"
                    titleNextToLogo={true}
                />

                <div className="info-grid">
                    <div className="info-section">
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

                    <div className="info-section">
                        <h3>Order Details</h3>
                        <div className="info-row">
                            <span className="label">Order Number:</span>
                            <span className="value">{order.orderNumber}</span>
                        </div>
                        <div className="info-row">
                            <span className="label">Date:</span>
                            <span className="value">{new Date(order.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="info-row">
                            <span className="label">Status:</span>
                            <span className="value">{order.status}</span>
                        </div>
                    </div>
                </div>

                {order.notes && (
                    <div style={{ marginBottom: '30px', padding: '10px', border: '1px solid #eee', borderRadius: '4px' }}>
                        <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px', textTransform: 'uppercase' }}>Notes / Instructions</div>
                        <div style={{ fontSize: '14px' }}>{order.notes}</div>
                    </div>
                )}

                <table>
                    <thead>
                        <tr>
                            <th style={{ width: '40%' }}>Item / Description</th>
                            <th style={{ width: '15%', textAlign: 'center' }}>Qty Ord</th>
                            <th style={{ width: '15%', textAlign: 'center' }}>Qty Ship</th>
                            <th style={{ width: '30%' }}>Allocated Serials</th>
                        </tr>
                    </thead>
                    <tbody>
                        {order.items.map((item: any) => {
                            const shippedQty = item.reservedItems.length
                            return (
                                <tr key={item.id}>
                                    <td>
                                        <div style={{ fontWeight: 'bold' }}>{item.product.brand} {item.product.name}</div>
                                        <div style={{ fontSize: '12px', color: '#666' }}>Model: {item.product.model}</div>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{shippedQty}</td>
                                    <td>
                                        {item.reservedItems.length > 0 ? (
                                            <div style={{ fontFamily: 'monospace', fontSize: '12px', lineHeight: '1.4' }}>
                                                {item.reservedItems.map((i: any) => i.serialNumber).join(', ')}
                                            </div>
                                        ) : (
                                            <span style={{ color: '#999', fontSize: '12px', fontStyle: 'italic' }}>Pending Allocation</span>
                                        )}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>

                <div className="footer">
                    <div className="signature-box">
                        <p>Checked By (Warehouse)</p>
                    </div>
                    <div className="signature-box">
                        <p>Received By (Customer)</p>
                    </div>
                </div>

                <div style={{ textAlign: 'center', marginTop: '40px', fontSize: '10px', color: '#999' }}>
                    Generated on {new Date().toLocaleString()}
                </div>

                <DocumentFooter />
            </div>
        </div>
    )
}
