"use client"

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export default function MaintenanceGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const pathname = usePathname()
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const checkMaintenance = async () => {
            // Skip checking if already on maintenance page
            if (pathname === '/maintenance') {
                setLoading(false)
                return
            }

            try {
                // We need to know the current user and maintenance status
                const [userRes, maintRes] = await Promise.all([
                    fetch('/api/auth/me'),
                    fetch('/api/settings/maintenance')
                ])

                if (!userRes.ok || !maintRes.ok) {
                    setLoading(false)
                    return
                }

                const userData = await userRes.json()
                const maintData = await maintRes.json()

                const user = userData.user
                const isUnderMaintenance = maintData.enabled

                if (isUnderMaintenance) {
                    // Check if user is Admin or has Admin role
                    const isAdmin = user?.role === 'ADMIN' || user?.isAdmin

                    if (!isAdmin) {
                        router.push('/maintenance')
                        return
                    }
                }
            } catch (error) {
                console.error('Maintenance check failed:', error)
            } finally {
                setLoading(false)
            }
        }

        checkMaintenance()
    }, [pathname, router])

    if (loading) {
        return null // Or a subtle loading spinner
    }

    return <>{children}</>
}
