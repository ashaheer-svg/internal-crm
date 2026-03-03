import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
    try {
        const user = await getCurrentUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        let pipelines = await prisma.cRMPipeline.findMany({
            orderBy: { name: 'asc' }
        })

        if (pipelines.length === 0) {
            console.log('No pipelines found. Seeding default...')
            const newPipeline = await prisma.cRMPipeline.create({
                data: {
                    name: 'Standard Sales Pipeline',
                    isDefault: true,
                    stages: {
                        create: [
                            { name: 'Lead', order: 1, color: '#64748b' },
                            { name: 'Qualified', order: 2, color: '#3b82f6' },
                            { name: 'Proposal', order: 3, color: '#8b5cf6' },
                            { name: 'Negotiation', order: 4, color: '#f59e0b' },
                            { name: 'Won', order: 5, color: '#22c55e' },
                            { name: 'Lost', order: 6, color: '#ef4444' }
                        ]
                    }
                }
            })
            pipelines = [newPipeline]
        }

        return NextResponse.json(pipelines)
    } catch (error: any) {
        console.error('CRM Pipelines API Error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to fetch pipelines' },
            { status: 500 }
        )
    }
}
