import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function POST(request: Request) {
    try {
        await requireAuth()
        const { names } = await request.json()

        if (!names || !Array.isArray(names)) {
            return NextResponse.json({ error: 'Names array is required' }, { status: 400 })
        }

        // Remove duplicates and empty strings
        const uniqueNames = [...new Set(names.filter(name => typeof name === 'string' && name.trim() !== ''))]

        // Find existing customers for these names
        const existingCustomers = await prisma.customer.findMany({
            where: {
                name: { in: uniqueNames }
            },
            select: {
                name: true
            }
        })

        const foundNames = new Set(existingCustomers.map(c => c.name))
        const results = uniqueNames.reduce((acc, name) => {
            acc[name] = foundNames.has(name)
            return acc
        }, {} as Record<string, boolean>)

        return NextResponse.json({
            results,
            validCount: foundNames.size,
            invalidCount: uniqueNames.length - foundNames.size,
            missingNames: uniqueNames.filter(name => !foundNames.has(name))
        })
    } catch (error: any) {
        console.error('Error in POST /api/customers/validate-names:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to validate names' },
            { status: 500 }
        )
    }
}
