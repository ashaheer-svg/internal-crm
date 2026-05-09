'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import BackButton from '@/components/BackButton'
import FormattedNumberInput from '@/components/FormattedNumberInput'
import CustomerSelector from '@/components/selectors/CustomerSelector'
import SalesRepSelector from '@/components/selectors/SalesRepSelector'
import { Plus, Briefcase, Calendar, DollarSign, Tag, AlignLeft, CheckCircle2 } from 'lucide-react'
import CustomerFormModal from '@/app/dashboard/settings/customers/CustomerFormModal'

interface ProjectCustomer {
    id: string
    name: string
    isPartner?: boolean
    salesRepId?: string | null // To auto-select
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
    const [customers, setCustomers] = useState<ProjectCustomer[]>([])
    const [partners, setPartners] = useState<ProjectCustomer[]>([])
    const [salesReps, setSalesReps] = useState<SalesRep[]>([])
    const [pipelines, setPipelines] = useState<Pipeline[]>([])
    const [showCustomerModal, setShowCustomerModal] = useState(false)
    const [showPartnerModal, setShowPartnerModal] = useState(false)

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

    const [selectedClient, setSelectedClient] = useState<any>(null)
    const [selectedPartner, setSelectedPartner] = useState<any>(null)

    useEffect(() => {
        // Fetch Sequences & Pipelines
        Promise.all([
            fetch('/api/crm/pipeline').then(res => res.ok ? res.json() : null),
            fetch('/api/sequences', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'PROJ', consume: false })
            }).then(res => res.ok ? res.json() : null)
        ]).then(([pipelineData, sequenceData]) => {
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

        // Auto-fill Sales Rep if the logged-in user is a sales role
        fetch('/api/auth/me')
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if (data?.user) {
                    const role = data.user.role
                    const repId = data.user.salesRepId
                    if (repId && (role === 'SALES' || role === 'SALES-MGR')) {
                        setFormData(prev => ({
                            ...prev,
                            salesRepId: prev.salesRepId || repId
                        }))
                    }
                }
            })
            .catch(err => console.error('Failed to fetch current user:', err))
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
                const errorData = await res.json().catch(() => ({}))
                alert(`Failed to create project: ${errorData.error || 'Unknown server error'}`)
            }
        } catch (error) {
            console.error(error)
            alert('Error creating project')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] pb-12">
            {/* Header */}
            <div className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-30 px-8 py-5">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <BackButton className="p-2 hover:bg-gray-100 rounded-full transition-colors" label="" />
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Create Sales Project</h1>
                            <p className="text-sm text-gray-500 font-medium">Capture a new business opportunity</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowCustomerModal(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all active:scale-95 shadow-sm"
                        >
                            <Plus className="w-3.5 h-3.5 text-blue-600" />
                            Add Client
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowPartnerModal(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all active:scale-95 shadow-sm"
                        >
                            <Plus className="w-3.5 h-3.5 text-orange-600" />
                            Add Partner
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/20 text-sm font-bold hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {loading ? (
                                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <CheckCircle2 className="w-4 h-4" />
                            )}
                            {loading ? 'Creating...' : 'Create Project'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto mt-8 px-4">
                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Basic Info Section */}
                    <section className="bg-white p-8 rounded-2xl border border-gray-100 shadow-xl shadow-blue-500/5 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-75">
                        <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
                            <div className="p-2 bg-blue-50 rounded-lg">
                                <Briefcase className="w-5 h-5 text-blue-600" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Core Information</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-bold text-gray-700 mb-1.5 flex items-center gap-2">
                                    Project Title <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    className="w-full rounded-xl border-gray-200 px-4 py-3 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none border shadow-sm font-medium"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="e.g. Acme Corp Infrastructure Refresh"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">Project Code</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full rounded-xl border-gray-200 px-4 py-3 text-sm bg-gray-50/50 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none border font-mono font-bold"
                                    value={formData.projectCode}
                                    onChange={e => setFormData({ ...formData, projectCode: e.target.value })}
                                    placeholder="PROJ-XXXX"
                                />
                                <p className="text-[10px] text-blue-600 mt-1.5 font-bold uppercase tracking-wider flex items-center gap-1">
                                    <span className="w-1 h-1 bg-blue-600 rounded-full animate-pulse"></span>
                                    Autogenerated Sequence
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">Primary Brand</label>
                                <div className="relative group">
                                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                    <input
                                        type="text"
                                        className="w-full rounded-xl border-gray-200 pl-10 pr-4 py-3 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none border shadow-sm font-medium"
                                        value={formData.brand}
                                        onChange={e => setFormData({ ...formData, brand: e.target.value })}
                                        placeholder="Cisco, HP, Dell etc."
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Stakeholders Section */}
                    <section className="bg-white p-8 rounded-2xl border border-gray-100 shadow-xl shadow-blue-500/5 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
                        <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
                            <div className="p-2 bg-orange-50 rounded-lg">
                                <AlignLeft className="w-5 h-5 text-orange-600" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Stakeholders</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <CustomerSelector
                                    label="End Client"
                                    required
                                    type="CUSTOMER"
                                    selectedCustomer={selectedClient}
                                    onSelect={(c) => {
                                        setSelectedClient(c)
                                        setFormData(prev => ({ 
                                            ...prev, 
                                            customerId: c?.id || '',
                                            salesRepId: c?.salesRepId || prev.salesRepId
                                        }))
                                    }}
                                    placeholder="Search for an end customer..."
                                />
                            </div>

                            <div>
                                <CustomerSelector
                                    label="Partner (Optional)"
                                    type="PARTNER"
                                    selectedCustomer={selectedPartner}
                                    onSelect={(p) => {
                                        setSelectedPartner(p)
                                        setFormData(prev => ({
                                            ...prev,
                                            partnerId: p?.id || '',
                                            salesRepId: p?.salesRepId || prev.salesRepId
                                        }))
                                    }}
                                    placeholder="Search for a partner/reseller..."
                                />
                                <p className="text-[10px] text-gray-400 mt-1.5 italic font-medium">Leave empty for direct deals</p>
                            </div>

                            <div className="md:col-span-2 border-t border-gray-50 pt-6">
                                <SalesRepSelector
                                    label="Assigned Sales Representative"
                                    selectedId={formData.salesRepId}
                                    onSelect={(rep) => setFormData(prev => ({ ...prev, salesRepId: rep?.id || '' }))}
                                />
                            </div>
                        </div>
                    </section>

                    {/* Financials Section */}
                    <section className="bg-white p-8 rounded-2xl border border-gray-100 shadow-xl shadow-blue-500/5 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
                        <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
                            <div className="p-2 bg-green-50 rounded-lg">
                                <DollarSign className="w-5 h-5 text-green-600" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Commercial Details</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">Expected Value</label>
                                <div className="relative group">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">
                                        {formData.currency}
                                    </div>
                                    <FormattedNumberInput
                                        value={Number(formData.expectedValue) || 0}
                                        onChange={val => setFormData({ ...formData, expectedValue: val.toString() })}
                                        className="w-full rounded-xl border-gray-200 pl-12 pr-4 py-3 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none border shadow-sm font-bold text-blue-600"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">Currency</label>
                                <select
                                    className="w-full rounded-xl border-gray-200 px-4 py-3 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none border shadow-sm font-bold bg-white"
                                    value={formData.currency}
                                    onChange={e => setFormData({ ...formData, currency: e.target.value })}
                                >
                                    <option value="Rs.">Rs. (LKR)</option>
                                    <option value="USD">USD ($)</option>
                                    <option value="EUR">EUR (€)</option>
                                </select>
                            </div>

                            <div className="md:col-span-3">
                                <label className="block text-sm font-bold text-gray-700 mb-1.5 flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-gray-400" />
                                    Expected Closing Timeframe
                                </label>
                                <input
                                    type="month"
                                    className="w-full rounded-xl border-gray-200 px-4 py-3 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none border shadow-sm font-medium"
                                    value={formData.expectedCloseDate ? formData.expectedCloseDate.substring(0, 7) : ''}
                                    onChange={e => setFormData({ ...formData, expectedCloseDate: e.target.value ? `${e.target.value}-01` : '' })}
                                />
                            </div>
                        </div>
                    </section>

                    {/* Additional Details */}
                    <section className="bg-white p-8 rounded-2xl border border-gray-100 shadow-xl shadow-blue-500/5 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-500">
                        <label className="text-lg font-bold text-gray-900 flex items-center gap-3">
                            <AlignLeft className="w-5 h-5 text-gray-400" />
                            Brief Description / Project Scope
                        </label>
                        <textarea
                            className="w-full rounded-xl border-gray-200 bg-gray-50/30 p-4 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none border font-medium"
                            rows={4}
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Briefly describe the hardware components, services required, and any specific client needs..."
                        />
                    </section>
                </form>
            </div>

            {showCustomerModal && (
                <CustomerFormModal
                    onClose={() => setShowCustomerModal(false)}
                    defaultRole="CUSTOMER"
                    onSave={(data) => {
                        const client = data.customer || data
                        setSelectedClient(client)
                        setFormData(prev => ({ 
                            ...prev, 
                            customerId: client.id,
                            salesRepId: client.salesRepId || prev.salesRepId 
                        }))
                        setShowCustomerModal(false)
                    }}
                />
            )}

            {showPartnerModal && (
                <CustomerFormModal
                    onClose={() => setShowPartnerModal(false)}
                    defaultRole="PARTNER"
                    onSave={(data) => {
                        const partner = data.customer || data
                        setSelectedPartner(partner)
                        setFormData(prev => ({ ...prev, partnerId: partner.id }))
                        setShowPartnerModal(false)
                    }}
                />
            )}
        </div>
    )
}
