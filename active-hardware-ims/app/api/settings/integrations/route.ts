import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET() {
    try {
        await requireAuth()

        // Fetch all generic integrations settings or specific ones
        // Ignoring TS error temporarily because prisma client was regenerated and TS context lag
        // @ts-ignore
        const settings = await prisma.systemSetting.findMany()

        // Convert array of {key, value} objects to a single key/value dictionary
        const settingsMap = settings.reduce((acc: any, curr: { key: string, value: string }) => {
            acc[curr.key] = curr.value
            return acc
        }, {})

        return NextResponse.json(settingsMap)

    } catch (error: any) {
        console.error('Failed to fetch integration settings:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to fetch settings' },
            { status: 500 }
        )
    }
}

export async function PUT(request: Request) {
    try {
        await requireAuth() // Assuming requireAuth checks session token internally
        const body = await request.json()

        const transactionUpdates = []

        // Iterate through incoming dictionary and upsert to database
        for (const [key, value] of Object.entries(body)) {
            // Need to stringify boolean/number values for the generic string field
            const stringValue = typeof value === 'string' ? value : JSON.stringify(value)

            // @ts-ignore
            transactionUpdates.push(
                // @ts-ignore
                prisma.systemSetting.upsert({
                    where: { key },
                    update: { value: stringValue },
                    create: { key, value: stringValue }
                })
            )
        }

        await prisma.$transaction(transactionUpdates)

        return NextResponse.json({ success: true, message: 'Settings updated successfully' })

    } catch (error: any) {
        console.error('Failed to update integration settings:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to update settings' },
            { status: 500 }
        )
    }
}
