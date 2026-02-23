import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: Request) {
    console.log('GET /api/crm/pipeline started')
    try {
        console.log('Calling getSession...')
        const user = await getCurrentUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        console.log('Auth successful')

        const { searchParams } = new URL(request.url)
        const scope = searchParams.get('scope') || 'all'

        // New filters
        const hideWon = searchParams.get('hideWon') === 'true'
        const hideApproved = searchParams.get('hideApproved') === 'true'
        const hideShipped = searchParams.get('hideShipped') === 'true'

        // Check if user can see all projects
        const u = user as any
        const canViewAll = u.permissions?.includes('all:manage') ||
            u.permissions?.includes('projects:manage') ||
            u.permissions?.includes('projects:view_all')

        // Build the project filter based on scope
        const projectWhere: any = { isDeleted: false }
        if (!canViewAll || scope === 'mine') {
            projectWhere.members = { some: { userId: user.id } }
        }

        if (hideWon) {
            projectWhere.status = { ...projectWhere.status, not: 'WON' }
        }

        if (hideApproved) {
            projectWhere.NOT = [
                ...(projectWhere.NOT || []),
                {
                    quotes: {
                        some: {
                            status: { in: ['APPROVED', 'ACCEPTED'] }
                        }
                    }
                }
            ]
        }

        if (hideShipped) {
            projectWhere.NOT = [
                ...(projectWhere.NOT || []),
                {
                    quotes: {
                        some: {
                            deliveryOrder: {
                                status: 'COMPLETED'
                            }
                        }
                    }
                }
            ]
        }

        // Fetch default pipeline with stages and projects
        console.log('Fetching pipeline...')
        const pipeline = await (prisma as any).cRMPipeline.findFirst({
            where: { isDefault: true },
            include: {
                stages: {
                    orderBy: { order: 'asc' },
                    include: {
                        projects: {
                            where: projectWhere,
                            include: {
                                customer: true,
                                members: {
                                    include: { user: true }
                                },
                                quotes: {
                                    select: {
                                        id: true,
                                        status: true,
                                        deliveryOrder: {
                                            select: { status: true }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        })
        console.log('Pipeline fetch result:', pipeline ? 'Found' : 'Not Found')

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
                                where: projectWhere,
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
            console.log('Pipeline seeded')
            return NextResponse.json({ ...newPipeline, canViewAll })
        }

        return NextResponse.json({ ...pipeline, canViewAll })
    } catch (error: any) {
        console.error('CRM Pipeline API Error:', error)

        // Check for Prisma "Table does not exist" error (P2021)
        if (error.code === 'P2021') {
            return NextResponse.json(
                { error: 'Database table not found. Please run `npx prisma db push` on the server.' },
                { status: 503 } // Service Unavailable
            )
        }

        return NextResponse.json(
            { error: error.message || 'Failed to fetch pipeline', stack: error.stack },
            { status: 500 }
        )
    }
}
