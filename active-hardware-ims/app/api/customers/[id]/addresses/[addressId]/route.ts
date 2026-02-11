import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

export async function PUT(request: Request, { params }: { params: Promise<{ id: string, addressId: string }> }) {
    const { id, addressId } = await params
    try {
        await requireAuth()
        const body = await request.json()
        const { label, address, contactName, phone, isDefault } = body

        // If setting as default, unset other defaults
        if (isDefault) {
            await prisma.deliveryAddress.updateMany({
                where: {
                    customerId: id,
                    id: { not: addressId }
                },
                data: { isDefault: false }
            })
        }

        const updatedAddress = await prisma.deliveryAddress.update({
            where: { id: addressId },
            data: {
                label,
                address,
                contactName,
                phone,
                isDefault
            }
        })

        return NextResponse.json(updatedAddress)
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string, addressId: string }> }) {
    const { addressId } = await params
    try {
        await requireAuth()

        await prisma.deliveryAddress.delete({
            where: { id: addressId }
        })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
