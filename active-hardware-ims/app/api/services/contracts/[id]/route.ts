
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { logUpdate } from '@/lib/audit'

interface RouteParams {
    params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteParams) {
    try {
        await requireAuth()
        const { id } = await params

        const contract = await prisma.serviceContract.findUnique({
            where: { id },
            include: {
                customer: true,
                product: true,
                partner: true,
                salesRep: true
            }
        })

        if (!contract) {
            return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
        }

        return NextResponse.json(contract)
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to fetch contract' },
            { status: 500 }
        )
    }
}

export async function PATCH(request: Request, { params }: RouteParams) {
    try {
        const user = await requireAuth()
        const { id } = await params
        const body = await request.json()

        const {
            contractNumber,
            partnerId,
            salesRepId,
            contractValue,
            invoiceReference,
            description,
            endDate
        } = body

        // Verify contract exists
        const existingContract = await prisma.serviceContract.findUnique({
            where: { id }
        })

        if (!existingContract) {
            return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
        }

        const updatedContract = await prisma.serviceContract.update({
            where: { id },
            data: {
                contractNumber,
                partnerId: partnerId || null,
                salesRepId: salesRepId || null,
                contractValue: contractValue !== undefined ? Number(contractValue) : undefined,
                invoiceReference,
                description,
                endDate: endDate ? new Date(endDate) : undefined
            }
        })

        await logUpdate('SERVICE_CONTRACT', id, user.id, user.name,
            {
                contractNumber: existingContract.contractNumber,
                contractValue: existingContract.contractValue
            },
            {
                contractNumber: updatedContract.contractNumber,
                contractValue: updatedContract.contractValue
            }
        )

        return NextResponse.json(updatedContract)

    } catch (error: any) {
        console.error("Contract update failed:", error)
        return NextResponse.json(
            { error: error.message || 'Failed to update contract' },
            { status: 500 }
        )
    }
}
