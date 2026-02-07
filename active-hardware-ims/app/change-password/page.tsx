"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Lock } from "lucide-react"

export default function ChangePasswordPage() {
    const router = useRouter()
    const [currentPassword, setCurrentPassword] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError("")

        // Validate passwords match
        if (newPassword !== confirmPassword) {
            setError("New passwords do not match")
            return
        }

        // Validate password strength
        if (newPassword.length < 8) {
            setError("Password must be at least 8 characters long")
            return
        }

        setLoading(true)

        try {
            const res = await fetch("/api/auth/change-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ currentPassword, newPassword })
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || "Failed to change password")
            }

            // Redirect to dashboard
            router.push("/dashboard")
        } catch (err: any) {
            setError(err.message || "Failed to change password")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
            <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg">
                {/* Header */}
                <div className="text-center">
                    <div className="flex justify-center">
                        <div className="bg-blue-600 p-3 rounded-full">
                            <Lock className="h-8 w-8 text-white" />
                        </div>
                    </div>
                    <h2 className="mt-4 text-2xl font-bold text-gray-900">Change Password</h2>
                    <p className="mt-2 text-sm text-gray-600">
                        You must change your password before continuing
                    </p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                )}

                {/* Change Password Form */}
                <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="current" className="block text-sm font-medium text-gray-700">
                                Current Password
                            </label>
                            <input
                                id="current"
                                type="password"
                                required
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label htmlFor="new" className="block text-sm font-medium text-gray-700">
                                New Password
                            </label>
                            <input
                                id="new"
                                type="password"
                                required
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                placeholder="At least 8 characters"
                            />
                        </div>

                        <div>
                            <label htmlFor="confirm" className="block text-sm font-medium text-gray-700">
                                Confirm New Password
                            </label>
                            <input
                                id="confirm"
                                type="password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                        {loading ? "Changing Password..." : "Change Password"}
                    </button>
                </form>
            </div>
        </div>
    )
}
