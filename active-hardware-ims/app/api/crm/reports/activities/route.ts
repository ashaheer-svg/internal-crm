import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePermission } from '@/lib/auth'
import { startOfWeek, endOfWeek, addWeeks, format, startOfDay, endOfDay } from 'date-fns'

export async function GET(request: Request) {
    try {
        const user = await requirePermission('reports:read')
        const { searchParams } = new URL(request.url)

        const weekOffset = parseInt(searchParams.get('weekOffset') || '0')
        const scope = searchParams.get('scope') || 'all'
        const viewType = searchParams.get('viewType') || 'weekly'
        const customerId = searchParams.get('customerId')

        const today = new Date()
        let targetWeekStart: Date
        let targetWeekEnd: Date

        if (viewType === 'monthly') {
            const targetMonth = new Date(today.getFullYear(), today.getMonth() + weekOffset, 1)
            targetWeekStart = startOfDay(targetMonth)
            targetWeekEnd = endOfDay(new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0))
        } else {
            targetWeekStart = startOfWeek(addWeeks(today, weekOffset), { weekStartsOn: 1 }) // Monday
            targetWeekEnd = endOfWeek(targetWeekStart, { weekStartsOn: 1 })
        }

        // Check permissions for view scope
        const u = user as any
        const canViewAll = u.permissions?.includes('all:manage') ||
            u.permissions?.includes('projects:manage') ||
            u.permissions?.includes('projects:view_all')

        // 1. Fetch Users/SalesReps to include in report
        let userFilter: any = { isActive: true }

        if (!canViewAll || scope === 'mine') {
            userFilter.id = user.id
        } else {
            const filterRepId = searchParams.get('salesRepId')
            if (filterRepId && filterRepId !== 'ALL') {
                // If filterRepId is provided, we need to find the user associated with that salesRep
                const rep = await prisma.salesRep.findUnique({
                    where: { id: filterRepId },
                    include: { users: true }
                })
                if (rep?.users?.[0]) {
                    userFilter.id = rep.users[0].id
                } else if (!rep?.users?.length) {
                    // Fallback to searching by email if relation is not set
                    const associatedUser = await prisma.user.findFirst({
                        where: { email: rep?.email || '___' }
                    })
                    if (associatedUser) userFilter.id = associatedUser.id
                    else return NextResponse.json({ days: [], data: [] }) // No user found
                }
            }
        }

        // Activity Filter
        const activityFilter: any = {
            createdAt: {
                gte: targetWeekStart,
                lte: targetWeekEnd
            },
            createdById: { in: (await prisma.user.findMany({ where: userFilter, select: { id: true } })).map(u => u.id) }
        }

        if (customerId && customerId !== 'ALL') {
            activityFilter.project = {
                customerId: customerId
            }
        }

        const users = await prisma.user.findMany({
            where: userFilter,
            select: { id: true, name: true },
            orderBy: { name: 'asc' }
        })

        // 2. Fetch Activities in range
        const activities = await prisma.cRMActivity.findMany({
            where: activityFilter,
            include: {
                createdBy: { select: { name: true } },
                project: {
                    include: {
                        customer: { select: { name: true } },
                    }
                }
            }
        })

        // 3. Process Data for Matrix
        const days: string[] = []
        const diffInDays = Math.round((targetWeekEnd.getTime() - targetWeekStart.getTime()) / (1000 * 60 * 60 * 24))
        const iterations = viewType === 'monthly' ? diffInDays + 1 : 7

        for (let i = 0; i < iterations; i++) {
            const d = new Date(targetWeekStart)
            d.setDate(d.getDate() + i)
            days.push(format(d, 'yyyy-MM-dd'))
        }

        const matrix = users.map(u => {
            const userData: Record<string, any> = {}
            days.forEach(day => {
                const dayStart = startOfDay(new Date(day))
                const dayEnd = endOfDay(new Date(day))

                const dayActivities = activities.filter(a =>
                    a.createdById === u.id &&
                    a.createdAt >= dayStart &&
                    a.createdAt <= dayEnd
                )

                userData[day] = {
                    CALL: dayActivities.filter(a => a.type === 'CALL').length,
                    MEETING: dayActivities.filter(a => a.type === 'MEETING').length,
                    EMAIL: dayActivities.filter(a => a.type === 'EMAIL').length,
                    NOTE: dayActivities.filter(a => a.type === 'NOTE').length,
                    total: dayActivities.length,
                    items: dayActivities.map((a: any) => ({
                        id: a.id,
                        type: a.type,
                        subject: a.subject,
                        content: a.content,
                        createdAt: a.createdAt,
                        projectName: a.project?.title || 'Unknown Project',
                        customerName: a.project?.customer?.name || 'Unknown Company',
                        projectValue: a.project?.expectedValue || 0,
                        projectStatus: a.project?.status || 'UNKNOWN'
                    }))
                }
            })

            return {
                userId: u.id,
                userName: u.name,
                days: userData
            }
        })

        return NextResponse.json({
            weekStart: targetWeekStart,
            weekEnd: targetWeekEnd,
            days,
            data: matrix
        })

    } catch (error: any) {
        console.error('Activities Report Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
