import Image from 'next/image'
import { formatDate } from '@/lib/utils'

interface DocumentHeaderProps {
    title: string
    subtitle?: string
    titleNextToLogo?: boolean
    hideMeta?: boolean
    titleSize?: string
}

export default function DocumentHeader({ title, subtitle, titleNextToLogo, hideMeta, titleSize }: DocumentHeaderProps) {
    return (
        <div className="header pb-4 mb-8" style={{ borderBottom: '1px solid #e5e7eb' }}>
            {/* Main row */}
            <div className="flex justify-between items-center">
                {/* Left: Logo + optional subtitle */}
                <div className="flex items-center gap-6">
                    <div className="relative flex-shrink-0" style={{ width: '180px', height: '72px' }}>
                        <Image
                            src="/logo.png"
                            alt="Active Solutions Logo"
                            fill
                            className="object-contain object-left"
                            priority
                        />
                    </div>
                    {(subtitle || titleNextToLogo) && (
                        <div
                            style={{
                                borderLeft: '1px solid #e5e7eb',
                                paddingLeft: '1.5rem',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                gap: '2px',
                            }}
                        >
                            {titleNextToLogo ? (
                                <span
                                    style={{
                                        fontSize: '22px',
                                        fontWeight: 900,
                                        letterSpacing: '-0.05em',
                                        textTransform: 'uppercase',
                                        color: '#111827',
                                    }}
                                >
                                    {title}
                                </span>
                            ) : subtitle ? (
                                <span
                                    style={{
                                        fontSize: '10px',
                                        fontWeight: 700,
                                        letterSpacing: '0.2em',
                                        textTransform: 'uppercase',
                                        color: '#6b7280',
                                    }}
                                >
                                    {subtitle}
                                </span>
                            ) : null}
                        </div>
                    )}
                </div>

                {/* Right: meta + document title */}
                <div className="flex flex-col items-end gap-1">
                    {!hideMeta && (
                        <div className="flex flex-col items-end" style={{ lineHeight: 1 }}>
                            <span
                                style={{
                                    fontSize: '8px',
                                    fontWeight: 700,
                                    letterSpacing: '0.18em',
                                    textTransform: 'uppercase',
                                    color: '#9ca3af',
                                }}
                            >
                                OFFICIAL DOCUMENT
                            </span>
                            <span
                                style={{
                                    fontSize: '10px',
                                    fontWeight: 600,
                                    color: '#6b7280',
                                    marginTop: '3px',
                                }}
                            >
                                {formatDate(new Date())}
                            </span>
                        </div>
                    )}
                    {!titleNextToLogo && (
                        <div
                            style={{
                                fontSize: '28px',
                                fontWeight: 900,
                                letterSpacing: '-0.04em',
                                textTransform: 'uppercase',
                                color: '#111827',
                                lineHeight: 1,
                                paddingBottom: '4px',
                                borderBottom: '2px solid #2563eb',
                            }}
                        >
                            {title}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
