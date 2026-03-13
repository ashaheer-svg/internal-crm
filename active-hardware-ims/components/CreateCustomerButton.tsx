'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import CustomerFormModal from '@/app/dashboard/settings/customers/CustomerFormModal'

interface Props {
    variant?: 'primary' | 'secondary'
    type?: 'CUSTOMER' | 'SUPPLIER' | 'PARTNER'
    label?: string
}

export default function CreateCustomerButton({ variant = 'secondary', type = 'CUSTOMER', label }: Props) {
    const [showModal, setShowModal] = useState(false)
    const router = useRouter()

    const buttonClasses = variant === 'primary'
        ? "inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm"
        : "inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"

    const displayLabel = label || (type === 'PARTNER' ? 'Add Partner' : (type === 'SUPPLIER' ? 'Add Supplier' : 'Add Customer'))

    return (
        <>
            <button onClick={() => setShowModal(true)} className={buttonClasses}>
                <Plus className="w-4 h-4" />
                {displayLabel}
            </button>

            {showModal && (
                <CustomerFormModal
                    onClose={() => setShowModal(false)}
                    defaultRole={type}
                    onSave={() => {
                        setShowModal(false)
                        router.refresh()
                    }}
                />
            )}
        </>
    )
}
