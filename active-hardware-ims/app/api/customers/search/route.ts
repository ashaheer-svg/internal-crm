import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET - Search customers
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const query = searchParams.get('q') || ''

        const customers = await prisma.customer.findMany({
            where: {
                OR: [
                    { name: { contains: query } },
                    { email: { contains: query } },
                    { phone: { contains: query } }
                ]
            },
            orderBy: { name: 'asc' },
            take: 20
        })

        return NextResponse.json(customers)
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: 'Failed to search customers' }, { status: 500 })
    }
}
