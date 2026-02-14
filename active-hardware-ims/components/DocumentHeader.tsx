import { formatDate } from '@/lib/utils'

interface DocumentHeaderProps {
    title: string
    subtitle?: string
    titleNextToLogo?: boolean
}

export default function DocumentHeader({ title, subtitle, titleNextToLogo }: DocumentHeaderProps) {
    return (
        <div className="header flex justify-between items-center border-b-[3px] border-blue-600 pb-6 mb-10 h-32">
            <div className="flex items-center">
                <div className="relative w-64 h-32 flex-shrink-0">
                    <Image
                        src="/logo.png"
                        alt="Active Solutions Logo"
                        fill
                        className="object-contain object-left"
                        priority
                    />
                </div>
                {titleNextToLogo && (
                    <div className="ml-8 border-l-2 border-gray-200 pl-8 flex items-center h-20">
                        <span className="text-4xl font-black tracking-tighter uppercase text-blue-600">
                            {title}
                        </span>
                    </div>
                )}
                {subtitle && !titleNextToLogo && (
                    <div className="ml-8 border-l-2 border-gray-200 pl-8 flex flex-col justify-center">
                        <span className="text-blue-600 font-black tracking-[0.2em] text-[12px] uppercase">
                            {subtitle}
                        </span>
                    </div>
                )}
            </div>
            <div className="flex items-center gap-6 text-right h-full">
                <div className="flex flex-col items-end leading-none">
                    <span className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">
                        OFFICIAL DOCUMENT
                    </span>
                    <span className="text-[12px] text-gray-500 font-black mt-1">
                        {formatDate(new Date())}
                    </span>
                </div>
                {!titleNextToLogo && (
                    <div className="px-8 py-3 bg-blue-600 text-white font-black text-4xl tracking-tighter uppercase shadow-sm">
                        {title}
                    </div>
                )}
            </div>
        </div>
    )
}
