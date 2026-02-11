
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        await requireAuth()
        const body = await request.json()
        const { name, email, phone, address, type, isActive } = body

        const partner = await prisma.partner.update({
            where: { id: params.id },
            data: {
                name,
                email,
                phone,
                address,
                type,
                isActive
            }
        })

        return NextResponse.json(partner)
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        await requireAuth()
        const { searchParams } = new URL(request.url)
        const hardDelete = searchParams.get('hard') === 'true'

        if (hardDelete) {
            await prisma.partner.delete({
                where: { id: params.id }
            })
        } else {
            // Soft delete
            await prisma.partner.update({
                where: { id: params.id },
                data: { isActive: false }
            })
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
