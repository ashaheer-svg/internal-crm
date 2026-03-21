import { prisma } from "@/lib/db"
import Link from "next/link"
import { ArrowLeft, Package, User, FileText, Clock, Printer } from "lucide-react"
import { notFound } from "next/navigation"
import StatusUpdateForm from "./StatusUpdateForm"
import ReplacementForm from "./ReplacementForm"
import ReplacementDetails from "./ReplacementDetails"
import EditWarrantyButton from "./EditWarrantyButton"
import SupplierRMAForm from "./SupplierRMAForm"
import SupplierRMADetails from "./SupplierRMADetails"
import { formatDate, formatDateTime } from "@/lib/utils"
import BackButton from "@/components/BackButton"

interface PageProps {
    params: Promise<{ id: string }>
}

async function getWarrantyClaim(id: string) {
    const claim = await (prisma.warrantyClaim as any).findUnique({
        where: { id },
        include: {
            inventoryItem: {
                include: {
                    product: true,
                    location: true
                }
            },
            supplierRma: {
                include: {
                    supplier: true,
                    receivedItem: { include: { product: true } }
                }
            }
        }
    })

    if (!claim) return null

    // If there's a replacement, fetch its details
    let replacementItemDetails = null
    if ((claim as any).replacementItemId) {
        replacementItemDetails = await prisma.inventoryItem.findUnique({
            where: { id: (claim as any).replacementItemId },
            include: {
                product: true,
                location: true
            }
        })
    }

    return { ...claim, replacementItemDetails }
}

