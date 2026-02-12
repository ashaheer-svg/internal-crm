import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

export async function PUT(request: Request, { params }: { params: Promise<{ id: string, employeeId: string }> }) {
    const { id, employeeId } = await params
    try {
        await requireAuth()
        const body = await request.json()
        const { name, designation, email, phone, isActive } = body

        const updatedEmployee = await prisma.partnerEmployee.update({
            where: { id: employeeId },
            data: {
                name,
                designation,
                email,
                phone,
                isActive
            }
        })

        return NextResponse.json(updatedEmployee)
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string, employeeId: string }> }) {
    const { employeeId } = await params
    const { searchParams } = new URL(request.url)
    const hardDelete = searchParams.get('hard') === 'true'

    try {
        await requireAuth()

        if (hardDelete) {
            await prisma.partnerEmployee.delete({
                where: { id: employeeId }
            })
            return NextResponse.json({ success: true, mode: 'hard' })
        } else {
            const updated = await prisma.partnerEmployee.update({
                where: { id: employeeId },
                data: { isActive: false }
            })
            return NextResponse.json(updated)
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
