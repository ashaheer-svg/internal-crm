import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

export async function GET(request: Request) {
    try {
        await requireAuth()
        const { searchParams } = new URL(request.url)
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '10')
        const search = searchParams.get('search')
        const sortKey = searchParams.get('sortKey') || 'status'
        const sortDir = (searchParams.get('sortDir') as 'asc' | 'desc') || 'asc'

        const skip = (page - 1) * limit
        const where: any = { isDeleted: false }

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { serialNumber: { contains: search, mode: 'insensitive' } },
                { notes: { contains: search, mode: 'insensitive' } },
                { product: { name: { contains: search, mode: 'insensitive' } } },
                { currentContract: { customer: { name: { contains: search, mode: 'insensitive' } } } }
            ]
        }

        const orderBy: any = {}
        if (sortKey === 'product') orderBy.product = { name: sortDir }
        else if (sortKey === 'customer') orderBy.currentContract = { customer: { name: sortDir } }
        else orderBy[sortKey] = sortDir

        const [assets, total] = await Promise.all([
            prisma.rentalAsset.findMany({
                where,
                skip,
                take: limit,
                include: {
                    currentContract: {
                        include: {
                            customer: true
                        }
                    },
                    product: true
                },
                orderBy
            }),
            prisma.rentalAsset.count({ where })
        ])

        return NextResponse.json({
            assets,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        })
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
