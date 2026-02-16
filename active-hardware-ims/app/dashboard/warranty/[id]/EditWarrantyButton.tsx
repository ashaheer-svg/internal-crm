"use client"

import { useState } from "react"
import { Pencil } from "lucide-react"
import EditWarrantyModal from "./EditWarrantyModal"

type EditWarrantyButtonProps = {
    claim: {
        id: string
        customerName: string
        description: string
        status: string
    }
}

export default function EditWarrantyButton({ claim }: EditWarrantyButtonProps) {
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [currentClaim, setCurrentClaim] = useState(claim)

    const handleSave = (updatedClaim: any) => {
        setCurrentClaim(updatedClaim)
        setIsModalOpen(false)
        // Note: router.refresh() in the modal will handle server data invalidation
    }

    return (
        <>
            <button
                onClick={() => setIsModalOpen(true)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                title="Edit Claim"
            >
                <Pencil className="w-5 h-5" />
            </button>

            {isModalOpen && (
                <EditWarrantyModal
                    claim={currentClaim}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSave}
                />
            )}
        </>
    )
}
