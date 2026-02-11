import { Sidebar } from "@/components/Sidebar"
import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const user = await getCurrentUser()

    if (!user) {
        redirect('/login')
    }

    return (
        <div className="flex h-screen bg-gray-100">
            <div className="hidden md:flex md:w-64 md:flex-col">
                <Sidebar />
            </div>
            <div className="flex flex-1 flex-col overflow-hidden">
                <header className="flex h-16 items-center justify-between border-b bg-white px-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-900">Dashboard</h2>
                    <div className="flex items-center space-x-4">
                        {/* User profile or other header items could go here */}
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                            U
                        </div>
                    </div>
                </header>
                <main className="flex-1 overflow-auto p-6">
                    {children}
                </main>
            </div>
        </div>
    )
}
