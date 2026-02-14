import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

export async function GET() {
    try {
        await requireAuth()
        const salesReps = await prisma.salesRep.findMany({
            orderBy: { name: "asc" },
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
