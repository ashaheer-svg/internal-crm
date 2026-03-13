"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import DocumentHeader from "@/components/DocumentHeader"
import DocumentFooter from "@/components/DocumentFooter"
import BackButton from "@/components/BackButton"
import '@/styles/print.css'

export default function PrintContractPage() {
    const params = useParams()
    const id = params.id as string
    const [contract, setContract] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchContract = async () => {
            try {
                const res = await fetch(`/api/services/contracts/${id}`)
                if (!res.ok) throw new Error("Failed to fetch contract")
                const data = await res.json()
                setContract(data)
            } catch (error) {
                console.error(error)
            } finally {
                setLoading(false)
            }
        }
        fetchContract()
    }, [id])

    useEffect(() => {
        if (!loading && contract) window.print()
    }, [loading, contract])

    if (loading) return <div className="p-8 text-center">Loading contract details...</div>
    if (!contract) return <div className="p-8 text-center text-red-600">Contract not found</div>

    return (
        <>
            <div className="print-actions">
                <BackButton className="print-btn print-btn-secondary" />
                <button onClick={() => window.close()} className="print-btn print-btn-secondary">
                    Close
                </button>
                <button onClick={() => window.print()} className="print-btn print-btn-primary">
                    Print Contract
                </button>
            </div>
            <div className="print-container" style={{ maxWidth: '56rem' }}>
            {/* Header */}
            <DocumentHeader title="Service Contract" />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '2rem', marginTop: '-1.5rem' }}>
                <p style={{ fontSize: '0.875rem', color: 'var(--print-text-muted)', fontWeight: 500 }}>
                    #{contract.contractNumber || 'DRAFT'}
                </p>
            </div>

            {/* Client & Contract Info */}
            <div className="print-info-grid" style={{ gap: '3rem' }}>
                <div>
                    <h3 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--print-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                        Client Details
                    </h3>
                    <p style={{ fontWeight: 700, fontSize: '1.125rem' }}>{contract.customer.name}</p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--print-text-muted)', whiteSpace: 'pre-line' }}>{contract.customer.address || 'No address on file'}</p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--print-text-muted)', marginTop: '0.25rem' }}>{contract.customer.email}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <h3 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--print-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                        Agreement Terms
                    </h3>
                    <div style={{ fontSize: '0.875rem', lineHeight: 1.8 }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                            <span style={{ color: 'var(--print-text-muted)' }}>Period:</span>
                            <span style={{ fontWeight: 500 }}>
                                {new Date(contract.startDate).toLocaleDateString()} - {contract.endDate ? new Date(contract.endDate).toLocaleDateString() : 'Indefinite'}
                            </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                            <span style={{ color: 'var(--print-text-muted)' }}>Status:</span>
                            <span style={{ fontWeight: 500, textTransform: 'uppercase' }}>{contract.status}</span>
                        </div>
                        {contract.partner && (
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                <span style={{ color: 'var(--print-text-muted)' }}>Partner:</span>
                                <span style={{ fontWeight: 500 }}>{contract.partner.name}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Service Details */}
            <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 700, borderBottom: '1px solid var(--print-border)', paddingBottom: '0.25rem', marginBottom: '0.75rem', textTransform: 'uppercase' }}>
                    Service Description
                </h3>
                <div className="print-info-section">
                    <h4 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.25rem' }}>{contract.product.name}</h4>
                    <p style={{ fontSize: '0.875rem', color: 'var(--print-text-muted)', whiteSpace: 'pre-wrap' }}>
                        {contract.description || contract.product.description || 'No description provided.'}
                    </p>
                </div>
            </div>

            {/* Rental Assets */}
            {contract.rentalAssets && contract.rentalAssets.length > 0 && (
                <div style={{ marginBottom: '2rem' }}>
                    <h3 style={{ fontSize: '0.875rem', fontWeight: 700, borderBottom: '1px solid var(--print-border)', paddingBottom: '0.25rem', marginBottom: '0.75rem', textTransform: 'uppercase' }}>
                        Allocated Rental Assets
                    </h3>
                    <table className="print-table">
                        <thead>
                            <tr>
                                <th>Asset Name</th>
                                <th>Serial Number</th>
                                <th>Notes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {contract.rentalAssets.map((asset: any) => (
                                <tr key={asset.id}>
                                    <td style={{ fontWeight: 500 }}>{asset.name}</td>
                                    <td style={{ fontFamily: 'monospace', color: 'var(--print-text-muted)' }}>{asset.serialNumber}</td>
                                    <td style={{ color: 'var(--print-text-muted)' }}>{asset.notes || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Financials */}
            <div style={{ marginBottom: '3rem', borderTop: '2px solid var(--print-text-base)', paddingTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{ width: '16rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                            <span style={{ fontWeight: 700, fontSize: '1.125rem' }}>Contract Value</span>
                            <span style={{ fontWeight: 700, fontSize: '1.125rem' }}>Rs. {contract.contractValue?.toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', fontSize: '0.75rem', color: 'var(--print-text-muted)' }}>
                            <span>Billing Cycle</span>
                            <span>{contract.billingCycle}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Signatures */}
            <div className="print-signatures" style={{ marginTop: '4rem' }}>
                <div className="print-signature-box" style={{ textAlign: 'left' }}>
                    <p style={{ fontWeight: 700, fontSize: '0.875rem' }}>Authorized Signature</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--print-text-muted)' }}>Active Solutions</p>
                </div>
                <div className="print-signature-box" style={{ textAlign: 'left' }}>
                    <p style={{ fontWeight: 700, fontSize: '0.875rem' }}>Client Signature</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--print-text-muted)' }}>{contract.customer.name}</p>
                </div>
            </div>

            {/* Footer */}
            <div className="print-footer text-center mt-8 text-[10px] text-gray-400">
                <p>This document is computer generated and valid without a seal.</p>
            </div>
            <DocumentFooter />
        </div>
        </>
    )
}
