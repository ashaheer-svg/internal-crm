'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

import Link from 'next/link'

interface BackButtonProps {
    label?: string
    className?: string
    href?: string
}

export default function BackButton({ label = 'Back', className = '', href }: BackButtonProps) {
    const router = useRouter()

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

    return (
        <button
            onClick={() => router.back()}
            className={`flex items-center text-sm text-gray-500 hover:text-gray-900 transition-colors ${className}`}
        >
            <ChevronLeft className="w-4 h-4 mr-1" />
            {label}
        </button>
    )
}
