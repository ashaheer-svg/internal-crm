import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(request: Request) {
    try {
        await requireAuth()
        const taxes = await prisma.taxConfiguration.findMany({
            orderBy: { name: 'asc' }
        })
        return NextResponse.json(taxes)
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch taxes' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        await requireAuth()
        const body = await request.json()
        const { name, rate, type = 'PERCENTAGE' } = body

        if (!name || rate === undefined) {
            return NextResponse.json({ error: 'Name and rate are required' }, { status: 400 })
        }

        const tax = await prisma.taxConfiguration.create({
            data: {
                name,
                rate: parseFloat(rate),
                type,
                isActive: true
            }
        })

        return NextResponse.json(tax)
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to create tax' },
            { status: 500 }
        )
    }
}

export async function PUT(request: Request) {
    try {
        await requireAuth()
        const body = await request.json()
        const { id, name, rate, isActive, type } = body

        if (!id) {
            return NextResponse.json({ error: 'Tax ID is required' }, { status: 400 })
        }

        const tax = await prisma.taxConfiguration.update({
            where: { id },
            data: {
                name,
                rate: rate !== undefined ? parseFloat(rate) : undefined,
                isActive,
                type
            }
        })

        return NextResponse.json(tax)
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to update tax' },
            { status: 500 }
        )
    }
}

export async function DELETE(request: Request) {
    try {
        await requireAuth()
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'Tax ID is required' }, { status: 400 })
        }

        await prisma.taxConfiguration.delete({
            where: { id }
        })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to delete tax' },
            { status: 500 }
        )
    }
}
