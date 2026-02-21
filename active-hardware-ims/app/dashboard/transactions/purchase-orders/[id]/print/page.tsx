import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import { formatDate, formatDateTime } from "@/lib/utils"

import DocumentHeader from "@/components/DocumentHeader"
import PrintButton from "@/components/PrintButton"
import DocumentFooter from "@/components/DocumentFooter"
import PrintLayout from "@/components/print/PrintLayout"
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
    product: { name: string; sku: string }
  }[]
}

async function getPurchaseOrder(id: string): Promise<PurchaseOrderWithRelations | null> {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: { items: { include: { product: true } } }
  })
  return po as any
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const po = await getPurchaseOrder(id)
  return { title: po ? `Purchase Order - ${po.poNumber}` : 'Purchase Order' }
}

export default async function PrintPurchaseOrderPage({ params }: PageProps) {
  const { id } = await params
  const po = await getPurchaseOrder(id)

  if (!po) notFound()

  return (
    <PrintLayout>
      <PrintButton autoPrint={true} />

      <DocumentHeader title="PURCHASE ORDER" hideMeta={true} />

      <div className="print-info-grid">
        <div>
          <div className="print-info-item">
            <div className="print-info-label">PO Number</div>
            <div className="print-info-value">{po.poNumber}</div>
          </div>
          <div className="print-info-item">
            <div className="print-info-label">Supplier</div>
            <div className="print-info-value">{po.supplier}</div>
          </div>
        </div>
        <div>
          <div className="print-info-item">
            <div className="print-info-label">Date</div>
            <div className="print-info-value">{formatDate(po.createdAt)}</div>
          </div>
          <div className="print-info-item">
            <div className="print-info-label">Status</div>
            <div className="print-info-value">{po.status}</div>
          </div>
        </div>
      </div>

      {po.notes && (
        <div className="print-notes">
          <div className="print-notes-label">Notes</div>
          <div style={{ marginTop: '8px' }}>{po.notes}</div>
        </div>
      )}

      <table className="print-table">
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

      <div className="no-print print-footer">
        <p>This is a computer-generated document. No signature is required.</p>
        <p>Generated on {formatDateTime(new Date())}</p>
      </div>

      <DocumentFooter />
    </PrintLayout>
  )
}
