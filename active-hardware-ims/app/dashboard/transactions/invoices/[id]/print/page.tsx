import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import { formatDate, formatDateTime } from "@/lib/utils"

import DocumentHeader from "@/components/DocumentHeader"
import DocumentFooter from "@/components/DocumentFooter"
import { formatCurrency } from "@/lib/format"
import PrintButton from "@/components/PrintButton"
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
  salesRep?: {
    name: string
  } | null
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
    include: {
      items: true,
      salesRep: true
    }
  }) as any
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const invoice = await getInvoice(id)
  return {
    title: invoice ? `Invoice - ${invoice.invoiceNumber}` : 'Invoice',
  }
}

export default async function PrintInvoicePage({ params }: PageProps) {
  const { id } = await params
  const invoice = await getInvoice(id)

  if (!invoice) {
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
            nav, aside, header, .sidebar { display: none !important; }
          }
          .print-container {
            font-family: Arial, sans-serif;
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
            min-height: 100vh;
            background: white;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-bottom: 40px;
          }
          .info-section {
            padding: 20px;
            background-color: #f9fafb;
            border-radius: 8px;
          }
          .info-section h3 {
            font-size: 12px;
            color: #666;
            text-transform: uppercase;
            margin-bottom: 10px;
          }
          .info-item {
            margin-bottom: 8px;
          }
          .info-label {
            font-size: 11px;
            color: #666;
          }
          .info-value {
            font-size: 14px;
            font-weight: 600;
            margin-top: 2px;
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
          .total-section {
            margin-top: 30px;
            text-align: right;
          }
          .total-row {
            display: flex;
            justify-content: flex-end;
            gap: 40px;
            padding: 15px 20px;
            background-color: #f9fafb;
            border-radius: 8px;
            margin-top: 10px;
          }
          .total-label {
            font-size: 16px;
            font-weight: 600;
            color: #666;
          }
          .total-amount {
            font-size: 24px;
            font-weight: bold;
            color: #2563eb;
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
          .footer {
            margin-top: 60px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            font-size: 11px;
            color: #666;
            text-align: center;
          }
        `}</style>
      <div className="print-container">
        <PrintButton autoPrint={true} />

        <DocumentHeader title="INVOICE" subtitle="Sales Transaction Record" />

        <div className="info-grid">
          <div className="info-section">
            <h3>Bill To</h3>
            <div className="info-item">
              <div className="info-value">{invoice.customerName}</div>
            </div>
            {invoice.customerEmail && (
              <div className="info-item">
                <div className="info-label">Email</div>
                <div className="info-value">{invoice.customerEmail}</div>
              </div>
            )}
            {invoice.customerPhone && (
              <div className="info-item">
                <div className="info-label">Phone</div>
                <div className="info-value">{invoice.customerPhone}</div>
              </div>
            )}
          </div>
          <div className="info-section">
            <h3>Invoice Details</h3>
            <div className="info-item">
              <div className="info-label">Invoice Number</div>
              <div className="info-value">{invoice.invoiceNumber}</div>
            </div>
            <div className="info-item">
              <div className="info-label">Date</div>
              <div className="info-value">{formatDate(invoice.createdAt)}</div>
            </div>
            <div className="info-item">
              <div className="info-label">Sales Representative</div>
              <div className="info-value">{invoice.salesRep?.name || '-'}</div>
            </div>
            <div className="info-item">
              <div className="info-label">Status</div>
              <div className="info-value">{invoice.status}</div>
            </div>
          </div>
        </div>

        {invoice.notes && (
          <div style={{ marginBottom: '30px', padding: '15px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>NOTES</div>
            <div style={{ fontSize: '14px' }}>{invoice.notes}</div>
          </div>
        )}

        <table>
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

        <div className="total-section">
          <div className="total-row">
            <div className="total-label">TOTAL</div>
            <div className="total-amount">{formatCurrency(invoice.totalAmount)}</div>
          </div>
        </div>

        <div className="footer no-print">
          <p>Thank you for your business!</p>
          <p>This is a computer-generated document. No signature is required.</p>
          <p>Generated on {formatDateTime(new Date())}</p>
        </div>

        <DocumentFooter />
      </div>
    </div>
  )
}
