import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth"
import { softDeleteAsset } from "@/lib/service-manager"

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(request: Request, { params }: RouteParams) {
    try {
        await requireAuth()
        const { id } = await params

        const asset = await prisma.rentalAsset.findUnique({
            where: { id },
            include: {
                currentContract: {
                    include: { customer: true }
                },
                product: true
            }
        })

        if (!asset) {
            return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
        }

        return NextResponse.json(asset)
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to fetch asset' },
            { status: 500 }
        )
    }
}

export async function PATCH(request: Request, { params }: RouteParams) {
    try {
        await requireAuth()
        const { id } = await params
        const body = await request.json()

        const { name, serialNumber, productId, notes, isDeleted } = body

        // Handle Soft Delete via API
        if (isDeleted) {
            const deleted = await softDeleteAsset(id)
            return NextResponse.json(deleted)
        }

        const updated = await prisma.rentalAsset.update({
            where: { id },
            data: {
                name,
                serialNumber,
                productId: productId || null,
                notes
            }
        })

        return NextResponse.json(updated)

    } catch (error: any) {
        console.error("Asset update failed:", error)
        return NextResponse.json(
            { error: error.message || 'Failed to update asset' },
            { status: 500 }
        )
    }
}

// Hard Delete (Admin only - ideally)
export async function DELETE(request: Request, { params }: RouteParams) {
    try {
        await requireAuth()
        const { id } = await params

        await prisma.rentalAsset.delete({
            where: { id }
        })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to delete asset' },
            { status: 500 }
        )
    }
}
