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
            return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 })
        }

        return NextResponse.json(pipeline)
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to fetch pipeline' },
            { status: 500 }
        )
    }
}
