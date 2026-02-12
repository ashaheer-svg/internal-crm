import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    try {
        await requireAuth()

        // Include soft-deleted employees, or maybe we want to filter them?
        // Requirement says "soft and hard delete". Usually soft delete means they are hidden or marked.
        // Let's return all for now and let frontend filter if needed, OR filter by isActive=true by default?
        // The user wants to be able to "soft delete", implying they might want to see them or restore them?
        // Let's just return all and let UI decide how to show them (e.g. grayed out).
        const employees = await prisma.partnerEmployee.findMany({
            where: { customerId: id },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json(employees)
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    try {
        await requireAuth()
        const body = await request.json()
        const { name, designation, email, phone } = body

        if (!name) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 })
        }

        const newEmployee = await prisma.partnerEmployee.create({
            data: {
                customerId: id,
                name,
                designation,
                email,
                phone
            }
        })

        return NextResponse.json(newEmployee)
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
