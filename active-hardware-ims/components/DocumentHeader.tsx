import Image from 'next/image'

interface DocumentHeaderProps {
    title: string
    subtitle?: string
}

export default function DocumentHeader({ title, subtitle }: DocumentHeaderProps) {
    return (
        <div className="header flex justify-between items-center border-b-[3px] border-blue-600 pb-8 mb-10">
            <div className="flex items-center gap-8">
                <div className="relative w-48 h-32 flex-shrink-0">
                    <Image
                        src="/logo.png"
                        alt="Active Solutions Logo"
                        fill
                        className="object-contain object-left"
                        priority
                    />
                </div>
                <div className="flex flex-col">
                    <h1 className="text-4xl font-black tracking-[0.05em] text-gray-900 leading-tight">
                        ACTIVE SOLUTIONS
                    </h1>
                    <div className="mt-1 text-[13px] text-gray-500 font-semibold tracking-wide uppercase">
                        <p>32/2-2/1 Nandimithra Place, Colombo 6, Sri Lanka.</p>
                        {subtitle && (
                            <div className="flex items-center mt-2">
                                <span className="h-[2px] w-8 bg-blue-600 mr-3"></span>
                                <span className="text-blue-600 font-black tracking-[0.2em] text-[11px]">{subtitle}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <div className="text-right flex flex-col items-end">
                <div className="px-5 py-2 bg-blue-600 text-white font-black text-3xl tracking-tighter uppercase mb-1">
                    {title}
                </div>
                <div className="text-[10px] text-gray-400 font-bold tracking-widest mt-1">
                    OFFICIAL DOCUMENT
                    <span className="mx-2 text-gray-300">|</span>
                    {new Date().toLocaleDateString()}
                </div>
            </div>
        </div>
    )
}
