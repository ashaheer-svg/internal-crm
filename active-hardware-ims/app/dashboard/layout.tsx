import { Sidebar } from "@/components/Sidebar"
import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const user = await getCurrentUser()

    if (!user) {
        // Clear the session cookie so middleware doesn't loop us back here
        // Redirect to a route handler that clears the cookie
        // We cannot delete cookies in a Server Component
        redirect('/api/auth/clear-session')
    }

    return (
        <div className="flex h-screen bg-gray-100 print:h-auto print:overflow-visible">
            <div className="hidden md:flex md:w-64 md:flex-col print:hidden">
                <Sidebar />
            </div>
            <div className="flex flex-1 flex-col overflow-hidden print:overflow-visible print:h-auto print:block">
                <header className="flex h-16 items-center justify-between border-b bg-white px-6 shadow-sm print:hidden">
                    <h2 className="text-lg font-semibold text-gray-900">Dashboard</h2>
                    <div className="flex items-center space-x-4">
                        {/* User profile or other header items could go here */}
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                            U
                        </div>
                    </div>
                </header>
                <main className="flex-1 overflow-auto p-6 print:overflow-visible print:h-auto print:p-0">
                    {children}
                </main>
            </div>
        </div>
    )
}
