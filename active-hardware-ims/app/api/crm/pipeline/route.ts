import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET() {
    try {
        await requireAuth()

        // Fetch default pipeline with stages and projects
        const pipeline = await prisma.cRMPipeline.findFirst({
            where: { isDefault: true },
            include: {
                stages: {
                    orderBy: { order: 'asc' },
                    include: {
                        projects: {
                            where: { isDeleted: false },
                            include: {
                                customer: true,
                                members: {
                                    include: { user: true }
                                }
                            }
                        }
                    }
                }
            }
        })

        if (!pipeline) {
            // Auto-seed default pipeline if none exists
            console.log('No default pipeline found. Seeding...')
            const newPipeline = await prisma.cRMPipeline.create({
                data: {
                    name: 'Standard Sales Pipeline',
                    isDefault: true,
                    stages: {
                        create: [
                            { name: 'Lead', order: 1, color: '#64748b' },         // Slate-500
                            { name: 'Qualified', order: 2, color: '#3b82f6' },    // Blue-500
                            { name: 'Proposal', order: 3, color: '#8b5cf6' },     // Violet-500
                            { name: 'Negotiation', order: 4, color: '#f59e0b' },  // Amber-500
                            { name: 'Won', order: 5, color: '#22c55e' },          // Green-500
                            { name: 'Lost', order: 6, color: '#ef4444' }          // Red-500
                        ]
                    }
                },
                include: {
                    stages: {
                        orderBy: { order: 'asc' },
                        include: {
                            projects: {
                                where: { isDeleted: false },
                                include: {
                                    customer: true,
                                    members: {
                                        include: { user: true }
                                    }
                                }
                            }
                        }
                    }
                }
            })
            return NextResponse.json(newPipeline)
        }

        return NextResponse.json(pipeline)
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to fetch pipeline' },
            { status: 500 }
        )
    }
}
