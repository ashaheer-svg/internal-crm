"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ScanBarcode } from "lucide-react"

export default function LoginPage() {
    const router = useRouter()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError("")
        setLoading(true)

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || "Login failed")
            }

            // Check if user must change password
            if (data.mustChangePassword) {
                router.push("/change-password")
            } else {
                router.push("/dashboard")
            }
        } catch (err: any) {
            setError(err.message || "Login failed")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
            <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg">
                {/* Logo and Title */}
                <div className="text-center">
                    <div className="flex justify-center">
                        <div className="bg-blue-600 p-3 rounded-full">
                            <ScanBarcode className="h-8 w-8 text-white" />
                        </div>
                    </div>
                    <h2 className="mt-4 text-3xl font-bold text-gray-900">ActiveIMS</h2>
                    <p className="mt-2 text-sm text-gray-600">Sign in to your account</p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                Email Address
                            </label>
                            <input
                                id="email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                placeholder="admin@activehardware.com"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "Signing in..." : "Sign in"}
                    </button>
                </form>

                {/* Default Credentials Info */}
                <div className="mt-4 p-4 bg-gray-50 rounded-md border border-gray-200">
                    <p className="text-xs text-gray-600 text-center">
                        <strong>Default Admin:</strong><br />
                        Email: admin@activehardware.com<br />
                        Password: Admin@123
                    </p>
                </div>
            </div>
        </div>
    )
}
