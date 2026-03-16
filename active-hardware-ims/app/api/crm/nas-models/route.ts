import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePermission, requireAuth } from '@/lib/auth'

export async function GET() {
    try {
        await requireAuth()
        const models = await prisma.nasModel.findMany({
            orderBy: { modelName: 'asc' }
        })
        return NextResponse.json(models)
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        await requirePermission('settings:manage')
        const data = await req.json()
        const { id, ...rest } = data

        if (id) {
            const model = await prisma.nasModel.update({
                where: { id },
                data: {
                    modelName: rest.modelName,
                    bays: rest.bays,
                    expansionUnitModel: rest.expansionUnitModel,
                    expansionBaysPerUnit: rest.expansionBaysPerUnit,
                    maxExpansionUnitsSupported: rest.maxExpansionUnitsSupported,
                    defaultRamGB: rest.defaultRamGB,
                    maxRamGB: rest.maxRamGB,
                    supportsSATA: rest.supportsSATA,
                    supportsSAS: rest.supportsSAS,
                    formFactor: rest.formFactor,
                    powerType: rest.powerType,
                    networkPorts: rest.networkPorts,
                    series: rest.series,
                    targetMarket: rest.targetMarket,
                    productId: rest.productId,
                }
            })
            return NextResponse.json(model)
        } else {
            // Check if modelName already exists
            const existing = await prisma.nasModel.findUnique({
                where: { modelName: rest.modelName }
            })
            if (existing) {
                return NextResponse.json({ error: 'Model name already exists' }, { status: 400 })
            }

            const model = await prisma.nasModel.create({
                data: rest
            })
            return NextResponse.json(model)
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function DELETE(req: Request) {
    try {
        await requirePermission('settings:manage')
        const { searchParams } = new URL(req.url)
        const id = searchParams.get('id')
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

        await prisma.nasModel.delete({ where: { id } })
        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
