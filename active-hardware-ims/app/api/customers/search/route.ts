import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET - Search customers
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const query = searchParams.get('q') || ''
        const type = searchParams.get('type') // 'CUSTOMER', 'SUPPLIER', 'PARTNER' or 'ALL'

        const where: any = {
            OR: [
                { name: { startsWith: query } },
                { email: { startsWith: query } },
                { phone: { startsWith: query } }
            ],
            isActive: true
        }

        if (type && type !== 'ALL') {
            if (type === 'CUSTOMER') where.isCustomer = true
            else if (type === 'SUPPLIER') where.isSupplier = true
            else if (type === 'PARTNER') where.isPartner = true
        }

        const customers = await prisma.customer.findMany({
            where,
            orderBy: { name: 'asc' },
            take: 20
        })

        return NextResponse.json(customers)
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: 'Failed to search customers' }, { status: 500 })
    }
}
