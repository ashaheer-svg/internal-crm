import { Sidebar } from "@/components/Sidebar"
import TopBar from "@/components/TopBar"
import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"
import MaintenanceGuard from "@/components/MaintenanceGuard"

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const user = await getCurrentUser()

    if (!user) {
        redirect('/api/auth/clear-session')
    }

    return (
        <div
            className="flex h-screen print:h-auto print:overflow-visible"
            style={{ backgroundColor: 'var(--chrome-bg)' }}
        >
            <div className="hidden md:flex md:flex-col print:hidden">
                <Sidebar />
            </div>
            <div className="flex flex-1 flex-col overflow-hidden print:overflow-visible print:h-auto print:block">
                <TopBar />
                <main className="flex-1 overflow-auto p-6 print:overflow-visible print:h-auto print:p-0">
                    <MaintenanceGuard>
                        {children}
                    </MaintenanceGuard>
                </main>
            </div>
        </div>
    )
}
