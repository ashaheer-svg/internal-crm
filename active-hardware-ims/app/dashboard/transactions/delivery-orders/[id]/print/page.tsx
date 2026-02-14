import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import { formatDate } from "@/lib/utils"

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

    // Calculate totals for summary (though prices are usually hidden on packing slips, 
    // sometimes they are needed. We will HIDE prices for now as it is a packing slip).

    return (
        <html>
            <head>
                <title>Packing Slip - {order.orderNumber}</title>
                <style>{`
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
          body {
            font-family: Arial, sans-serif;
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
            color: #333;
          }
          .header {
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
            margin-bottom: 30px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          .company-name {
            font-size: 24px;
            font-weight: bold;
          }
          .document-title {
            font-size: 28px;
            font-weight: bold;
            color: #333;
            text-transform: uppercase;
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
          }
        `}</style>
            </head>
            <body>
                <button className="print-button no-print" onClick={() => window.print()}>
                    Print Packing Slip
                </button>

                <div className="header">
                    <div>
                        <div className="company-name">Active Hardware IMS</div>
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                            Warehouse & Logistics Check
                        </div>
                    </div>
                    <div className="document-title">PACKING SLIP</div>
                </div>

                <div className="info-grid">
                    <div className="info-section">
                        <h3>Ship To</h3>
                        <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '5px' }}>
                            {order.customerName}
                        </div>
                        {/* Address would go here if we had it in the schema */}
                    </div>

                    <div className="info-section">
                        <h3>Order Details</h3>
                        <div className="info-row">
                            <span className="label">Order Number:</span>
                            <span className="value">{order.orderNumber}</span>
                        </div>
                        <div className="info-row">
                            <span className="label">Date:</span>
                            <span className="value">{formatDate(order.createdAt)}</span>
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
                        {order.items.map((item) => {
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
                                                {item.reservedItems.map(i => i.serialNumber).join(', ')}
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

            </body>
        </html>
    )
}
