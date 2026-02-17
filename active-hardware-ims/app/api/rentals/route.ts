import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

export async function GET(request: Request) {
    try {
        await requireAuth()

        const assets = await prisma.rentalAsset.findMany({
            where: { isDeleted: false },
            include: {
                currentContract: {
                    include: {
                        customer: true
                    }
                },
                product: true
            },
            orderBy: {
                status: 'asc'
            }
        })

        return NextResponse.json(assets)
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to fetch assets' },
            { status: 500 }
        )
    }
}

export async function POST(request: Request) {
    try {
        await requireAuth()
        const body = await request.json()
        const { name, serialNumber, productId, notes } = body

        if (!name || !serialNumber) {
            return NextResponse.json(
                { error: 'Name and Serial Number are required' },
                { status: 400 }
            )
        }

        const existing = await prisma.rentalAsset.findUnique({
            where: { serialNumber }
        })

        if (existing) {
            return NextResponse.json(
                { error: 'Asset with this serial number already exists' },
                { status: 400 }
            )
        }

        const asset = await prisma.rentalAsset.create({
            data: {
                name,
                serialNumber,
                productId: productId || null,
                notes,
                status: "AVAILABLE"
            }
        })

        return NextResponse.json(asset)
    } catch (error: any) {
        console.error("Asset creation failed:", error)
        return NextResponse.json(
            { error: error.message || 'Failed to create asset' },
            { status: 500 }
        )
    }
}
