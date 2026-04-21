import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

export async function GET(request: Request) {
    try {
        await requireAuth()
        const { searchParams } = new URL(request.url)
        const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : null
        const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : null
        const search = searchParams.get('search')
        const sortKey = searchParams.get('sortKey') || 'name'
        const sortDir = (searchParams.get('sortDir') as 'asc' | 'desc') || 'asc'

        const where: any = {}
        if (search) {
            where.OR = [
                { name: { startsWith: search } },
                { email: { startsWith: search } }
            ]
        }

        const orderBy: any = {}
        if (sortKey === 'createdAt') orderBy.createdAt = sortDir
        else if (sortKey === 'name') orderBy.name = sortDir
        else if (sortKey === 'status') orderBy.status = sortDir
        else orderBy[sortKey] = sortDir

        if (page && limit) {
            const skip = (page - 1) * limit
            const [salesReps, total] = await Promise.all([
                prisma.salesRep.findMany({
                    where,
                    orderBy,
                    skip,
                    take: limit,
                }),
                prisma.salesRep.count({ where })
            ])
            return NextResponse.json({
                salesReps,
                meta: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit)
                }
            })
        }

        const salesReps = await prisma.salesRep.findMany({
            where,
            orderBy,
        })
        return NextResponse.json(salesReps)
    } catch (error) {
        return NextResponse.json(
            { error: "Failed to fetch sales representatives" },
            { status: 500 }
        )
    }
}

export async function POST(request: Request) {
    try {
        await requireAuth()
        const body = await request.json()
        const { name, email, phone } = body

        if (!name) {
            return NextResponse.json(
                { error: "Name is required" },
                { status: 400 }
            )
        }

        const salesRep = await prisma.salesRep.create({
            data: {
                name,
                email,
                phone,
            },
        })

        return NextResponse.json(salesRep, { status: 201 })
    } catch (error) {
        return NextResponse.json(
            { error: "Failed to create sales representative" },
            { status: 500 }
        )
    }
}
