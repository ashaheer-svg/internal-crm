'use client'

import { useRouter, usePathname } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface BackButtonProps {
    label?: string
    className?: string
    href?: string
}

export default function BackButton({ label = 'Back', className = '', href }: BackButtonProps) {
    const router = useRouter()
    const pathname = usePathname()
    const [canGoBack, setCanGoBack] = useState(false)

    useEffect(() => {
        // In the client, detect if there is a valid in-app referrer in history
        if (typeof window !== 'undefined') {
            const hasReferrer = document.referrer && document.referrer.includes(window.location.origin)
            setCanGoBack(!!hasReferrer)
        }
    }, [])

    if (href) {
        return (
            <Link
                href={href}
                className={`flex items-center text-sm text-gray-500 hover:text-gray-900 transition-colors ${className}`}
            >
                <ChevronLeft className="w-4 h-4 mr-1" />
                {label}
            </Link>
        )
    }

    // Compute dynamic fallback path based on current pathname
    const segments = pathname ? pathname.split('/').filter(Boolean) : []
    let computedFallback = '/dashboard'
    if (segments.length > 1) {
        computedFallback = '/' + segments.slice(0, -1).join('/')
    }

    const handleBack = (e: React.MouseEvent) => {
        e.preventDefault()
        if (canGoBack) {
            router.back()
        } else {
            router.push(computedFallback)
        }
    }

    return (
        <button
            type="button"
            onClick={handleBack}
            className={`flex items-center text-sm text-gray-500 hover:text-gray-900 transition-colors ${className}`}
        >
            <ChevronLeft className="w-4 h-4 mr-1" />
            {label}
        </button>
    )
}

