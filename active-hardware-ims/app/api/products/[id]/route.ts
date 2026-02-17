import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { logUpdate, logDelete } from '@/lib/audit'

interface RouteParams {
    params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteParams) {
    try {
        await requireAuth()
        const { id } = await params

        // Increment access count (fire and forget to not block response)
        prisma.product.update({
            where: { id },
            data: { accessCount: { increment: 1 } }
        }).catch(err => console.error('Failed to update access count:', err))

        const product = await prisma.product.findUnique({
            where: { id },
            include: { serviceDefinition: true }
        })

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }

        return NextResponse.json(product)
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to fetch product' },
            { status: error.message === 'Unauthorized' ? 401 : 500 }
        )
    }
}

export async function PATCH(request: Request, { params }: RouteParams) {
    try {
        const user = await requireAuth()
        const { id } = await params
        const body = await request.json()
        const { sku, name, brand, category, model, description, minStock, warrantyMonths, lowResellerPrice, resellerPrice, isActive } = body

        // Get existing for audit
        const existing = await prisma.product.findUnique({
            where: { id },
            include: { serviceDefinition: true }
        })
        if (!existing) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }

        const product = await prisma.product.update({
            where: { id },
            data: {
                sku,
                name,
                brand,
                category,
                model,
                description,
                resellerPrice: Number(resellerPrice) || 0,
                isActive: isActive !== undefined ? isActive : undefined,
                // Handle Service Definition
                serviceDefinition: body.isService ? {
                    upsert: {
                        create: {
                            type: body.serviceType || 'ONE_TIME',
                            durationValue: Number(body.durationValue) || 1,
                            durationUnit: body.durationUnit || 'YEAR',
                            isMetered: body.isMetered || false,
                            billingCycle: body.billingCycle
                        },
                        update: {
                            type: body.serviceType || 'ONE_TIME',
                            durationValue: Number(body.durationValue) || 1,
                            durationUnit: body.durationUnit || 'YEAR',
                            isMetered: body.isMetered || false,
                            billingCycle: body.billingCycle
                        }
                    }
                } : (existing.serviceDefinition ? { delete: true } : undefined)
            }
        })

        // Log update
        await logUpdate('PRODUCT', id, user.id, user.name,
            { name: existing.name, brand: existing.brand, isActive: existing.isActive },
            { name: product.name, brand: product.brand, isActive: product.isActive }
        )

        return NextResponse.json(product)
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to update product' },
            { status: error.message === 'Unauthorized' ? 401 : 500 }
        )
    }
}

export async function DELETE(request: Request, { params }: RouteParams) {
    try {
        const user = await requireAuth()
        const { id } = await params
        const { searchParams } = new URL(request.url)
        const type = searchParams.get('type') || 'soft' // soft, hard, restore

        const product = await prisma.product.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { inventory: true }
                }
            }
        })

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        }

        if (type === 'hard') {
            // Check for inventory
            if (product._count.inventory > 0) {
                return NextResponse.json({
                    error: 'Cannot delete product that has inventory items. Please remove inventory first.'
                }, { status: 400 })
            }

            await prisma.product.delete({
                where: { id }
            })

            await logDelete('PRODUCT', id, user.id, user.name, {
                sku: product.sku,
                name: product.name,
                type: 'HARD_DELETE'
            })
        } else if (type === 'restore') {
            await prisma.product.update({
                where: { id },
                data: { isActive: true }
            })

            await logUpdate('PRODUCT', id, user.id, user.name,
                { isActive: false },
                { isActive: true }
            )
        } else {
            // Soft delete (Deactivate)
            await prisma.product.update({
                where: { id },
                data: { isActive: false }
            })

            await logUpdate('PRODUCT', id, user.id, user.name,
                { isActive: true },
                { isActive: false }
            )
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to delete product' },
            { status: error.message === 'Unauthorized' ? 401 : 500 }
        )
    }
}
