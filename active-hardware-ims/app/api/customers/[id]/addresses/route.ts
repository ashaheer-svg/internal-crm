import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    try {
        await requireAuth()

        const addresses = await prisma.deliveryAddress.findMany({
            where: { customerId: id },
            orderBy: { isDefault: 'desc' }
        })

        return NextResponse.json(addresses)
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    try {
        await requireAuth()
        const body = await request.json()
        const { label, address, contactName, phone, isDefault } = body

        if (!label || !address) {
            return NextResponse.json({ error: "Label and Address are required" }, { status: 400 })
        }

        // If setting as default, unset other defaults
        if (isDefault) {
            await prisma.deliveryAddress.updateMany({
                where: { customerId: id },
                data: { isDefault: false }
            })
        }

        const newAddress = await prisma.deliveryAddress.create({
            data: {
                customerId: id,
                label,
                address,
                contactName,
                phone,
                isDefault: isDefault || false
            }
        })

        return NextResponse.json(newAddress)
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
