import React from 'react'

export default function DocumentFooter() {
    return (
        <div className="hidden print:block fixed bottom-0 left-0 right-0 border-t border-gray-200 pt-4 pb-2 text-center">
            <div className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">
                ACTIVE SOLUTIONS <span className="mx-2 text-gray-300">|</span> 32/2-2/1 Nandimithra Place, Colombo 6, Sri Lanka.
            </div>
            <div className="text-[8px] text-gray-400 mt-1 uppercase tracking-tighter">
                System Generated Document — Page <span className="after:content-[counter(page)]"></span>
            </div>
        </div>
    )
}
