import { prisma } from "@/lib/db"
import Link from "next/link"
import { ArrowLeft, Printer, Package, Edit, Plus } from "lucide-react"
import { notFound } from "next/navigation"
import { Currency } from "@/components/Currency"
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

export default async function PurchaseOrderDetailPage({ params }: PageProps) {
    const { id } = await params
    const po = await getPurchaseOrder(id)

    if (!po) {
        notFound()
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/transactions?tab=po" className="p-2 hover:bg-gray-200 rounded-full">
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900">{po.poNumber}</h1>
                        <p className="text-sm text-gray-500">Purchase Order</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <Link
                        href={`/dashboard/transactions/purchase-orders/${po.id}/edit`}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                    </Link>
                    <Link
                        href={`/dashboard/transactions/purchase-orders/${po.id}/print`}
                        target="_blank"
                        className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                        <Printer className="w-4 h-4 mr-2" />
                        Print
                    </Link>
                </div>
            </div>

            {/* PO Details */}
            <div className="bg-white shadow sm:rounded-lg p-6">
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                        <p className="text-sm font-medium text-gray-500">Supplier</p>
                        <p className="mt-1 text-sm text-gray-900">{po.supplier}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Status</p>
                        <p className="mt-1">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                ${po.status === 'DRAFT' ? 'bg-gray-100 text-gray-800' : ''}
                ${po.status === 'SUBMITTED' ? 'bg-yellow-100 text-yellow-800' : ''}
                ${po.status === 'RECEIVED' ? 'bg-green-100 text-green-800' : ''}
                ${po.status === 'CANCELLED' ? 'bg-red-100 text-red-800' : ''}
              `}>
                                {po.status}
                            </span>
                        </p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Created</p>
                        <p className="mt-1 text-sm text-gray-900">{formatDate(po.createdAt)}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Total Amount</p>
                        <Currency amount={po.totalAmount} className="mt-1 text-lg font-bold text-gray-900" />
                    </div>
                </div>

                {po.notes && (
                    <div className="pt-4 border-t">
                        <p className="text-sm font-medium text-gray-500">Notes</p>
                        <p className="mt-1 text-sm text-gray-900">{po.notes}</p>
                    </div>
                )}
            </div>

            {/* Items */}
            <div className="bg-white shadow sm:rounded-lg overflow-hidden">
                <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Items</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Cost</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Received</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {po.items.map((item) => (
                                <tr key={item.id}>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                        {item.product.name}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {item.product.sku}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {item.quantity}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                                        <Currency amount={item.unitCost} />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                                        <Currency amount={item.totalCost} />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {item.receivedQty} / {item.quantity}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        {po.status !== 'RECEIVED' && po.status !== 'CANCELLED' && item.receivedQty < item.quantity && (
                                            <Link
                                                href={`/dashboard/inventory/${item.productId}?poId=${po.id}`}
                                                className="text-blue-600 hover:text-blue-900 flex items-center justify-end gap-1"
                                            >
                                                <Plus className="w-4 h-4" />
                                                Receive Stock
                                            </Link>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Receive Stock Section */}
            {
                po.status !== 'RECEIVED' && po.status !== 'CANCELLED' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start">
                            <Package className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
                            <div className="flex-1">
                                <h3 className="text-sm font-medium text-blue-900">Ready to receive stock?</h3>
                                <p className="mt-1 text-sm text-blue-700">
                                    Go to the Inventory page for each product and add items with serial numbers using the "Add Inventory" form.
                                    Enter the unit cost from this PO when adding stock.
                                </p>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    )
}
