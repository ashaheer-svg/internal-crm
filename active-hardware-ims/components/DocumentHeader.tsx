import Image from 'next/image'

interface DocumentHeaderProps {
    title: string
    subtitle?: string
}

export default function DocumentHeader({ title, subtitle }: DocumentHeaderProps) {
    return (
        <div className="header flex justify-between items-start border-b-2 border-black pb-6 mb-8">
            <div className="flex gap-6">
                <div className="relative w-32 h-32 flex-shrink-0">
                    <Image
                        src="/logo.png"
                        alt="Active Solutions Logo"
                        fill
                        className="object-contain"
                        priority
                    />
                </div>
                <div className="flex flex-col justify-center">
                    <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 leading-none">
                        ACTIVE SOLUTIONS
                    </h1>
                    <div className="mt-2 text-sm text-gray-600 font-medium">
                        <p>32/2-2/1 Nandimithra Place, Colombo 6.</p>
                        {subtitle && <p className="mt-1 text-xs uppercase tracking-widest text-gray-500 font-bold">{subtitle}</p>}
                    </div>
                </div>
            </div>
            <div className="text-right flex flex-col justify-end h-32">
                <h2 className="text-4xl font-black text-gray-800 uppercase tracking-tighter">
                    {title}
                </h2>
            </div>
        </div>
    )
}
