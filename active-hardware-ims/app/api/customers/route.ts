import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { logCreate } from '@/lib/audit'
import { logger } from '@/lib/logger'

// GET - List all customers with pagination and filtering
export async function GET(request: Request) {
    try {
        await requireAuth()
        const { searchParams } = new URL(request.url)

        // Pagination params
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '10')
        const skip = (page - 1) * limit

        // Filtering params
        const search = searchParams.get('search') || ''
        const type = searchParams.get('type') // 'CUSTOMER', 'SUPPLIER', 'PARTNER' or 'ALL'
        const roles = searchParams.get('roles')?.split(',').filter(Boolean) || []
        const showInactive = searchParams.get('showInactive') === 'true'

        // If type is provided, map it to roles
        if (type && type !== 'ALL') {
            if (type === 'CUSTOMER') roles.push('isCustomer')
            if (type === 'SUPPLIER') roles.push('isSupplier')
            if (type === 'PARTNER') roles.push('isPartner')
        }

        const where: any = {}

        // Role filtering (OR condition)
        if (roles.length > 0) {
            where.OR = roles.map(role => ({ [role]: true }))
        }

        // Search filtering
        if (search) {
            where.AND = [
                ...(where.AND || []),
                {
                    OR: [
                        { name: { contains: search } },
                        { email: { contains: search } },
                        { contactName: { contains: search } },
                        { phone: { contains: search } }
                    ]
                }
            ]
        }

        if (!showInactive) where.isActive = true

        const [customers, totalCount] = await Promise.all([
            prisma.customer.findMany({
                where,
                orderBy: { name: 'asc' },
                skip,
                take: limit,
                include: {
                    salesRep: true,
                    _count: {
                        select: { invoices: true }
                    }
                }
            }),
            prisma.customer.count({ where })
        ])

        return NextResponse.json({
            customers,
            totalCount,
            page,
            totalPages: Math.ceil(totalCount / limit)
        })
    } catch (error: any) {
        logger.error("Customer API Error", error);
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
        const { name, contactName, email, phone, address, taxId, salesRepLegacy, notes, isCustomer, isSupplier, isPartner, salesRepId } = body

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
                salesRepLegacy,
                salesRepId,
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
            salesRepId: customer.salesRepId,
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
