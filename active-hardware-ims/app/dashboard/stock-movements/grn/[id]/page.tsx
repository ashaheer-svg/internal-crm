import { prisma } from "@/lib/db"
import Link from "next/link"
import { ArrowLeft, Printer } from "lucide-react"
import { notFound } from "next/navigation"
import { Currency } from "@/components/Currency"
import { formatDateTime } from "@/lib/utils"

interface PageProps {
    params: Promise<{ id: string }>
}

async function getGRN(id: string) {
    return await prisma.goodsReceiptNote.findUnique({
        where: { id },
        include: {
            items: true
        }
    })
}

export default async function GRNDetailPage({ params }: PageProps) {
    const { id } = await params
    const grn = await getGRN(id)

    if (!grn) {
        notFound()
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/stock-movements" className="p-2 hover:bg-gray-200 rounded-full">
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900">{grn.grnNumber}</h1>
                        <p className="text-sm text-gray-500">Goods Receipt Note</p>
                    </div>
                </div>
            </div>

            {/* GRN Details */}
            <div className="bg-white shadow sm:rounded-lg p-6">
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                        <p className="text-sm font-medium text-gray-500">Supplier</p>
                        <p className="mt-1 text-sm text-gray-900">{grn.supplier}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Status</p>
                        <p className="mt-1">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                ${grn.status === 'DRAFT' ? 'bg-gray-100 text-gray-800' : ''}
                ${grn.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : ''}
              `}>
                                {grn.status}
                            </span>
                        </p>
                    </div>
                    {grn.poReference && (
                        <div>
                            <p className="text-sm font-medium text-gray-500">PO Reference</p>
                            <p className="mt-1 text-sm text-gray-900">{grn.poReference}</p>
                        </div>
                    )}
                    <div>
                        <p className="text-sm font-medium text-gray-500">Received By</p>
                        <p className="mt-1 text-sm text-gray-900">{grn.receivedBy}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Created</p>
                        <p className="mt-1 text-sm text-gray-900">{formatDateTime(grn.createdAt)}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Total Items</p>
                        <p className="mt-1 text-lg font-bold text-gray-900">{grn.items.reduce((sum, item) => sum + item.quantity, 0)} units</p>
                    </div>
                </div>

                {grn.notes && (
                    <div className="pt-4 border-t">
                        <p className="text-sm font-medium text-gray-500">Notes</p>
                        <p className="mt-1 text-sm text-gray-900">{grn.notes}</p>
                    </div>
                )}
            </div>

            {/* Items */}
            <div className="bg-white shadow sm:rounded-lg overflow-hidden">
                <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Received Items</h3>
                </div>
                <div className="divide-y divide-gray-200">
                    {grn.items.map((item) => (
                        <div key={item.id} className="px-6 py-4">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <p className="text-sm font-medium text-gray-900">Product ID: {item.productId}</p>
                                    <p className="text-sm text-gray-500">Location: {item.locationId}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-semibold text-gray-900 flex justify-end gap-1">
                                        <Currency amount={item.unitCost} className="min-w-0" /> each
                                    </p>
                                    <p className="text-sm text-gray-500">{item.quantity} units</p>
                                </div>
                            </div>
                            <div className="mt-2">
                                <p className="text-xs font-medium text-gray-500 mb-1">Serial Numbers:</p>
                                <div className="flex flex-wrap gap-1">
                                    {item.serialNumbers.split(',').map((sn, idx) => (
                                        <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                            {sn.trim()}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">
                    ✅ All items from this GRN have been added to inventory and are now available for sale.
                </p>
            </div>
        </div>
    )
}
