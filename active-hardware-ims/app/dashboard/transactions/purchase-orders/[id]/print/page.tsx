import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import { formatDate, formatDateTime } from "@/lib/utils"

import DocumentHeader from "@/components/DocumentHeader"
import PrintButton from "@/components/PrintButton"
import DocumentFooter from "@/components/DocumentFooter"
import { formatCurrency } from "@/lib/format"
import { Metadata } from "next"

interface PageProps {
  params: Promise<{ id: string }>
}

interface PurchaseOrderWithRelations {
  id: string
  poNumber: string
  supplier: string
  totalAmount: number
  status: string
  notes: string | null
  createdAt: Date
  items: {
    id: string
    quantity: number
    unitCost: number
    totalCost: number
    product: {
      name: string
      sku: string
    }
  }[]
}

async function getPurchaseOrder(id: string): Promise<PurchaseOrderWithRelations | null> {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          product: true
        }
      }
    }
  })
  return po as any
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const po = await getPurchaseOrder(id)
  return {
    title: po ? `Purchase Order - ${po.poNumber}` : 'Purchase Order',
  }
}

export default async function PrintPurchaseOrderPage({ params }: PageProps) {
  const { id } = await params
  const po = await getPurchaseOrder(id)

  if (!po) {
    notFound()
  }

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-auto">
      <style>{`
          @page {
            size: A4;
            margin: 15mm;
          }
          @media print {
            body { margin: 0; -webkit-print-color-adjust: exact; }
            .no-print { display: none !important; }
            /* Hide any other elements if they leak through */
            nav, aside, header, .sidebar { display: none !important; }
          }
          .print-container {
            font-family: Arial, sans-serif;
            width: 100%;
            max-width: 800px; /* Keep constraint for screen view */
            margin: 0 auto;
            background: white;
            padding: 40px; /* Default for screen */
          }
          @media print {
            .print-container {
              max-width: none;
              padding: 0;
              width: 100%;
            }
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
        `}</style>

      <div className="print-container">
        <PrintButton autoPrint={true} />

        <DocumentHeader title="PURCHASE ORDER" subtitle="Inventory Procurement" />

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
                <td style={{ textAlign: 'right' }}>{formatCurrency(item.unitCost)}</td>
                <td style={{ textAlign: 'right' }}>{formatCurrency(item.totalCost)}</td>
              </tr>
            ))}
            <tr className="total-row">
              <td colSpan={4} style={{ textAlign: 'right' }}>TOTAL</td>
              <td style={{ textAlign: 'right' }}>{formatCurrency(po.totalAmount)}</td>
            </tr>
          </tbody>
        </table>

        <div className="no-print" style={{ marginTop: '60px', paddingTop: '20px', borderTop: '1px solid #ddd', fontSize: '12px', color: '#666' }}>
          <p>This is a computer-generated document. No signature is required.</p>
          <p>Generated on {formatDateTime(new Date())}</p>
        </div>

        <DocumentFooter />
      </div>
    </div>
  )
}
