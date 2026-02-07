import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const location = await prisma.location.findUnique({
            where: { id: params.id },
            include: {
                _count: {
                    select: { inventory: true }
                }
            }
        })

        if (!location) {
            return NextResponse.json({ error: 'Location not found' }, { status: 404 })
        }

        return NextResponse.json(location)
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch location' }, { status: 500 })
    }
}

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json()
        const { name, type, address } = body

        if (!name || !type) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const location = await prisma.location.update({
            where: { id: params.id },
            data: {
                name,
                type,
                address
            }
        })

        return NextResponse.json(location)
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update location' }, { status: 500 })
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        // Check if location has inventory
        const location = await prisma.location.findUnique({
            where: { id: params.id },
            include: {
                _count: {
                    select: { inventory: true }
                }
            }
        })

        if (!location) {
            return NextResponse.json({ error: 'Location not found' }, { status: 404 })
        }

        if (location._count.inventory > 0) {
            return NextResponse.json(
                { error: `Cannot delete location with ${location._count.inventory} items in stock` },
                { status: 400 }
            )
        }

        await prisma.location.delete({
            where: { id: params.id }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete location' }, { status: 500 })
    }
}
