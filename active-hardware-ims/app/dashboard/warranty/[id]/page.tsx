import { prisma } from "@/lib/db"
import Link from "next/link"
import { ArrowLeft, Package, User, FileText, Clock } from "lucide-react"
import { notFound } from "next/navigation"
import StatusUpdateForm from "./StatusUpdateForm"
import ReplacementForm from "./ReplacementForm"
import ReplacementDetails from "./ReplacementDetails"
import { formatDate } from "@/lib/utils"

interface PageProps {
    params: Promise<{ id: string }>
}

async function getWarrantyClaim(id: string) {
    const claim = await prisma.warrantyClaim.findUnique({
        where: { id },
        include: {
            inventoryItem: {
                include: {
                    product: true,
                    location: true
                }
            }
        }
    })

    if (!claim) return null

    // If there's a replacement, fetch its details
    let replacementItemDetails = null
    if (claim.replacementItemId) {
        replacementItemDetails = await prisma.inventoryItem.findUnique({
            where: { id: claim.replacementItemId },
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
                return 'bg-orange-100 text-orange-800'
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
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/warranty" className="p-2 hover:bg-gray-200 rounded-full">
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Warranty Claim</h1>
                        <p className="text-sm text-gray-500">Claim ID: {claim.id}</p>
                    </div>
                </div>
            </div>

            {/* Claim Status */}
            <div className="bg-white shadow sm:rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Claim Status</h3>
                    <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${getStatusBadgeClass(claim.status)}`}>
                        {getStatusLabel(claim.status)}
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                        <p className="text-sm font-medium text-gray-500">Created</p>
                        <p className="mt-1 text-sm text-gray-900">{new Date(claim.createdAt).toLocaleString()}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Last Updated</p>
                        <p className="mt-1 text-sm text-gray-900">{new Date(claim.updatedAt).toLocaleString()}</p>
                    </div>
                </div>

                {/* Status Update Form */}
                <StatusUpdateForm claimId={claim.id} currentStatus={claim.status} />
            </div>

            {/* Customer Information */}
            <div className="bg-white shadow sm:rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                    <User className="w-5 h-5 text-gray-400" />
                    <h3 className="text-lg font-medium text-gray-900">Customer Information</h3>
                </div>
                <div>
                    <p className="text-sm font-medium text-gray-500">Customer Name</p>
                    <p className="mt-1 text-sm text-gray-900">{claim.customerName}</p>
                </div>
            </div>

            {/* Product Information */}
            <div className="bg-white shadow sm:rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Package className="w-5 h-5 text-gray-400" />
                    <h3 className="text-lg font-medium text-gray-900">Product Information</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-sm font-medium text-gray-500">Product</p>
                        <p className="mt-1 text-sm text-gray-900">
                            {claim.inventoryItem.product.brand} {claim.inventoryItem.product.name}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Model</p>
                        <p className="mt-1 text-sm text-gray-900">{claim.inventoryItem.product.model}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Serial Number</p>
                        <p className="mt-1 text-sm text-gray-900 font-mono">{claim.inventoryItem.serialNumber}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Location</p>
                        <p className="mt-1 text-sm text-gray-900">{claim.inventoryItem.location.name}</p>
                    </div>
                </div>
                <div className="mt-4">
                    <Link
                        href={`/dashboard/inventory/${claim.inventoryItem.product.id}`}
                        className="text-sm text-blue-600 hover:text-blue-800"
                    >
                        View Inventory Item →
                    </Link>
                </div>
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
            {(claim.replacementItemDetails || claim.replacementExternalInfo) && claim.replacementType ? (
                <ReplacementDetails
                    claimId={claim.id}
                    replacementType={claim.replacementType}
                    replacementItemDetails={claim.replacementItemDetails}
                    replacementExternalInfo={claim.replacementExternalInfo}
                    replacementProvidedAt={claim.replacementProvidedAt!}
                    replacementReturnedAt={claim.replacementReturnedAt}
                />
            ) : (
                <ReplacementForm
                    claimId={claim.id}
                    hasReplacement={!!claim.replacementItemId || !!claim.replacementExternalInfo}
                    replacementType={claim.replacementType}
                />
            )}

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
                        {claim.status !== 'PENDING' && (
                            <li>
                                <div className="relative pb-8">
                                    <div className="relative flex space-x-3">
                                        <div>
                                            <span className={`h-8 w-8 rounded-full ${claim.status === 'SENT_TO_VENDOR' || claim.status === 'REPAIRED' || claim.status === 'RETURNED' ? 'bg-blue-500' : 'bg-gray-300'} flex items-center justify-center ring-8 ring-white`}>
                                                <span className="text-white text-xs font-bold">2</span>
                                            </span>
                                        </div>
                                        <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                                            <div>
                                                <p className="text-sm text-gray-900 font-medium">Sent to Vendor</p>
                                                <p className="text-sm text-gray-500">Status: SENT_TO_VENDOR</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </li>
                        )}
                        {(claim.status === 'REPAIRED' || claim.status === 'RETURNED') && (
                            <li>
                                <div className="relative pb-8">
                                    <div className="relative flex space-x-3">
                                        <div>
                                            <span className={`h-8 w-8 rounded-full ${claim.status === 'REPAIRED' || claim.status === 'RETURNED' ? 'bg-green-500' : 'bg-gray-300'} flex items-center justify-center ring-8 ring-white`}>
                                                <span className="text-white text-xs font-bold">3</span>
                                            </span>
                                        </div>
                                        <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                                            <div>
                                                <p className="text-sm text-gray-900 font-medium">Repaired</p>
                                                <p className="text-sm text-gray-500">Status: REPAIRED</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </li>
                        )}
                        {claim.status === 'RETURNED' && (
                            <li>
                                <div className="relative">
                                    <div className="relative flex space-x-3">
                                        <div>
                                            <span className="h-8 w-8 rounded-full bg-gray-500 flex items-center justify-center ring-8 ring-white">
                                                <span className="text-white text-xs font-bold">4</span>
                                            </span>
                                        </div>
                                        <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                                            <div>
                                                <p className="text-sm text-gray-900 font-medium">Returned to Customer</p>
                                                <p className="text-sm text-gray-500">Status: RETURNED</p>
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
    )
}
