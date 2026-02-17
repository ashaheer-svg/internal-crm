import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { activateServiceContract } from '@/lib/service-manager'
import { logCreate } from '@/lib/audit'

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
            salesRepId
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
            salesRepId
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
