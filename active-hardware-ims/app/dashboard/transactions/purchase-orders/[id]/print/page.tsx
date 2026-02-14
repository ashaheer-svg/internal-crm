import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import { formatDate } from "@/lib/utils"

interface PageProps {
  params: Promise<{ id: string }>
}

async function getPurchaseOrder(id: string) {
  return await prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          product: true
        }
      }
    }
  })
}

export default async function PrintPurchaseOrderPage({ params }: PageProps) {
  const { id } = await params
  const po = await getPurchaseOrder(id)

  if (!po) {
    notFound()
  }

  return (
    <html>
      <head>
        <title>Purchase Order - {po.poNumber}</title>
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
          }
          .header {
            border-bottom: 3px solid #333;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .company-name {
            font-size: 24px;
            font-weight: bold;
            color: #333;
          }
          .po-title {
            font-size: 20px;
            font-weight: bold;
            margin-top: 10px;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
          }
          .info-item {
            margin-bottom: 10px;
          }
          .info-label {
            font-size: 12px;
            color: #666;
            text-transform: uppercase;
          }
          .info-value {
            font-size: 14px;
            font-weight: 600;
            margin-top: 4px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          th {
            background-color: #f3f4f6;
            padding: 12px;
            text-align: left;
            font-size: 12px;
            text-transform: uppercase;
            color: #666;
            border-bottom: 2px solid #ddd;
          }
          td {
            padding: 12px;
            border-bottom: 1px solid #eee;
            font-size: 14px;
          }
          .total-row {
            font-weight: bold;
            background-color: #f9fafb;
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
          .print-button:hover {
            background-color: #2563eb;
          }
        `}</style>
      </head>
      <body>
        <button className="print-button no-print" onClick={() => window.print()}>
          Print Purchase Order
        </button>

        <div className="header">
          <div className="company-name">Active Hardware IMS</div>
          <div className="po-title">PURCHASE ORDER</div>
        </div>

        <div className="info-grid">
          <div>
            <div className="info-item">
              <div className="info-label">PO Number</div>
              <div className="info-value">{po.poNumber}</div>
            </div>
            <div className="info-item">
              <div className="info-label">Supplier</div>
              <div className="info-value">{po.supplier}</div>
            </div>
          </div>
          <div>
            <div className="info-item">
              <div className="info-label">Date</div>
              <div className="info-value">{formatDate(po.createdAt)}</div>
            </div>
            <div className="info-item">
              <div className="info-label">Status</div>
              <div className="info-value">{po.status}</div>
            </div>
          </div>
        </div>

        {po.notes && (
          <div style={{ marginBottom: '30px', padding: '15px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
            <div className="info-label">Notes</div>
            <div style={{ marginTop: '8px', fontSize: '14px' }}>{po.notes}</div>
          </div>
        )}

        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th style={{ textAlign: 'right' }}>Quantity</th>
              <th style={{ textAlign: 'right' }}>Unit Cost</th>
              <th style={{ textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {po.items.map((item) => (
              <tr key={item.id}>
                <td>{item.product.name}</td>
                <td>{item.product.sku}</td>
                <td style={{ textAlign: 'right' }}>{item.quantity}</td>
                <td style={{ textAlign: 'right' }}>Rs. {item.unitCost.toFixed(2)}</td>
                <td style={{ textAlign: 'right' }}>Rs. {item.totalCost.toFixed(2)}</td>
              </tr>
            ))}
            <tr className="total-row">
              <td colSpan={4} style={{ textAlign: 'right' }}>TOTAL</td>
              <td style={{ textAlign: 'right' }}>Rs. {po.totalAmount.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        <div style={{ marginTop: '60px', paddingTop: '20px', borderTop: '1px solid #ddd', fontSize: '12px', color: '#666' }}>
          <p>This is a computer-generated document. No signature is required.</p>
          <p>Generated on {new Date().toLocaleString()}</p>
        </div>

        <script dangerouslySetInnerHTML={{
          __html: `
            // Auto-print on load (optional)
            // window.onload = function() { window.print(); }
          `
        }} />
      </body>
    </html>
  )
}