export default async function WarrantyClaimDetailPage({ params }: PageProps) {
    const { id } = await params
    const claim = await getWarrantyClaim(id)

    if (!claim) {
        notFound()
    }

    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'PENDING':
                return 'bg-yellow-100 text-yellow-800'
            case 'IN_PROGRESS':
                return 'bg-blue-100 text-blue-800'
            case 'AWAITING_SUPPLIER':
            case 'SUPPLIER_RMA_OPEN':
                return 'bg-orange-100 text-orange-800'
            case 'SUPPLIER_RMA_RESOLVED':
                return 'bg-purple-100 text-purple-800'
            case 'RESOLVED':
                return 'bg-green-100 text-green-800'
            case 'CLOSED':
                return 'bg-gray-100 text-gray-800'
            default:
                return 'bg-gray-100 text-gray-800'
        }
    }

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'IN_PROGRESS':
                return 'In Progress'
            case 'AWAITING_SUPPLIER':
                return 'Awaiting Supplier'
            default:
                return status.charAt(0) + status.slice(1).toLowerCase()
        }
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <BackButton className="p-1.5" />
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Warranty Claim</h1>
                            <EditWarrantyButton claim={{
                                id: claim.id,
                                customerName: claim.customerName,
                                description: claim.description,
                                status: claim.status,
                                inventoryItem: {
                                    id: claim.inventoryItem.id,
                                    serialNumber: claim.inventoryItem.serialNumber,
                                    product: {
                                        name: claim.inventoryItem.product.name,
                                        brand: claim.inventoryItem.product.brand,
                                        model: claim.inventoryItem.product.model
                                    }
                                }
                            }} />
                        </div>
                        <p className="text-sm text-gray-500">Claim ID: {claim.id}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Claim Status */}
                    <div className="bg-white shadow sm:rounded-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-medium text-gray-900">Claim Status</h3>
                            <div className="flex items-center gap-2">
                                <Link
                                    href={`/dashboard/warranty/${claim.id}/print-receipt`}
                                    target="_blank"
                                    className="inline-flex items-center gap-1.5 px-2 py-1 border border-gray-200 rounded text-xs text-gray-700 hover:bg-gray-50 shadow-sm"
                                    title="Print Goods Receipt"
                                >
                                    <Printer className="w-3.5 h-3.5" />
                                    Receipt
                                </Link>
                                <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${getStatusBadgeClass(claim.status)}`}>
                                    {getStatusLabel(claim.status)}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Created</p>
                                <p className="mt-1 text-sm text-gray-900">{formatDateTime(claim.createdAt)}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Last Updated</p>
                                <p className="mt-1 text-sm text-gray-900">{formatDateTime(claim.updatedAt)}</p>
                            </div>
                        </div>

                        <StatusUpdateForm claimId={claim.id} currentStatus={claim.status} />
                    </div>

                    {/* Issue Description */}
                    <div className="bg-white shadow sm:rounded-lg p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <FileText className="w-5 h-5 text-gray-400" />
                            <h3 className="text-lg font-medium text-gray-900">Issue Description</h3>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{claim.description}</p>
                    </div>

                    {/* Replacement Management */}
                    {((claim as any).replacementItemId || (claim as any).replacementExternalInfo) ? (
                        <ReplacementDetails
                            claimId={claim.id}
                            replacementType={(claim as any).replacementType}
                            replacementItemDetails={claim.replacementItemDetails}
                            replacementExternalInfo={(claim as any).replacementExternalInfo}
                            replacementProvidedAt={(claim as any).replacementProvidedAt}
                            replacementReturnedAt={(claim as any).replacementReturnedAt}
                        />
                    ) : (
                        <ReplacementForm
                            claimId={claim.id}
                            hasReplacement={false}
                            replacementType={(claim as any).replacementType}
                        />
                    )}

                    {/* Supplier RMA Tracking */}
                    <div className="bg-white shadow sm:rounded-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Package className="w-5 h-5 text-gray-400" />
                                <h3 className="text-lg font-medium text-gray-900">Supplier RMA Tracking</h3>
                            </div>
                            {((claim as any).replacementItemId || (claim as any).replacementExternalInfo) && (
                                <Link
                                    href={`/dashboard/warranty/${claim.id}/print-issue`}
                                    target="_blank"
                                    className="inline-flex items-center gap-1.5 px-2 py-1 border border-gray-200 rounded text-xs text-gray-700 hover:bg-gray-50 shadow-sm"
                                    title="Print Goods Issue Slip"
                                >
                                    <Printer className="w-3.5 h-3.5" />
                                    Issue Note
                                </Link>
                            )}
                        </div>
                        {(claim as any).supplierRma ? (
                            <SupplierRMADetails rma={(claim as any).supplierRma} />
                        ) : (
                            <SupplierRMAForm claimId={claim.id} defectiveItemId={claim.inventoryItemId} />
                        )}
                    </div>

                    {/* Status Timeline */}
                    <div className="bg-white shadow sm:rounded-lg p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Clock className="w-5 h-5 text-gray-400" />
                            <h3 className="text-lg font-medium text-gray-900">Status Timeline</h3>
                        </div>
                        <div className="flow-root">
                            <ul className="-mb-8">
                                <li>
                                    <div className="relative pb-8">
                                        {['IN_PROGRESS', 'AWAITING_SUPPLIER', 'SUPPLIER_RMA_OPEN', 'SUPPLIER_RMA_RESOLVED', 'RESOLVED', 'CLOSED'].includes(claim.status) && (
                                            <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                                        )}
                                        <div className="relative flex space-x-3">
                                            <div>
                                                <span className="h-8 w-8 rounded-full bg-yellow-500 flex items-center justify-center ring-8 ring-white">
                                                    <span className="text-white text-xs font-bold">1</span>
                                                </span>
                                            </div>
                                            <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                                                <div>
                                                    <p className="text-sm text-gray-900 font-medium">Claim Created</p>
                                                    <p className="text-sm text-gray-500">Status: PENDING</p>
                                                </div>
                                                <div className="whitespace-nowrap text-right text-sm text-gray-500">
                                                    {formatDate(claim.createdAt)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </li>
                                {/* In Progress */}
                                {['IN_PROGRESS', 'AWAITING_SUPPLIER', 'SUPPLIER_RMA_OPEN', 'SUPPLIER_RMA_RESOLVED', 'RESOLVED', 'CLOSED'].includes(claim.status) && (
                                    <li>
                                        <div className="relative pb-8">
                                            {['AWAITING_SUPPLIER', 'SUPPLIER_RMA_OPEN', 'SUPPLIER_RMA_RESOLVED', 'RESOLVED', 'CLOSED'].includes(claim.status) && (
                                                <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                                            )}
                                            <div className="relative flex space-x-3">
                                                <div>
                                                    <span className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center ring-8 ring-white">
                                                        <span className="text-white text-xs font-bold">2</span>
                                                    </span>
                                                </div>
                                                <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                                                    <div>
                                                        <p className="text-sm text-gray-900 font-medium">In Progress</p>
                                                        <p className="text-sm text-gray-500">Status: IN_PROGRESS</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </li>
                                )}

                                {/* Awaiting Supplier */}
                                {['AWAITING_SUPPLIER', 'SUPPLIER_RMA_OPEN', 'SUPPLIER_RMA_RESOLVED', 'RESOLVED', 'CLOSED'].includes(claim.status) && (
                                    <li>
                                        <div className="relative pb-8">
                                            {['SUPPLIER_RMA_RESOLVED', 'RESOLVED', 'CLOSED'].includes(claim.status) && (
                                                <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                                            )}
                                            <div className="relative flex space-x-3">
                                                <div>
                                                    <span className="h-8 w-8 rounded-full bg-orange-500 flex items-center justify-center ring-8 ring-white">
                                                        <span className="text-white text-xs font-bold">3</span>
                                                    </span>
                                                </div>
                                                <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                                                    <div>
                                                        <p className="text-sm text-gray-900 font-medium">Sent to Supplier</p>
                                                        <p className="text-sm text-gray-500">Status: AWAITING_SUPPLIER</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </li>
                                )}

                                {/* Resolved */}
                                {['RESOLVED', 'CLOSED'].includes(claim.status) && (
                                    <li>
                                        <div className="relative pb-8">
                                            {claim.status === 'CLOSED' && (
                                                <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                                            )}
                                            <div className="relative flex space-x-3">
                                                <div>
                                                    <span className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center ring-8 ring-white">
                                                        <span className="text-white text-xs font-bold">4</span>
                                                    </span>
                                                </div>
                                                <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                                                    <div>
                                                        <p className="text-sm text-gray-900 font-medium">Claim Resolved</p>
                                                        <p className="text-sm text-gray-500">Status: RESOLVED</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </li>
                                )}

                                {/* Closed */}
                                {claim.status === 'CLOSED' && (
                                    <li>
                                        <div className="relative">
                                            <div className="relative flex space-x-3">
                                                <div>
                                                    <span className="h-8 w-8 rounded-full bg-gray-500 flex items-center justify-center ring-8 ring-white">
                                                        <span className="text-white text-xs font-bold">5</span>
                                                    </span>
                                                </div>
                                                <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                                                    <div>
                                                        <p className="text-sm text-gray-900 font-medium">Claim Closed</p>
                                                        <p className="text-sm text-gray-500">Status: CLOSED</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </li>
                                )}
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Sidebar Column */}
                <div className="space-y-6">
                    {/* Customer Information */}
                    <div className="bg-white shadow sm:rounded-lg p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <User className="w-5 h-5 text-gray-400" />
                            <h3 className="text-lg font-medium text-gray-900">Customer Details</h3>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Customer Name</p>
                            <p className="text-sm font-medium text-gray-900">{claim.customerName}</p>
                        </div>
                    </div>

                    {/* Product Information */}
                    <div className="bg-white shadow sm:rounded-lg p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Package className="w-5 h-5 text-gray-400" />
                            <h3 className="text-lg font-medium text-gray-900">Product Details</h3>
                        </div>
                        <div className="space-y-3 text-sm">
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Product</p>
                                <p className="text-sm font-medium text-gray-900">{claim.inventoryItem.product.brand} {claim.inventoryItem.product.name}</p>
                            </div>
                            <div className="pt-2 border-t">
                                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Model</p>
                                <p className="text-sm text-gray-700">{claim.inventoryItem.product.model}</p>
                            </div>
                            <div className="pt-2 border-t">
                                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Serial Number</p>
                                <p className="text-sm font-mono text-gray-700">{claim.inventoryItem.serialNumber}</p>
                            </div>
                            <div className="pt-2 border-t">
                                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Location</p>
                                <p className="text-sm text-gray-700">{claim.inventoryItem.location.name}</p>
                            </div>
                        </div>
                        <div className="mt-4 pt-3 border-t">
                            <Link href={`/dashboard/inventory/${claim.inventoryItem.product.id}`} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                                View Inventory Item →
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
