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
        <div
            className="flex h-screen print:h-auto print:overflow-visible"
            style={{ backgroundColor: 'var(--chrome-bg)' }}
        >
            <div className="hidden md:flex md:flex-col print:hidden">
                <Sidebar />
            </div>
            <div className="flex flex-1 flex-col overflow-hidden print:overflow-visible print:h-auto print:block">
                <header
                    className="flex h-16 items-center justify-between px-6 shadow-sm print:hidden"
                    style={{
                        backgroundColor: 'var(--chrome-header-bg)',
                        borderBottom: '1px solid var(--chrome-header-border)',
                    }}
                >
                    <h2
                        className="text-lg font-semibold"
                        style={{ color: 'var(--chrome-header-text)' }}
                    >
                        Dashboard
                    </h2>
                    <div className="flex items-center space-x-4">
                        <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold">
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
