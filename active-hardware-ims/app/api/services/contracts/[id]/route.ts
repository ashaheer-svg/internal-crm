
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
                salesRep: true,
                rentalAssets: true // Include linked rental assets
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
            endDate,
            status,
            productModel,
            coveredSerials
        } = body

        // Verify contract exists
        const existingContract = await prisma.serviceContract.findUnique({
            where: { id }
        })

        if (!existingContract) {
            return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
        }

        let updatedContract;

        if (status === 'COMPLETED') {
            const { completeContract } = await import("@/lib/service-manager");
            // completeContract handles status update and asset return
            // We first update other fields if any, then complete it.
            // Or simpler: just call completeContract if that's the main intent. 
            // But the user might be updating other fields too. 

            // First update standard fields if any changes
            await prisma.serviceContract.update({
                where: { id },
                data: {
                    contractNumber,
                    partnerId: partnerId || null,
                    salesRepId: salesRepId || null,
                    contractValue: contractValue !== undefined ? Number(contractValue) : undefined,
                    invoiceReference,
                    description,
                    endDate: endDate ? new Date(endDate) : undefined,
                    productModel,
                    coveredSerials
                    // Don't set status here yet
                }
            });

            // Then complete it (which sets status and returns assets)
            await completeContract(id);

            // Fetch updated for return
            updatedContract = await prisma.serviceContract.findUnique({ where: { id } });

        } else {
            updatedContract = await prisma.serviceContract.update({
                where: { id },
                data: {
                    contractNumber,
                    partnerId: partnerId || null,
                    salesRepId: salesRepId || null,
                    contractValue: contractValue !== undefined ? Number(contractValue) : undefined,
                    invoiceReference,
                    description,
                    endDate: endDate ? new Date(endDate) : undefined,
                    status: status || undefined,
                    productModel,
                    coveredSerials
                }
            })
        }

        if (updatedContract) {
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
        }

        return NextResponse.json(updatedContract)

    } catch (error: any) {
        console.error("Contract update failed:", error)
        return NextResponse.json(
            { error: error.message || 'Failed to update contract' },
            { status: 500 }
        )
    }
}

export async function DELETE(request: Request, { params }: RouteParams) {
    try {
        await requireAuth()
        const { id } = await params

        // Use soft delete helper which handles asset unlinking
        const { softDeleteContract } = await import("@/lib/service-manager")
        await softDeleteContract(id)

        return NextResponse.json({ success: true })

    } catch (error: any) {
        console.error("Contract deletion failed:", error)
        return NextResponse.json(
            { error: error.message || 'Failed to delete contract' },
            { status: 500 }
        )
    }
}
