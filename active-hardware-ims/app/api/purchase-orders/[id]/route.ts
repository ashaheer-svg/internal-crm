import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const purchaseOrder = await prisma.purchaseOrder.findUnique({
            where: { id },
            include: {
                items: {
                    include: {
                        product: true
                    }
                }
            }
        })

        if (!purchaseOrder) {
            return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 })
        }

        return NextResponse.json(purchaseOrder)
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch purchase order' }, { status: 500 })
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const body = await request.json()
        const { supplier, notes, items, status, poDate } = body

        // Fetch current PO to check status
        const currentPo = await prisma.purchaseOrder.findUnique({
            where: { id },
            include: { items: true }
        })

        if (!currentPo) {
            return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 })
        }

        // Only allow full editing if DRAFT
        if (currentPo.status !== 'DRAFT' && items) {
            // If trying to change items on non-draft, ideally block or warn. 
            // For now, let's block item changes if receivedQty > 0 on any item
            const hasReceived = currentPo.items.some(i => i.receivedQty > 0)
            if (hasReceived) {
                return NextResponse.json({ error: 'Cannot edit items of a PO that has received stock.' }, { status: 400 })
            }
        }

        // Calculate total
        let totalAmount = currentPo.totalAmount
        if (items) {
            totalAmount = items.reduce((sum: number, item: any) => sum + item.totalCost, 0)
        }

        // Update transaction
        const result = await prisma.$transaction(async (tx) => {
            // 1. Update PO fields
            const updatedPo = await tx.purchaseOrder.update({
                where: { id },
                data: {
                    supplier,
                    notes,
                    status,
                    totalAmount,
                    createdAt: poDate ? new Date(poDate) : undefined
                }
            })

            // 2. Update Items (Delete all and recreate if items provided)
            if (items) {
                await tx.purchaseOrderItem.deleteMany({
                    where: { purchaseOrderId: id }
                })

                await tx.purchaseOrderItem.createMany({
                    data: items.map((item: any) => ({
                        purchaseOrderId: id,
                        productId: item.productId,
                        quantity: item.quantity,
                        unitCost: item.unitCost,
                        totalCost: item.totalCost
                    }))
                })
            }

            return updatedPo
        })

        return NextResponse.json(result)
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: 'Failed to update purchase order' }, { status: 500 })
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        // Check if received info exists
        const currentPo = await prisma.purchaseOrder.findUnique({
            where: { id },
            include: { items: true }
        })

        if (currentPo && currentPo.items.some(i => i.receivedQty > 0)) {
            return NextResponse.json({ error: 'Cannot delete PO with received stock' }, { status: 400 })
        }

        await prisma.purchaseOrder.delete({
            where: { id }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete purchase order' }, { status: 500 })
    }
}
