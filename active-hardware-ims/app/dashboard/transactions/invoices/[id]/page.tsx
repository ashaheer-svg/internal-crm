import { prisma } from "@/lib/db"
import Link from "next/link"
import { ArrowLeft, Printer } from "lucide-react"
import { notFound } from "next/navigation"

interface PageProps {
    params: Promise<{ id: string }>
}

async function getInvoice(id: string) {
    return await prisma.invoice.findUnique({
        where: { id },
        include: {
            items: true
        }
    })
}

export default async function InvoiceDetailPage({ params }: PageProps) {
    const { id } = await params
    const invoice = await getInvoice(id)

    if (!invoice) {
        notFound()
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/transactions" className="p-2 hover:bg-gray-200 rounded-full">
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900">{invoice.invoiceNumber}</h1>
                        <p className="text-sm text-gray-500">Invoice</p>
                    </div>
                </div>
                <Link
                    href={`/dashboard/transactions/invoices/${invoice.id}/print`}
                    target="_blank"
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                    <Printer className="w-4 h-4 mr-2" />
                    Print
                </Link>
            </div>

            {/* Invoice Details */}
            <div className="bg-white shadow sm:rounded-lg p-6">
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                        <p className="text-sm font-medium text-gray-500">Customer Name</p>
                        <p className="mt-1 text-sm text-gray-900">{invoice.customerName}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Status</p>
                        <p className="mt-1">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                ${invoice.status === 'DRAFT' ? 'bg-gray-100 text-gray-800' : ''}
                ${invoice.status === 'ISSUED' ? 'bg-blue-100 text-blue-800' : ''}
                ${invoice.status === 'PAID' ? 'bg-green-100 text-green-800' : ''}
                ${invoice.status === 'CANCELLED' ? 'bg-red-100 text-red-800' : ''}
              `}>
                                {invoice.status}
                            </span>
                        </p>
                    </div>
                    {invoice.customerEmail && (
                        <div>
                            <p className="text-sm font-medium text-gray-500">Email</p>
                            <p className="mt-1 text-sm text-gray-900">{invoice.customerEmail}</p>
                        </div>
                    )}
                    {invoice.customerPhone && (
                        <div>
                            <p className="text-sm font-medium text-gray-500">Phone</p>
                            <p className="mt-1 text-sm text-gray-900">{invoice.customerPhone}</p>
                        </div>
                    )}
                    <div>
                        <p className="text-sm font-medium text-gray-500">Invoice Date</p>
                        <p className="mt-1 text-sm text-gray-900">{new Date(invoice.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Total Amount</p>
                        <p className="mt-1 text-lg font-bold text-gray-900">Rs. {invoice.totalAmount.toFixed(2)}</p>
                    </div>
                </div>

                {invoice.notes && (
                    <div className="pt-4 border-t">
                        <p className="text-sm font-medium text-gray-500">Notes</p>
                        <p className="mt-1 text-sm text-gray-900">{invoice.notes}</p>
                    </div>
                )}
            </div>

            {/* Items */}
            <div className="bg-white shadow sm:rounded-lg overflow-hidden">
                <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Items Sold</h3>
                </div>
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Serial Number</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {invoice.items.map((item) => (
                            <tr key={item.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {item.productName}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {item.serialNumber}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                                    Rs. {item.unitPrice.toFixed(2)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
