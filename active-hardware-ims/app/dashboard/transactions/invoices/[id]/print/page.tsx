import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import { formatDate, formatDateTime } from "@/lib/utils"

import DocumentHeader from "@/components/DocumentHeader"
import DocumentFooter from "@/components/DocumentFooter"
import PrintButton from "@/components/PrintButton"
import PrintLayout from "@/components/print/PrintLayout"
import { formatCurrency } from "@/lib/format"
import { Metadata } from "next"

interface PageProps {
  params: Promise<{ id: string }>
}

interface InvoiceWithRelations {
  id: string
  invoiceNumber: string
  customerName: string
  customerEmail: string | null
  customerPhone: string | null
  totalAmount: number
  status: string
  notes: string | null
  createdAt: Date
  salesRep?: { name: string } | null
  items: {
    id: string
    productName: string
    serialNumber: string | null
    unitPrice: number
  }[]
}

async function getInvoice(id: string): Promise<InvoiceWithRelations | null> {
  return await prisma.invoice.findUnique({
    where: { id },
    include: { items: true, salesRep: true }
  }) as any
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const invoice = await getInvoice(id)
  return { title: invoice ? `Invoice - ${invoice.invoiceNumber}` : 'Invoice' }
}

export default async function PrintInvoicePage({ params }: PageProps) {
  const { id } = await params
  const invoice = await getInvoice(id)

  if (!invoice) notFound()

  return (
    <PrintLayout>
      <PrintButton autoPrint={true} />

      <DocumentHeader title="INVOICE" subtitle="Sales Transaction Record" />

      <div className="print-info-grid">
        <div className="print-info-section">
          <h3>Bill To</h3>
          <div className="print-info-item">
            <div className="print-info-value">{invoice.customerName}</div>
          </div>
          {invoice.customerEmail && (
            <div className="print-info-item">
              <div className="print-info-label">Email</div>
              <div className="print-info-value">{invoice.customerEmail}</div>
            </div>
          )}
          {invoice.customerPhone && (
            <div className="print-info-item">
              <div className="print-info-label">Phone</div>
              <div className="print-info-value">{invoice.customerPhone}</div>
            </div>
          )}
        </div>
        <div className="print-info-section">
          <h3>Invoice Details</h3>
          <div className="print-info-item">
            <div className="print-info-label">Invoice Number</div>
            <div className="print-info-value">{invoice.invoiceNumber}</div>
          </div>
          <div className="print-info-item">
            <div className="print-info-label">Date</div>
            <div className="print-info-value">{formatDate(invoice.createdAt)}</div>
          </div>
          <div className="print-info-item">
            <div className="print-info-label">Sales Representative</div>
            <div className="print-info-value">{invoice.salesRep?.name || '-'}</div>
          </div>
          <div className="print-info-item">
            <div className="print-info-label">Status</div>
            <div className="print-info-value">{invoice.status}</div>
          </div>
        </div>
      </div>

      {invoice.notes && (
        <div className="print-notes">
          <div className="print-notes-label">Notes</div>
          <div>{invoice.notes}</div>
        </div>
      )}

      <table className="print-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Serial Number</th>
            <th style={{ textAlign: 'right' }}>Price</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item) => (
            <tr key={item.id}>
              <td>{item.productName}</td>
              <td>{item.serialNumber}</td>
              <td style={{ textAlign: 'right' }}>{formatCurrency(item.unitPrice)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="print-total-section">
        <div className="print-total-row">
          <div className="print-total-label">TOTAL</div>
          <div className="print-total-amount">{formatCurrency(invoice.totalAmount)}</div>
        </div>
      </div>

      <div className="print-footer no-print">
        <p>Thank you for your business!</p>
        <p>This is a computer-generated document. No signature is required.</p>
        <p>Generated on {formatDateTime(new Date())}</p>
      </div>

      <DocumentFooter />
    </PrintLayout>
  )
}
