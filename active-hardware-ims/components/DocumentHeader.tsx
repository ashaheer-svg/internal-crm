import Image from 'next/image'

interface DocumentHeaderProps {
    title: string
    subtitle?: string
}

export default function DocumentHeader({ title, subtitle }: DocumentHeaderProps) {
    return (
        <div className="header flex justify-between items-center border-b-[3px] border-blue-600 pb-6 mb-10">
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
                {subtitle && (
                    <div className="ml-8 border-l-2 border-gray-200 pl-8 flex flex-col justify-center">
                        <span className="text-blue-600 font-black tracking-[0.2em] text-[12px] uppercase">
                            {subtitle}
                        </span>
                    </div>
                )}
            </div>
            <div className="text-right flex flex-col items-end">
                <div className="px-6 py-2 bg-blue-600 text-white font-black text-4xl tracking-tighter uppercase mb-2">
                    {title}
                </div>
                <div className="text-[10px] text-gray-400 font-bold tracking-widest">
                    OFFICIAL DOCUMENT <span className="mx-2 text-gray-300">|</span> {new Date().toLocaleDateString()}
                </div>
            </div>
        </div>
    )
}
