import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await requireAuth()
        const { id } = await params
        const salesRep = await prisma.salesRep.findUnique({
            where: { id },
        })

        if (!salesRep) {
            return NextResponse.json(
                { error: "Sales representative not found" },
                { status: 404 }
            )
        }

        return NextResponse.json(salesRep)
    } catch (error) {
        return NextResponse.json(
            { error: "Failed to fetch sales representative" },
            { status: 500 }
        )
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await requireAuth()
        const { id } = await params
        const body = await request.json()
        const { name, email, phone, isActive } = body

        const salesRep = await prisma.salesRep.update({
            where: { id },
            data: {
                name,
                email,
                phone,
                isActive,
            },
        })

        return NextResponse.json(salesRep)
    } catch (error) {
        return NextResponse.json(
            { error: "Failed to update sales representative" },
            { status: 500 }
        )
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await requireAuth()
        const { id } = await params
        const { searchParams } = new URL(request.url)
        const type = searchParams.get("type") // "hard" or "soft"

        if (type === "hard") {
            // Check for relations before hard delete
            const relations = await prisma.salesRep.findUnique({
                where: { id },
                include: {
                    _count: {
                        select: {
                            customers: true,
                            deliveryOrders: true,
                        },
                    },
                },
            })

            if (relations && (relations._count.customers > 0 || relations._count.deliveryOrders > 0)) {
                return NextResponse.json(
                    { error: "Cannot permanently delete Sales Rep with associated Customers or Delivery Orders. Use soft delete instead." },
                    { status: 400 }
                )
            }

            await prisma.salesRep.delete({
                where: { id },
            })
            return NextResponse.json({ message: "Sales representative deleted permanently" })
        } else {
            // Default to soft delete
            await prisma.salesRep.update({
                where: { id },
                data: { isActive: false },
            })
            return NextResponse.json({ message: "Sales representative deactivated" })
        }
    } catch (error) {
        return NextResponse.json(
            { error: "Failed to delete sales representative" },
            { status: 500 }
        )
    }
}
