import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { activateServiceContract } from '@/lib/service-manager'
import { logCreate } from '@/lib/audit'

export async function GET(request: Request) {
    try {
        await requireAuth()
        const { searchParams } = new URL(request.url)
        const type = searchParams.get('type') // 'expiring' or 'active'
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '10')
        const search = searchParams.get('search')
        const sortKey = searchParams.get('sortKey') || 'createdAt'
        const sortDir = (searchParams.get('sortDir') as 'asc' | 'desc') || 'desc'
        const daysThreshold = parseInt(searchParams.get('daysThreshold') || '60')

        const skip = (page - 1) * limit
        const where: any = { isDeleted: false, status: 'ACTIVE' }

        if (type === 'expiring') {
            const thresholdDate = new Date()
            thresholdDate.setDate(thresholdDate.getDate() + daysThreshold)
            where.endDate = {
                lte: thresholdDate,
                gte: new Date()
            }
        }

        if (search) {
            where.OR = [
                { contractNumber: { contains: search } },
                { description: { contains: search } },
                { customer: { name: { contains: search } } },
                { partner: { name: { contains: search } } },
                { product: { name: { contains: search } } }
            ]
        }

        const orderBy: any = {}
        if (sortKey === 'customer') orderBy.customer = { name: sortDir }
        else if (sortKey === 'product') orderBy.product = { name: sortDir }
        else if (sortKey === 'expiry') orderBy.endDate = sortDir
        else orderBy[sortKey] = sortDir

        const [contracts, total] = await Promise.all([
            prisma.serviceContract.findMany({
                where,
                skip,
                take: limit,
                include: {
                    customer: true,
                    product: true,
                    partner: true
                },
                orderBy
            }),
            prisma.serviceContract.count({ where })
        ])

        return NextResponse.json({
            contracts,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        })
    } catch (error: any) {
        console.error('Error fetching service contracts:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to fetch service contracts' },
            { status: 500 }
        )
    }
}

export async function POST(request: Request) {
    try {
        const user = await requireAuth()
        const body = await request.json()
        const {
            customerId,
            productId,
            startDate,
            durationValue,
            durationUnit,
            description,
            // New Fields
            contractNumber,
            partnerId,
            contractValue,
            invoiceReference,
            salesRepId,
            productModel,
            coveredSerials,
            items
        } = body

        if (!customerId || !productId) {
            return NextResponse.json({ error: 'Customer and Product are required' }, { status: 400 })
        }

        // Validate Product is Service
        const product = await prisma.product.findUnique({
            where: { id: productId },
            include: { serviceDefinition: true }
        })

        if (!product || !product.serviceDefinition) {
            return NextResponse.json({ error: 'Selected product is not a valid service' }, { status: 400 })
        }

        const contract = await activateServiceContract({
            customerId,
            productId,
            startDate: startDate ? new Date(startDate) : new Date(),
            customDurationValue: durationValue ? Number(durationValue) : undefined,
            customDurationUnit: durationUnit,
            description,
            contractNumber,
            partnerId,
            contractValue: contractValue ? Number(contractValue) : 0,
            invoiceReference,
            salesRepId,
            productModel,
            coveredSerials,
            items
        })

        await logCreate('SERVICE_CONTRACT', contract.id, user.id, user.name, {
            customerId,
            productId,
            contractNumber
        })

        return NextResponse.json(contract)

    } catch (error: any) {
        console.error('Error creating service contract:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to create service contract' },
            { status: 500 }
        )
    }
}
