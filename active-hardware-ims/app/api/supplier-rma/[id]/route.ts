import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePermission } from '@/lib/auth'

interface RouteParams {
    params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteParams) {
    try {
        await requirePermission('warranty_rma:read')
        const { id } = await params

        const supplierRma = await (prisma as any).supplierRMA.findUnique({
            where: { id },
            include: {
                defectiveItem: { include: { product: true } },
                supplier: true,
                warrantyClaim: true,
                receivedItem: { include: { product: true } }
            }
        })

        if (!supplierRma) {
            return NextResponse.json({ error: 'Supplier RMA not found' }, { status: 404 })
        }

        return NextResponse.json(supplierRma)
    } catch (error: any) {
        console.error('Failed to fetch supplier RMA:', error)
        return NextResponse.json({ error: 'Failed to fetch supplier RMA' }, { status: 500 })
    }
}

export async function PATCH(request: Request, { params }: RouteParams) {
    try {
        await requirePermission('warranty_rma:update')
        const { id } = await params
        const body = await request.json()
        const { supplierRmaRef, notes, status } = body

        const updateData: any = {}
        if (supplierRmaRef !== undefined) updateData.supplierRmaRef = supplierRmaRef
        if (notes !== undefined) updateData.notes = notes
        if (status) updateData.status = status // Manually override list if needed

        const supplierRma = await (prisma as any).supplierRMA.update({
            where: { id },
            data: updateData
        })

        return NextResponse.json(supplierRma)
    } catch (error: any) {
        console.error('Failed to update supplier RMA:', error)
        return NextResponse.json({ error: 'Failed to update supplier RMA' }, { status: 500 })
    }
}
