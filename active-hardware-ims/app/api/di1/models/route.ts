import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Whitelist of allowed models for security/stability
const ALLOWED_MODELS = [
    'user', 'product', 'inventoryItem', 'customer', 'deliveryOrder', 'purchaseOrder',
    'invoice', 'location', 'category', 'sequence', 'auditLog', 'transactionLog',
    'deliveryAddress', 'deliveryOrderItem', 'purchaseOrderItem', 'invoiceItem',
    'backorderItem', 'goodsReceiptNote', 'gRNItem', 'reservation', 'warrantyClaim', 'session'
]

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const model = searchParams.get('model')
    const page = parseInt(searchParams.get('page') || '1')
    const take = parseInt(searchParams.get('take') || '10')
    const skip = (page - 1) * take

    if (!model) {
        // Return list of models
        return NextResponse.json({ models: ALLOWED_MODELS })
    }

    if (!ALLOWED_MODELS.includes(model)) {
        return NextResponse.json({ error: 'Invalid model' }, { status: 400 })
    }

    try {
        const delegate = (prisma as any)[model]
        if (!delegate) {
            return NextResponse.json({ error: `Prisma delegate execution failed for ${model}` }, { status: 500 })
        }

        const [data, count] = await Promise.all([
            delegate.findMany({
                take,
                skip,
                orderBy: { createdAt: 'desc' } // Most models have createdAt, might fail for some if not present.
                // We'll wrap in try/catch or remove orderBy if it fails, but simplified for now.
                // Better: Check if createdAt exists or default to no sort.
            }).catch(() => delegate.findMany({ take, skip })), // Fallback without sort
            delegate.count()
        ])

        return NextResponse.json({ data, count, page, totalPages: Math.ceil(count / take) })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function PUT(req: Request) {
    try {
        const body = await req.json()
        const { model, id, data } = body

        if (!ALLOWED_MODELS.includes(model)) {
            return NextResponse.json({ error: 'Invalid model' }, { status: 400 })
        }

        const delegate = (prisma as any)[model]
        const updated = await delegate.update({
            where: { id },
            data
        })

        return NextResponse.json({ success: true, data: updated })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function DELETE(req: Request) {
    const { searchParams } = new URL(req.url)
    const model = searchParams.get('model')
    const id = searchParams.get('id')

    if (!model || !ALLOWED_MODELS.includes(model) || !id) {
        return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
    }

    try {
        const delegate = (prisma as any)[model]
        await delegate.delete({
            where: { id }
        })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
