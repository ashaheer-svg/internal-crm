
import { getActiveContracts, getAllRentals, getExpiringContracts } from "@/lib/service-manager"
import ServiceDashboardClient from "@/components/services/ServiceDashboardClient"
import { prisma } from "@/lib/db"

async function runExpiryCheck() {
    try {
        const now = new Date()
        await prisma.serviceContract.updateMany({
            where: { status: 'ACTIVE', isDeleted: false, endDate: { not: null, lt: now } },
            data: { status: 'EXPIRED' }
        })
    } catch (e) {
        console.error('[ServiceDashboard] Expiry check failed:', e)
    }
}

export default async function ServicesDashboard() {
    // Run expiry check + all data queries in parallel
    const [expiring, active, rentals] = await Promise.all([
        runExpiryCheck().then(() => getExpiringContracts({ daysThreshold: 60, page: 1, limit: 10 })),
        getActiveContracts({ page: 1, limit: 10 }),
        getAllRentals({ page: 1, limit: 10 })
    ])

    return <ServiceDashboardClient initialExpiring={expiring} initialActive={active} initialRentals={rentals} />
}
