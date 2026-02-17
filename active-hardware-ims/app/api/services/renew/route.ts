
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { renewContract } from '@/lib/service-manager'
import { logUpdate } from '@/lib/audit'

export async function POST(request: Request) {
    try {
        const user = await requireAuth()
        const body = await request.json()
        const { contractId, durationValue, durationUnit } = body

        if (!contractId || !durationValue || !durationUnit) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const newContract = await renewContract(contractId, {
            forceDurationValue: durationValue,
            forceDurationUnit: durationUnit
        })

        await logUpdate('SERVICE_CONTRACT', contractId, user.id, user.name,
            { status: 'RENEWED' },
            { status: 'RENEWED', newContractId: newContract.id }
        )

        return NextResponse.json(newContract)
    } catch (error: any) {
        console.error('Renewal Error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to renew contract' },
            { status: error.message === 'Unauthorized' ? 401 : 500 }
        )
    }
}
