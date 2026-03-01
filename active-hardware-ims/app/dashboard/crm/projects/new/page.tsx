'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import BackButton from '@/components/BackButton'
import FormattedNumberInput from '@/components/FormattedNumberInput'

interface Customer {
    id: string
    name: string
    isPartner: boolean
    salesRepId?: string // To auto-select
}

interface SalesRep {
    id: string
    name: string
}

interface Pipeline {
    id: string
    name: string
}

export default function NewProjectPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [customers, setCustomers] = useState<Customer[]>([])
    const [partners, setPartners] = useState<Customer[]>([])
    const [salesReps, setSalesReps] = useState<SalesRep[]>([])
    const [pipelines, setPipelines] = useState<Pipeline[]>([])

    const [formData, setFormData] = useState({
        projectCode: '',
        title: '',
        customerId: '',
        partnerId: '',
        salesRepId: '',
        pipelineId: '',
        expectedValue: '',
        currency: 'Rs.',
        expectedCloseDate: '',
        brand: '',
        description: ''
    })

    useEffect(() => {
        // Fetch Customers, Sales Reps, Pipelines AND Sequence
        Promise.all([
            fetch('/api/customers?limit=100').then(res => {
                if (!res.ok) throw new Error('Failed to fetch customers')
                return res.json()
            }),
            fetch('/api/sales-reps').then(res => {
                if (!res.ok) {
                    return []
                }
                return res.json()
            }).catch(() => []),
            fetch('/api/crm/pipeline').then(res => {
                if (!res.ok) throw new Error('Failed to fetch pipeline')
                return res.json()
            }),
            fetch('/api/sequences', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'PROJ', consume: false })
            }).then(res => res.json())
        ]).then(([customersData, salesRepsData, pipelineData, sequenceData]) => {
            let allCustomers: Customer[] = []
            if (customersData && customersData.customers) {
                allCustomers = customersData.customers
            } else if (Array.isArray(customersData)) {
                allCustomers = customersData
            }
            setCustomers(allCustomers)
            setPartners(allCustomers.filter(c => c.isPartner))

            if (Array.isArray(salesRepsData)) {
                setSalesReps(salesRepsData)
            }

            if (pipelineData && pipelineData.id) {
                setPipelines([pipelineData])
                setFormData(prev => ({ ...prev, pipelineId: pipelineData.id }))
            }

            if (sequenceData && sequenceData.number) {
                setFormData(prev => ({ ...prev, projectCode: sequenceData.number }))
            }
        }).catch(err => {
            console.error(err)
        })
    }, [])

    const handlePartnerChange = (partnerId: string) => {
        const partner = partners.find(p => p.id === partnerId)
        setFormData(prev => ({
            ...prev,
            partnerId,
            salesRepId: partner?.salesRepId || prev.salesRepId
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const res = await fetch('/api/crm/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            if (res.ok) {
                const project = await res.json()
                router.push(`/dashboard/crm/projects/${project.id}`)
            } else {
                alert('Failed to create project')
            }
        } catch (error) {
            console.error(error)
            alert('Error creating project')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-2xl mx-auto py-8 px-4">
            <div className="mb-4">
                <BackButton />
            </div>
            <h1 className="text-2xl font-bold mb-6">Create New Sales Project</h1>

            <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Project Code (Auto-generated)</label>
                    <input
                        type="text"
                        required
                        className="mt-1 block w-full rounded-md border border-gray-300 p-2 bg-gray-50"
                        value={formData.projectCode}
                        onChange={e => setFormData({ ...formData, projectCode: e.target.value })}
                        placeholder="PROJ-XXXX-XXXX"
                    />
                    <p className="text-xs text-gray-500 mt-1">You can edit this code if needed.</p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Project Title</label>
                    <input
                        type="text"
                        required
                        className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                        value={formData.title}
                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                        placeholder="e.g. Acme Corp Network Upgrade"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Brand</label>
                    <input
                        type="text"
                        className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                        value={formData.brand}
                        onChange={e => setFormData({ ...formData, brand: e.target.value })}
                        placeholder="e.g. Cisco, HP, Dell"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Customer (End Client)</label>
                    <select
                        required
                        className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                        value={formData.customerId}
                        onChange={e => setFormData({ ...formData, customerId: e.target.value })}
                    >
                        <option value="">Select a Customer</option>
                        {customers.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Partner (Reseller)</label>
                        <select
                            className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                            value={formData.partnerId}
                            onChange={e => handlePartnerChange(e.target.value)}
                        >
                            <option value="">None (Direct)</option>
                            {partners.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Sales Representative</label>
                        <select
                            className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                            value={formData.salesRepId}
                            onChange={e => setFormData({ ...formData, salesRepId: e.target.value })}
                        >
                            <option value="">Select Rep</option>
                            {salesReps.map(rep => (
                                <option key={rep.id} value={rep.id}>{rep.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Expected Value</label>
                        <FormattedNumberInput
                            value={Number(formData.expectedValue) || 0}
                            onChange={val => setFormData({ ...formData, expectedValue: val.toString() })}
                            className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Currency</label>
                        <select
                            className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                            value={formData.currency}
                            onChange={e => setFormData({ ...formData, currency: e.target.value })}
                        >
                            <option value="Rs.">Rs.</option>
                            <option value="USD">USD</option>
                            <option value="EUR">EUR</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Expected Closing Timeframe</label>
                    <input
                        type="month"
                        className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                        value={formData.expectedCloseDate ? formData.expectedCloseDate.substring(0, 7) : ''}
                        onChange={e => setFormData({ ...formData, expectedCloseDate: e.target.value ? `${e.target.value}-01` : '' })}
                    />
                    <p className="text-xs text-gray-500 mt-1">When do you expect to close this deal?</p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                        className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                        rows={3}
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                    />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="inline-flex items-center px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
                    >
                        {loading ? 'Creating...' : 'Create Project'}
                    </button>
                </div>
            </form>
        </div>
    )
}
