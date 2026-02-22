import { Hammer, Cog } from 'lucide-react'

export default function MaintenancePage() {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full text-center space-y-8">
                {/* Visual Indicator */}
                <div className="relative">
                    <div className="absolute inset-0 flex items-center justify-center animate-pulse opacity-20">
                        <div className="h-32 w-32 bg-blue-500 rounded-full blur-3xl"></div>
                    </div>
                    <div className="relative flex justify-center">
                        <div className="p-4 bg-white rounded-2xl shadow-xl border border-blue-100/50">
                            <Hammer className="h-12 w-12 text-blue-600 animate-bounce" />
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="space-y-4">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                        System Under Development
                    </h1>
                    <p className="text-slate-600 text-lg leading-relaxed">
                        We're currently performing scheduled maintenance to improve your experience.
                        Please check back shortly.
                    </p>
                </div>

                {/* Progress Bar Mockup */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                    <div className="flex justify-between text-sm font-medium">
                        <span className="text-slate-500 flex items-center gap-1.5">
                            <Cog className="h-4 w-4 animate-spin" />
                            Optimization in progress
                        </span>
                        <span className="text-blue-600">85%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-blue-600 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(37,99,235,0.4)]"
                            style={{ width: '85%' }}
                        />
                    </div>
                </div>

                {/* Footer */}
                <p className="text-slate-400 text-sm">
                    Thank you for your patience.
                </p>
            </div>
        </div>
    )
}
