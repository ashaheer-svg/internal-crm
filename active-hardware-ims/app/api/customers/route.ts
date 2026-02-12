import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { logCreate } from '@/lib/audit'

// GET - List all customers
export async function GET(request: Request) {
    try {
        await requireAuth()
        const { searchParams } = new URL(request.url)
        const type = searchParams.get('type') // 'CUSTOMER', 'SUPPLIER', 'PARTNER' or 'ALL'
        const showInactive = searchParams.get('showInactive') === 'true'

        const where: any = {}

        if (type && type !== 'ALL') {
            if (type === 'CUSTOMER') where.isCustomer = true
            else if (type === 'SUPPLIER') where.isSupplier = true
            else if (type === 'PARTNER') where.isPartner = true
        }

        if (!showInactive) where.isActive = true

        const customers = await prisma.customer.findMany({
            where,
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
        // Log to file for debugging
        const fs = require('fs');
        fs.appendFileSync('debug_error.log', `${new Date().toISOString()} - Customer API Error: ${error.message}\n${error.stack}\n`);

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
        const { name, contactName, email, phone, address, taxId, salesRep, notes, isCustomer, isSupplier, isPartner } = body

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
                notes,
                isCustomer: isCustomer || false,
                isSupplier: isSupplier || false,
                isPartner: isPartner || false,
                isActive: true
            }
        })

        // Log customer creation
        await logCreate('CUSTOMER', customer.id, user.id, user.name, {
            name: customer.name,
            contactName: customer.contactName,
            email: customer.email,
            phone: customer.phone,
            salesRep: customer.salesRep,
            roles: { isCustomer, isSupplier, isPartner }
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
