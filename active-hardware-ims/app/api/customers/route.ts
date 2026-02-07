import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { logCreate } from '@/lib/audit'

// GET - List all customers
export async function GET() {
    try {
        await requireAuth()

        const customers = await prisma.customer.findMany({
            orderBy: { name: 'asc' },
            include: {
                _count: {
                    select: { invoices: true }
                }
            }
        })
        return NextResponse.json(customers)
    } catch (error: any) {
        console.error(error)
        return NextResponse.json(
            { error: error.message || 'Failed to fetch customers' },
            { status: error.message === 'Unauthorized' ? 401 : 500 }
        )
    }
}

// POST - Create new customer
export async function POST(request: Request) {
    try {
        const user = await requireAuth()
        const body = await request.json()
        const { name, contactName, email, phone, address, taxId, salesRep, notes } = body

        if (!name) {
            return NextResponse.json({ error: 'Customer name is required' }, { status: 400 })
        }

        // Check for duplicate email if provided
        if (email) {
            const existing = await prisma.customer.findFirst({
                where: { email }
            })
            if (existing) {
                return NextResponse.json({ error: 'Customer with this email already exists' }, { status: 400 })
            }
        }

        const customer = await prisma.customer.create({
            data: {
                name,
                contactName,
                email,
                phone,
                address,
                taxId,
                salesRep,
                notes
            }
        })

        // Log customer creation
        await logCreate('CUSTOMER', customer.id, user.id, user.name, {
            name: customer.name,
            contactName: customer.contactName,
            email: customer.email,
            phone: customer.phone,
            salesRep: customer.salesRep
        })

        return NextResponse.json(customer)
    } catch (error: any) {
        console.error(error)
        return NextResponse.json(
            { error: error.message || 'Failed to create customer' },
            { status: error.message === 'Unauthorized' ? 401 : 500 }
        )
    }
}
