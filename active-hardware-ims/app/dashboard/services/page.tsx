
import { getActiveContracts, getAllRentals, getExpiringContracts } from "@/lib/service-manager"
import ServiceDashboardClient from "@/components/services/ServiceDashboardClient"

export default async function ServicesDashboard() {
    const expiring = await getExpiringContracts(60)
    const active = await getActiveContracts()
    const rentals = await getAllRentals()

    return <ServiceDashboardClient expiring={expiring} active={active} rentals={rentals} />
}
