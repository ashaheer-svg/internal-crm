import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

interface RouteParams {
    params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteParams) {
    try {
        const { id } = await params

        const claim = await prisma.warrantyClaim.findUnique({
            where: { id },
            include: {
                inventoryItem: {
                    include: {
                        product: true,
                        location: true
                    }
                }
            }
        })

        if (!claim) {
            return NextResponse.json({ error: 'Warranty claim not found' }, { status: 404 })
        }

        return NextResponse.json(claim)
    } catch (error) {
        console.error('Failed to fetch warranty claim:', error)
        return NextResponse.json({ error: 'Failed to fetch warranty claim' }, { status: 500 })
    }
}

export async function PATCH(request: Request, { params }: RouteParams) {
    try {
        const { id } = await params
        const body = await request.json()
        const { status } = body

        // Validate status
        const validStatuses = ['PENDING', 'SENT_TO_VENDOR', 'REPAIRED', 'RETURNED']
        if (status && !validStatuses.includes(status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
        }

        const claim = await prisma.warrantyClaim.update({
            where: { id },
            data: { status },
            include: {
                inventoryItem: {
                    include: {
                        product: true,
                        location: true
                    }
                }
            }
        })

        return NextResponse.json(claim)
    } catch (error) {
        console.error('Failed to update warranty claim:', error)
        return NextResponse.json({ error: 'Failed to update warranty claim' }, { status: 500 })
    }
}

export async function DELETE(request: Request, { params }: RouteParams) {
    try {
        const { id } = await params

        await prisma.warrantyClaim.delete({
            where: { id }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Failed to delete warranty claim:', error)
        return NextResponse.json({ error: 'Failed to delete warranty claim' }, { status: 500 })
    }
}
