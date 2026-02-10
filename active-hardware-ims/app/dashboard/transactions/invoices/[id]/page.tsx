import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Edit, Package, CheckCircle, Clock } from "lucide-react"
import { prisma } from "@/lib/db"
import { Currency } from "@/components/Currency"

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const invoice = await prisma.invoice.findUnique({
        where: { id },
        include: {
            items: {
                include: {
                    product: true,
                    backorderItem: true
                }
            },
            backorderItems: {
                where: {
                    status: { in: ['PENDING', 'PARTIAL'] }
                },
                include: {
                    product: true
                }
            }
        }
    })

    if (!invoice) {
        notFound()
    }

    const fulfilledItems = invoice.items.filter(item => item.isFulfilled)
    const backorderItems = invoice.items.filter(item => !item.isFulfilled)

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/transactions" className="p-2 hover:bg-gray-200 rounded-full">
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                            Delivery Order {invoice.invoiceNumber}
                        </h1>
                        <p className="text-sm text-gray-500">
                            Created {new Date(invoice.createdAt).toLocaleDateString()}
                        </p>
                    </div>
                </div>
                <Link
                    href={`/dashboard/transactions/invoices/${invoice.id}/edit`}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Delivery Order
                </Link>
            </div>

            {/* Status Banner */}
            {invoice.hasBackorders && (
                <div className="bg-amber-50 border-l-4 border-amber-400 p-4">
                    <div className="flex items-center">
                        <Package className="h-5 w-5 text-amber-400 mr-2" />
                        <p className="text-sm text-amber-700">
                            This invoice has pending backorders. Items will be allocated when stock becomes available.
                        </p>
                    </div>
                </div>
            )}

            {/* Customer Information */}
            <div className="bg-white shadow sm:rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Customer Information</h2>
                <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                    <div>
                        <dt className="text-sm font-medium text-gray-500">Name</dt>
                        <dd className="mt-1 text-sm text-gray-900">{invoice.customerName}</dd>
                    </div>
                    {invoice.customerEmail && (
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Email</dt>
                            <dd className="mt-1 text-sm text-gray-900">{invoice.customerEmail}</dd>
                        </div>
                    )}
                    {invoice.customerPhone && (
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Phone</dt>
                            <dd className="mt-1 text-sm text-gray-900">{invoice.customerPhone}</dd>
                        </div>
                    )}
                    <div>
                        <dt className="text-sm font-medium text-gray-500">Status</dt>
                        <dd className="mt-1">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${invoice.status === 'PAID' ? 'bg-green-100 text-green-800' :
                                invoice.status === 'ISSUED' ? 'bg-blue-100 text-blue-800' :
                                    'bg-gray-100 text-gray-800'
                                }`}>
                                {invoice.status}
                            </span>
                        </dd>
                    </div>
                </dl>
                {invoice.notes && (
                    <div className="mt-4">
                        <dt className="text-sm font-medium text-gray-500">Notes</dt>
                        <dd className="mt-1 text-sm text-gray-900">{invoice.notes}</dd>
                    </div>
                )}
            </div>

            {/* Fulfilled Items */}
            {fulfilledItems.length > 0 && (
                <div className="bg-white shadow sm:rounded-lg p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <h2 className="text-lg font-medium text-gray-900">Fulfilled Items</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Serial Number</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {fulfilledItems.map((item) => (
                                    <tr key={item.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {item.productName}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {item.serialNumber || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {item.quantity}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                                            <Currency amount={item.unitPrice} />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                                            <Currency amount={item.unitPrice * item.quantity} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Backorder Items */}
            {backorderItems.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 shadow sm:rounded-lg p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Clock className="h-5 w-5 text-amber-600" />
                        <h2 className="text-lg font-medium text-gray-900">Pending Backorders</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-amber-200">
                            <thead className="bg-amber-100">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Product</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Qty Ordered</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">Unit Price</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">Total</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-amber-100">
                                {backorderItems.map((item) => (
                                    <tr key={item.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {item.productName}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                            {item.quantity}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                                {item.backorderItem?.status || 'PENDING'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                                            <Currency amount={item.unitPrice} />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                                            <Currency amount={item.unitPrice * item.quantity} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Total */}
            <div className="bg-white shadow sm:rounded-lg p-6">
                <div className="flex justify-end">
                    <div className="text-right space-y-2">
                        <div className="flex justify-between gap-8">
                            <span className="text-sm text-gray-500">Subtotal:</span>
                            <Currency amount={invoice.totalAmount} className="text-sm font-medium text-gray-900" />
                        </div>
                        <div className="flex justify-between gap-8 pt-2 border-t">
                            <span className="text-base font-medium text-gray-900">Total:</span>
                            <Currency amount={invoice.totalAmount} className="text-xl font-bold text-gray-900" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Print Button */}
            <div className="flex justify-end">
                <Link
                    href={`/dashboard/transactions/invoices/${invoice.id}/print`}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                    Print Delivery Order
                </Link>
            </div>
        </div>
    )
}
