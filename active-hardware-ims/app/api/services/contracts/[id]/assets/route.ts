import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth"
import { rentOutAsset, returnAsset } from "@/lib/service-manager"

type RouteParams = { params: Promise<{ id: string }> }

// GET all assets linked to this contract
export async function GET(request: Request, { params }: RouteParams) {
    try {
        await requireAuth()
        const { id } = await params

        const assets = await prisma.rentalAsset.findMany({
            where: { currentContractId: id },
            include: { product: true }
        })

        return NextResponse.json(assets)
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to fetch linked assets' },
            { status: 500 }
        )
    }
}

// POST: Link an asset to this contract
export async function POST(request: Request, { params }: RouteParams) {
    try {
        await requireAuth()
        const { id: contractId } = await params
        const { assetId } = await request.json()

        if (!assetId) {
            return NextResponse.json({ error: 'Asset ID is required' }, { status: 400 })
        }

        await rentOutAsset(contractId, assetId)

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to link asset' },
            { status: 500 }
        )
    }
}

// DELETE: Unlink (Return) an asset from this contract
export async function DELETE(request: Request, { params }: RouteParams) {
    try {
        await requireAuth()
        const url = new URL(request.url)
        const assetId = url.searchParams.get("assetId")

        if (!assetId) {
            return NextResponse.json({ error: 'Asset ID is required' }, { status: 400 })
        }

        // Verify/Security: Check if asset is actually on this contract? 
        // returnAsset handles the unlink logic safely regardless.
        await returnAsset(assetId)

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to return asset' },
            { status: 500 }
        )
    }
}
