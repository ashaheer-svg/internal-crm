import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
    try {
        await requirePermission('settings:manage')

        const customers = await prisma.customer.findMany({
            include: {
                employees: true,
                deliveryAddresses: true,
                salesRep: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        })

        const exportData = {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            data: customers
        }

        return new NextResponse(JSON.stringify(exportData, null, 2), {
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="customers_export_${new Date().toISOString().split('T')[0]}.json"`
            }
        })
    } catch (error: any) {
        console.error('Customer export error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to export customers' },
            { status: error.message === 'Forbidden' ? 403 : 500 }
        )
    }
}
