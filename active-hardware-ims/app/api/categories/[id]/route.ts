import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json()
        const { name, description } = body
        const { id } = params

        if (!name) {
            return NextResponse.json(
                { error: "Name is required" },
                { status: 400 }
            )
        }

        const category = await prisma.category.update({
            where: { id },
            data: {
                name,
                description,
            },
        })

        return NextResponse.json(category)
    } catch (error) {
        return NextResponse.json(
            { error: "Failed to update category" },
            { status: 500 }
        )
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params
        await prisma.category.delete({
            where: { id },
        })

        return NextResponse.json({ message: "Category deleted" })
    } catch (error) {
        return NextResponse.json(
            { error: "Failed to delete category" },
            { status: 500 }
        )
    }
}
