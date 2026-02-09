import { prisma } from "@/lib/db"
import Link from "next/link"
import { ArrowLeft, Box, MapPin, Edit } from "lucide-react"

import AddInventoryForm from "./AddInventoryForm"
import InventoryItemActions from "./InventoryItemActions"
import InventoryTable from "./InventoryTable"
import StockSummary from "./StockSummary"

interface PageProps {
    params: Promise<{ id: string }>
}

async function getProduct(id: string) {
    return await prisma.product.findUnique({
        where: { id },
        include: {
            inventory: {
                include: {
                    location: true
                },
                orderBy: { createdAt: 'desc' }
            }
        }
    })
}

async function getLocations() {
    return await prisma.location.findMany({ select: { id: true, name: true } })
}

export default async function ProductDetailsPage({ params }: PageProps) {
    const { id } = await params
    const product = await getProduct(id)
    const locations = await getLocations()

    if (!product) {
        return <div>Product not found</div>
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/inventory" className="p-2 hover:bg-gray-200 rounded-full">
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900">{product.name}</h1>
                        <p className="text-sm text-gray-500">SKU: {product.sku} | Brand: {product.brand} | Category: {product.category}</p>
                    </div>
                </div>
                <Link
                    href={`/dashboard/inventory/${product.id}/edit`}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Product
                </Link>
            </div>

            {/* Stock Summary - Above Table */}
            <StockSummary productId={product.id} inventory={product.inventory} />

            {/* Inventory Table - Full Width */}
            <div className="space-y-6">
                <InventoryTable inventory={product.inventory} locations={locations} />
            </div>

            {/* Add Inventory Form - Full Width Below */}
            <div className="bg-white shadow sm:rounded-lg p-6">
                <div className="max-w-3xl">
                    <h3 className="text-lg font-medium text-gray-900 mb-1">Add Inventory (Inward)</h3>
                    <p className="text-sm text-gray-500 mb-6">Add single or multiple items with serial numbers</p>
                    <AddInventoryForm productId={product.id} locations={locations} />
                </div>
            </div>
        </div>
    )
}

