import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { logUpdate, logDelete } from '@/lib/audit'

// GET - Get single customer
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    try {
        await requireAuth()

        const customer = await prisma.customer.findUnique({
            where: { id },
            include: {
                invoices: {
                    orderBy: { createdAt: 'desc' },
                    take: 10
                }
            }
        })

        if (!customer) {
            return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
        }

        return NextResponse.json(customer)
    } catch (error: any) {
        console.error(error)
        return NextResponse.json(
            { error: error.message || 'Failed to fetch customer' },
            { status: error.message === 'Unauthorized' ? 401 : 500 }
        )
    }
}

// PATCH - Update customer
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    try {
        const user = await requireAuth()
        const body = await request.json()
        const { name, contactName, email, phone, address, taxId, salesRep, notes, isCustomer, isSupplier, isPartner, isActive } = body

        // Get existing customer for audit log
        const existingCustomer = await prisma.customer.findUnique({
            where: { id }
        })

        if (!existingCustomer) {
            return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
        }

        // Check for duplicate email if changing email
        if (email && email !== existingCustomer.email) {
            const existing = await prisma.customer.findFirst({
                where: {
                    email,
                    id: { not: id }
                }
            })
            if (existing) {
                return NextResponse.json({ error: 'Customer with this email already exists' }, { status: 400 })
            }
        }

        const customer = await prisma.customer.update({
            where: { id },
            data: {
                name,
                contactName,
                email,
                phone,
                address,
                taxId,
                salesRep,
                notes,
                isCustomer: isCustomer !== undefined ? isCustomer : existingCustomer.isCustomer,
                isSupplier: isSupplier !== undefined ? isSupplier : existingCustomer.isSupplier,
                isPartner: isPartner !== undefined ? isPartner : existingCustomer.isPartner,
                isActive: isActive !== undefined ? isActive : existingCustomer.isActive
            }
        })

        // Log customer update
        await logUpdate('CUSTOMER', customer.id, user.id, user.name,
            {
                name: existingCustomer.name,
                contactName: existingCustomer.contactName,
                email: existingCustomer.email,
                salesRep: existingCustomer.salesRep
            },
            {
                name: customer.name,
                contactName: customer.contactName,
                email: customer.email,
                salesRep: customer.salesRep
            }
        )

        return NextResponse.json(customer)
    } catch (error: any) {
        console.error(error)
        return NextResponse.json(
            { error: error.message || 'Failed to update customer' },
            { status: error.message === 'Unauthorized' ? 401 : 500 }
        )
    }
}

// DELETE - Delete customer
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    try {
        const user = await requireAuth()

        const customer = await prisma.customer.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        invoices: true,
                        deliveryOrders: true
                    }
                }
            }
        })

        if (!customer) {
            return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
        }

        // Check if customer has associated records
        if (customer._count.invoices > 0 || customer._count.deliveryOrders > 0) {
            return NextResponse.json(
                { error: `Cannot delete customer with existing invoices or delivery orders` },
                { status: 400 }
            )
        }

        await prisma.customer.delete({
            where: { id }
        })

        // Log customer deletion
        await logDelete('CUSTOMER', customer.id, user.id, user.name, {
            name: customer.name,
            contactName: customer.contactName,
            email: customer.email,
            salesRep: customer.salesRep
        })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error(error)
        return NextResponse.json(
            { error: error.message || 'Failed to delete customer' },
            { status: error.message === 'Unauthorized' ? 401 : 500 }
        )
    }
}
