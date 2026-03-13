"use client"

import { useEffect, useState, use } from "react"
import DocumentHeader from "@/components/DocumentHeader"
import DocumentFooter from "@/components/DocumentFooter"
import BackButton from "@/components/BackButton"
import '@/styles/print.css'
import { format } from "date-fns"

interface Contract {
    id: string
    contractNumber: string
    startDate: string
    endDate: string | null
    status: string
    contractValue: number
    billingCycle: string
    description: string | null
    coveredSerials: string | null
    productModel: string | null
    customer: {
        name: string
        address: string | null
        email: string | null
        contactName: string | null
    }
    product: {
        name: string
        description: string | null
    }
}

export default function AMCAgreementPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const [contract, setContract] = useState<Contract | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch(`/api/services/contracts/${id}`)
            .then(res => res.ok ? res.json() : null)
            .then(data => setContract(data))
            .finally(() => setLoading(false))
    }, [id])

    if (loading) return <div className="p-8 text-center text-gray-500">Loading agreement details...</div>
    if (!contract) return <div className="p-8 text-center text-red-600">Contract not found</div>

    return (
        <>
            {/* Print actions */}
            <div className="print-actions">
                <BackButton className="print-btn print-btn-secondary" />
                <button onClick={() => window.close()} className="print-btn print-btn-secondary">
                    Close
                </button>
                <button onClick={() => window.print()} className="print-btn print-btn-primary">
                    Print Agreement
                </button>
            </div>

            <div className="print-container legal-document" style={{ maxWidth: '210mm', padding: '20mm 15mm' }}>
                <DocumentHeader title="Annual Maintenance Contract" />

                <div className="text-right py-4 border-b border-gray-200 mb-8">
                    <p className="font-bold text-lg">Agreement #: {contract.contractNumber || 'DRAFT'}</p>
                    <p className="text-gray-500">Date: {format(new Date(), 'dd MMMM yyyy')}</p>
                </div>

                <div className="space-y-8 text-justify leading-relaxed text-sm">
                    {/* Parties Section */}
                    <section>
                        <h2 className="font-bold text-base uppercase border-b-2 border-black pb-1 mb-3">1. THE PARTIES</h2>
                        <p>
                            This <strong>Annual Maintenance Contract ("Agreement")</strong> is entered into on this
                            <strong> {format(new Date(contract.startDate), 'do')} day of {format(new Date(contract.startDate), 'MMMM, yyyy')}</strong>,
                            between <strong>Active Solutions</strong> (hereinafter referred to as the "Service Provider")
                            and <strong>{contract.customer.name}</strong>, located at <strong>{contract.customer.address || '[Address Not Provided]'}</strong>
                            (hereinafter referred to as the "Client").
                        </p>
                    </section>

                    {/* Scope Section */}
                    <section>
                        <h2 className="font-bold text-base uppercase border-b-2 border-black pb-1 mb-3">2. SCOPE OF SERVICES</h2>
                        <p>
                            The Service Provider agrees to maintain and service the equipment listed below
                            ("Equipment") in good working order during the term of this Agreement:
                        </p>
                        <div className="mt-4 bg-gray-50 p-4 border border-gray-200 rounded">
                            <p><strong>Service Plan:</strong> {contract.product.name}</p>
                            {contract.productModel && <p><strong>Model:</strong> {contract.productModel}</p>}
                            <p className="mt-2"><strong>Equipment Description/Serials:</strong></p>
                            <p className="whitespace-pre-wrap font-mono text-xs text-gray-700 bg-white p-2 border border-gray-100 rounded mt-1">
                                {contract.coveredSerials || 'None specified'}
                            </p>
                        </div>
                    </section>

                    {/* Duration Section */}
                    <section>
                        <h2 className="font-bold text-base uppercase border-b-2 border-black pb-1 mb-3">3. DURATION</h2>
                        <p>
                            This Agreement shall be effective from <strong>{format(new Date(contract.startDate), 'dd MMM yyyy')}</strong>
                            to <strong>{contract.endDate ? format(new Date(contract.endDate), 'dd MMM yyyy') : 'Indefinite'}</strong>.
                        </p>
                    </section>

                    {/* Terms Section */}
                    <section>
                        <h2 className="font-bold text-base uppercase border-b-2 border-black pb-1 mb-3">4. TERMS AND CONDITIONS</h2>
                        <ul className="list-decimal ml-5 space-y-2">
                            <li>The Service Provider will provide quarterly preventive maintenance visits and unlimited breakdown calls during business hours.</li>
                            <li>Critical parts replacement is subject to availability and may incur additional charges unless specified in the service plan.</li>
                            <li>The Client shall provide a suitable environment and power supply for the Equipment as per manufacturer standards.</li>
                            <li>The Service Provider is not responsible for data loss or damage caused by natural disasters, power surges, or unauthorized tampering.</li>
                            <li>Payment shall be made as per the agreed cycle: <strong>{contract.billingCycle}</strong> in the amount of <strong>Rs. {contract.contractValue.toLocaleString()}</strong>.</li>
                        </ul>
                    </section>

                    {/* Signature Section */}
                    <div className="pt-16 grid grid-cols-2 gap-12">
                        <div className="border-t border-black pt-4">
                            <p className="font-bold uppercase mb-8">For Active Solutions</p>
                            <div className="h-20"></div>
                            <p className="text-xs text-gray-500">Authorized Signatory & Stamp</p>
                        </div>
                        <div className="border-t border-black pt-4">
                            <p className="font-bold uppercase mb-8">For {contract.customer.name}</p>
                            <div className="h-20"></div>
                            <p className="text-xs text-gray-500">Authorized Signatory & Stamp</p>
                        </div>
                    </div>
                </div>

                <DocumentFooter />
            </div>

            <style jsx global>{`
                .legal-document {
                    color: #000;
                    font-family: 'Times New Roman', serif;
                }
                .legal-document h2 {
                    letter-spacing: 0.05em;
                }
                @media print {
                    .legal-document {
                        padding: 0 !important;
                    }
                }
            `}</style>
        </>
    )
}
